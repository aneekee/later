## Requirements (agreed)

### Scope

- The feed lists only **unresolved** notes, across all of the user's chats.
- Resolved notes drop out of the feed. A note that gets unresolved comes back with its old `seen_at`.
- On FE the feed is a separate feature (`features/feed`) with its own page. On BE it is a separate module (`apps/api/src/feed`, `FeedModule`).

### Seen tracking

- `messages.seen_at timestamptz NULL`.
- Existing notes and newly created notes start with `null`.
- Moving a note to another chat does not change `seen_at`.
- Each feed fetch returns the next page and sets `seen_at = now()` on the returned notes, in the same transaction.
- A page counts as seen as soon as it is fetched, even if it is never scrolled into view.
- There are no offsets or cursors: each request takes the next N stalest notes.

### Order

- `seen_at ASC NULLS FIRST, created_at ASC, id ASC`.
  - Never-seen notes come first.
  - Then the notes that have gone unseen the longest.
  - Ties go to the oldest note first.
- The order is defined in exactly one place, `buildFeedOrder()` in `feed.utils.ts`. Future ranking rules go there. There is no strategy abstraction until a second rule exists.

### Endless scroll

- No divider or other UI marks the wrap-around. New pages are always appended to the end of the list.
- **FE dedupe:** if a note that is already rendered higher up arrives again, the earlier copy is removed and only the latest one is rendered.
  - Scroll stability relies on browser scroll anchoring (`overflow-anchor`).
- **Small set:** when `total ≤ pageSize`, the first page already holds everything. The FE stops loading and shows a quiet "That's all for now" footer.
  - Otherwise scrolling is endless, with dedupe.
- Page size is **10**.
- The next page loads only when the bottom sentinel is actually visible (IntersectionObserver, no `rootMargin` prefetch).
- At most one request is in flight at a time.

### API

- `GET v1/feed?pageSize=10` returns `{ data: { items: FeedItemEntity[], total } }`.
  - `FeedItemEntity` is the note (id, content, `createdAt`) plus `chatId` and `chatTitle`.
  - `total` is the user's unresolved count.
- Results are always scoped to the authenticated user's chats.
- `pageSize` must be an integer from 1 to 50. Anything else returns 400.

### FE data layer

- An RTK `infiniteQuery`. The page param is an incrementing counter, used only to give each page its own cache entry.
- Caching and refetch:
  - `keepUnusedDataFor: 0`;
  - no refetch when the window regains focus or the connection comes back;
  - never call `refetch()`, because re-fetching all pages would stamp more notes.
- Reopening the page starts a fresh list.

### Layout

- Twitter-like:
  - a scroll container fills `<main>`;
  - inside it, a centered column `max-w-[600px]`;
  - desktop: `md:border-x`; mobile: full width with no side borders;
  - a sticky "Feed" header at the top.
- Notes are flat rows separated by `border-b`, not floating cards.

### Feed card

- **Header:** chat title · relative time ("3d"), with the full date in a tooltip.
  - The chat title links to `/inbox?chatId=<id>`.
- **Body:** the full note content, never truncated. Line breaks are kept with `whitespace-pre-wrap wrap-anywhere`, the same as inbox `TextMessage`.
- **Footer:** an empty slot for future controls.

### States

- First load: 3 skeleton cards.
- Loading the next page: a spinner row at the bottom.
- Empty (0 unresolved notes): "Nothing to revisit. Your inbox is clear", with a link to `/inbox`.
- First-load error: an error block with a Retry button.
- Next-page error: an inline "Couldn't load more" with a Retry button. The cards already loaded stay.
- Small set: a "That's all for now" footer.

### Navigation

- Route: `/feed`, lazy-loaded like the other pages.
- Sidebar: a "Feed" item with `NewspaperIcon`, as the 3rd item after Inbox.

## Implementation plan

1. **Prisma**
   - In `apps/api/prisma/schema.prisma`, add to `Message`:
     - `seenAt DateTime? @map("seen_at") @db.Timestamptz(3)`;
     - `@@index([seenAt, createdAt])`.
   - Run `prisma migrate dev --name add-message-seen-at` and regenerate the client.
