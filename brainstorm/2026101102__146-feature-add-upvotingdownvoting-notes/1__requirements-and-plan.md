## Requirements (agreed)

### Scope

- Notes can be rated **only in the feed**: there are +1/−1 buttons and the current rating on every feed card.
- The inbox is untouched. It has no controls and no rating badge.
- Rating affects the feed order and nothing else.

### Rating value

- Each note has one integer rating. The default is `0`.
- The rating is clamped to **0..10000**.
  - Ratings can't go below 0, so downvoting only takes back upvotes and can never push a note behind neutral.
  - −1 is disabled at 0 and +1 is disabled at 10000.
- Rating is **sticky**:
  - it survives resolve, unresolve and moving a note between chats (the same as `seen_at`);
  - a resolved note can still be rated, so a race with another tab never fails.
- Rating a note does not touch `seen_at`.

### Feed order

- Rating shifts staleness. Each point acts as if the note had been seen **1 hour** earlier. Ratings are never negative, so a note can only move earlier. At most that's 10000h, about 416 days:

  ```sql
  ORDER BY
    (seen_at - rating * interval '1 hour') ASC NULLS FIRST,
    rating DESC,
    created_at ASC,
    id ASC
  ```

- Never-seen notes still come first. This doesn't conflict with rating, because a note can only be rated in the feed, which means it has already been seen.
- The feed keeps looping. Higher-rated notes come back more often. Notes rated 0 keep the plain staleness order.
- The order is still defined in exactly one place, in `feed.utils.ts`.
- A rating change does **not** reorder the cards already loaded. Only the number on the card changes. The new rating affects later pages.

### API

- `PUT v1/messages/:messageId/rating` with body `{ rating }`. The value is **absolute**, not a delta.
  - Returns `200 { data: { id, rating } }`.
  - Returns `400` if `rating` is not an integer or is outside 0..10000. The server never clamps silently, so the FE clamps before sending.
  - Returns `403` through the existing `checkMessageAccess` when the note doesn't exist or isn't the user's, the same as resolve, move and delete.
  - Last write wins. This was accepted when choosing absolute over delta.
- `GET v1/feed`: `FeedItemEntity` gains `rating: number`.

### Interaction

- **Tap:** ±1.
- **Hold (accelerating repeat):**
  - nothing extra for the first 400ms;
  - from 400ms, +1 every 150ms;
  - after about 1.9s, +1 every 50ms.
  - The repeat stops on pointer up, leave or cancel.
  - It works with mouse, touch and pen through pointer events.
  - There's no long-press context menu and no text selection on touch.
- **Keyboard:** Enter or Space each give ±1. Enter's native key repeat works as a hold.
- **Optimistic:** the number updates on every step.
- **Batching:**
  - One `PUT` with the final absolute value is sent **600ms after the last change**. Several quick taps and a whole hold collapse into one request.
  - While a request is in flight, the next one waits and then sends the latest value. Requests never overlap, so last-write-wins stays correct.
  - If nothing changed since the last value the server confirmed, nothing is sent.
  - A pending change is flushed right away on unmount (navigating away, or a dedupe moving the card).
- **Error:** the card reverts to the last value the server confirmed and shows the existing error toast (`useDisplayErrorToast`). There's no automatic retry.

### UI

- The controls sit in the bottom-left of the card's `CardFooter` (the slot reserved by the feed feature), as a compact Reddit-style group:

  ```
  [⇧] 12 [⇩]
  ```

  - The buttons are ghost icon buttons (`ArrowBigUpIcon` / `ArrowBigDownIcon`).
  - The number uses `tabular-nums`. It is muted at 0 and green-ish when positive.
  - Each button has an `aria-label` ("Upvote" / "Downvote") and a `title` hint saying you can hold it to repeat.

## Implementation plan

1. **Prisma**
   - In `apps/api/prisma/schema.prisma`, add `rating Int @default(0)` to `Message`.
   - Run `prisma migrate dev --name add-message-rating` and regenerate the client.
   - No new index. The order is now an expression, so the existing `[seenAt, createdAt]` index doesn't serve it. That is fine at personal-app scale. If it is ever needed, it can become an expression index later.
2. **`packages/types`**
   - `feed.ts`: add `rating: number` to `FeedItemEntity`.
   - `messages.ts`: add `SetMessageRatingBody { rating }`, `MessageRatingEntity { id, rating }` and `SetMessageRatingSuccessResponse`.
   - Rating bounds: put `MESSAGE_RATING_MIN = 0` and `MESSAGE_RATING_MAX = 10000` in `@later/types` if the package can export runtime values. If it can't, mirror them in an API constant and a web constant.
3. **API: messages**
   - `messages.dto.ts`: add `SetMessageRatingDto implements SetMessageRatingBody`, with `rating` as `@IsInt() @Min(MIN) @Max(MAX)` plus `@ApiProperty`.
   - `messages.types.ts`: add `SetMessageRatingServiceDto` (`userId`, `messageId`, `rating`).
   - `messages.service.ts`: add `setMessageRating(dto)`. It runs `checkMessageAccess`, then `message.update({ data: { rating } })`, and returns `{ id, rating }`. No user-action logging.
   - `messages.controller.ts`: add `@Put('/:messageId/rating')`. It reads the user id from `req['user']?.id`, the same way the other handlers do.
4. **API: feed**
   - `feed.constants.ts` (new): `FEED_RATING_STEP_HOURS = 1`.
   - `feed.utils.ts`: replace `buildFeedOrder()` with `buildFeedOrderSql()`, which returns a `Prisma.sql` `ORDER BY` fragment. This is still the single place for ranking rules.
     - It uses `make_interval(hours => m.rating * ${FEED_RATING_STEP_HOURS})`, or `rating * interval '1 hour'`.
   - Add `rating` to `mapToFeedItem`.
   - `feed.service.ts`, inside the existing transaction:
     1. `tx.$queryRaw<{ id: string }[]>` selects the ids for the page:
        - `messages m JOIN chats c ON c.id = m.chat_id`;
        - `WHERE c.user_id = $userId AND NOT EXISTS (SELECT 1 FROM message_resolutions r WHERE r.message_id = m.id)`;
        - `ORDER BY` the fragment from `buildFeedOrderSql()`, `LIMIT $pageSize`.
     2. `findMany({ where: { id: { in: ids } }, select: … rating … })`, then reorder the results to match `ids`.
     3. The existing `updateMany` (stamps `seen_at`) and `count` stay unchanged.
     - `buildFeedWhere` stays for `count`. Keep the raw `WHERE` equivalent to it.
5. **Web: data layer (`features/feed/`)**
   - `api/feed.api.ts`: add a `setMessageRating` mutation, `PUT v1/messages/:id/rating`.
     - In `onQueryStarted`, after success, patch every occurrence of that note in the `feed` infinite-query cache with `updateQueryData`. A card that re-mounts (for example after a dedupe move) then starts from the confirmed value.
     - No tags, and never refetch the feed.
   - `utils/feed.utils.ts`: add `clampRating(n)`.
6. **Web: hooks (`features/feed/hooks/`)**
   - `useHoldRepeat(onStep)` returns pointer and keyboard handlers. It:
     - steps right away on `pointerdown`, then runs the 400 / 150 / 50ms schedule;
     - stops on `pointerup`, `pointerleave` and `pointercancel`, on blur and on unmount;
     - uses `onClick` only for keyboard activation (`event.detail === 0`), so a pointer tap doesn't count twice.
   - `useBatchedRating(item)` returns `{ rating, change(delta) }`:
     - local `rating` state starts from `item.rating`, and a ref holds the last confirmed value;
     - `change` clamps the value and restarts the 600ms debounce;
     - when the debounce fires, it serializes the `PUT`s;
     - on error it reverts and shows a toast;
     - on unmount it flushes the pending value.
7. **Web: UI**
   - `components/FeedRating.tsx`: the footer controls described in [UI](#ui).
   - In `FeedItem.tsx`, replace the `{/* controls go to a CardFooter */}` placeholder with `<CardFooter><FeedRating item={item} /></CardFooter>`.
8. **Verify** (manual only, no new automated tests)
   - Run `tsc` and lint for `api`, `web` and `types`.
   - curl:
     - the `PUT` happy path;
     - 400 for `-1`, `10001`, `1.5` and `"a"`;
     - 403 for another user's note and for an unknown id;
     - a resolved note can be rated;
     - `GET v1/feed` includes `rating`;
     - with seeded `seen_at` and rating values, the order matches the formula;
     - never-seen notes are still first.
   - In the browser, at desktop and mobile widths:
     - a tap changes the value by ±1;
     - holding speeds up;
     - the network tab shows **one** `PUT` per burst, sent about 600ms after release;
     - −1 is disabled at 0 and +1 at 10000;
     - a forced failure (e.g. offline) reverts the value and shows a toast;
     - navigating away mid-debounce still sends the `PUT`;
     - loaded cards don't reorder;
     - a highly rated note comes back sooner on later pages;
     - long-press on touch shows no context menu.