2. **`packages/types/src/feed.ts`**
   - Add `FeedItemEntity` (`id`, `content`, `createdAt`, `chatId`, `chatTitle`), `GetFeedQueryParams { pageSize }` and `GetFeedSuccessResponse` (`{ items, total }`).
   - Export them from `index.ts`.
3. **`apps/api/src/feed/`**
   - `feed.dto.ts`: `GetFeedDto implements GetFeedQueryParams`, with `pageSize` as `@Type(() => Number) @IsInt() @Min(1) @Max(50)` plus `@ApiProperty`.
   - `feed.types.ts`: `GetFeedServiceDto` (`userId`, `pageSize`).
   - `feed.utils.ts`:
     - `buildFeedOrder()` returns `[{ seenAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }, { id: 'asc' }]`;
     - `buildFeedWhere(userId)` returns `{ chat: { userId }, messageResolution: null }`;
     - `mapToFeedItem`.
   - `feed.service.ts`, method `getNextPage(dto)`. One interactive `$transaction` that:
     - runs `message.findMany` with `buildFeedWhere`, `buildFeedOrder` and `take: pageSize`, including `textMessage` and `chat { title }`;
     - runs `message.updateMany({ where: { id: { in: ids } }, data: { seenAt: new Date() } })`;
     - runs `message.count` with `buildFeedWhere`;
     - returns `{ items, total }`.
   - `feed.controller.ts`: `@Controller('v1/feed')`, `@Get()`. It reads the user id from `req['user']?.id`, the same way the messages controller does.
   - `feed.module.ts`: imports the Prisma module. Register `FeedModule` in `app.module.ts`.
4. **Web data layer (`features/feed/`)**
   - `api/feed.api.ts`:
     - a `feedApi` with `createApi`, `baseQueryWithCookies` and `keepUnusedDataFor: 0`;
     - a `feed` `infiniteQuery<GetFeedSuccessResponse, { pageSize }, number>` with `initialPageParam: 1`;
     - `getNextPageParam` returns `undefined` when `lastPage.data.total <= pageSize`, and `lastPageParam + 1` otherwise;
     - the query is `v1/feed?pageSize=`;
     - refetch on focus and reconnect disabled.
   - Register its reducer and middleware in `store.ts`.
   - `utils/feed.utils.ts`: `dedupeKeepLast(pages)` flattens the pages and keeps only the last occurrence of each note id, preserving the order of those last occurrences.
5. **Web components (`features/feed/components/`)**
   - `FeedContainer`:
     - is the scroll container (`h-full overflow-y-auto`, with `overflow-anchor` left at its default `auto`);
     - holds the centered column and the sticky header;
     - renders the deduped list and every state.
   - `FeedItem`: the header with the chat link and relative time (with tooltip), the content body and an empty controls footer.
   - Status and paging components:
     - `FeedSkeleton` (3 rows);
     - `FeedEmpty`;
     - `FeedError` (with Retry);
     - `FeedLoadMoreError` (with Retry);
     - `FeedEnd` ("That's all for now");
     - `FeedSentinel`: an IntersectionObserver that calls `fetchNextPage` when visible, if `hasNextPage` is true and nothing is fetching.
   - `pages/Feed.page.tsx`.
   - Add the lazy `/feed` route in `App.tsx`. Add `{ to: '/feed', label: 'Feed', icon: NewspaperIcon }` as the 3rd entry of `navItems` in `AppSidebar.tsx`.
6. **Check during implementation**
   - Does `/inbox?chatId=` open a chat that isn't on the inbox's first page of chats (`ChatListContainer.tsx:87`)? If not, note it as a follow-up.
   - Is there an existing relative-time or date formatter to reuse? If not, add a small `Intl.RelativeTimeFormat`-based util in `features/feed/utils`.
7. **Verify** (manual only, no new automated tests)
   - Run `tsc` and lint for `api`, `web` and `types`.
   - curl the API:
     - the order (nulls first, then `seen_at` ASC, then `created_at` ASC);
     - `seen_at` is stamped on returned notes;
     - resolved notes and other users' notes are excluded;
     - the 400 for a bad `pageSize`;
     - `total`.
   - In the browser, at desktop and mobile widths:
     - endless scroll and looping, with dedupe moving repeated notes to the bottom without a scroll jump;
     - the small-set footer;
     - the empty state;
     - the first-load and next-page errors with Retry;
     - the chat link;
     - reopening the page continues from the stalest notes.
