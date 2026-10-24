## Requirements (agreed)

### Data model

- `messages.user_id` is added as a **nullable** FK to `users.id` (`onDelete: Cascade`), with a new `@@index([userId, seenAt])` for the feed.
- `messages.chat_id` becomes nullable, so a note can exist outside of chats.
- The Prisma migration doesn't backfill. A separate, idempotent backfill script, `apps/api/sql/backfills/2026102401__messages-user-id.sql`, sets `user_id` from the note's chat. It's run by hand on prod.
  - The long-term plan: make `user_id` required and drop chats later. Not part of this issue.
- Every new note gets `user_id`:
  - feed-created notes through the new feed route;
  - inbox-created notes through a one-line change in `MessagesService.createTextMessage` (`userId: dto.userId`). Nothing else in the messages/chats modules changes. Moving notes between chats keeps the owner.

### API (feed module only)

- The chats and messages modules are left alone (they'll be removed later), except for the one line above. Their access checks stay chat-based.
- Feed reads switch to `m.user_id` (no `JOIN chats` for filtering, `LEFT JOIN` only for the title). Until the backfill runs, notes without `user_id` don't show in the feed. This is accepted; run the backfill right after the migration.
- New routes in `FeedController`, each with its own DTO and an access check by `messages.user_id`:
  - `POST v1/feed/notes`, body `{ content }`:
    - `content` is a string, not blank (has a non-whitespace char), max `FEED_NOTE_MAX_LENGTH = 1000`;
    - creates a `TEXT` message with `userId`, `chatId: null`, `seenAt: now()` (so the feed algorithm puts it at the end of the rotation);
    - no user action is recorded in Mongo;
    - returns the created note as a `FeedItemEntity`.
  - `PUT v1/feed/notes/:messageId/rating`, body `{ rating }`, an integer from `FEED_RATING_MIN` to `FEED_RATING_MAX` (0..10000, defined in `feed.constants.ts`, not imported from messages). Returns `{ id, rating }`.
  - `DELETE v1/feed/notes/:messageId`.
  - A note that doesn't exist or isn't the user's → `403 "You don't have access to this note"`.
- Stats stay chat-based and untouched, so chat-less notes don't count on the dashboard. This is a known gap until chats are removed.

### Shared types (`@later/types`, `feed.ts`)

- `FeedItemEntity.chatId: string | null`, `chatTitle: string | null`.
- New types:
  - `CreateFeedNoteRequestBody { content: string }`, `CreateFeedNoteSuccessResponse` (`BaseSuccessResponse<FeedItemEntity>`);
  - `SetFeedNoteRatingRequestBody { rating: number }`, `SetFeedNoteRatingSuccessResponse` (`BaseSuccessResponse<{ id: string; rating: number }>`);
  - `DeleteFeedNoteSuccessResponse` (`BaseSuccessResponse`).

### Feed note input (`FeedNoteInput`)

- A new component, `features/feed/components/FeedNoteInput.tsx`. It's a **copy** of `inbox/components/messages/MessageInput.tsx`, not a reuse of it.
- Placement: in the sticky top block, right under the "Feed" title, with the same blurred background, so it's always reachable while scrolling.
- Submitting:
  - Enter sends, Shift+Enter inserts a newline;
  - the Send button sends;
  - a blank (whitespace-only) text can't be sent: Send is disabled and Enter does nothing.
- Expandable: starts at 1 row and auto-grows with the content (wrapped lines included, via the Textarea's `field-sizing-content`) up to `max-h-48` (~8 rows), then scrolls inside.
- `maxLength={FEED_NOTE_MAX_LENGTH}` (1000). No counter.
- No autofocus. Placeholder: "Add a note…".
- Send flow (pessimistic, no toast on success):
  - while pending, the textarea is `readOnly` (keeps focus) and Send is disabled and shows a spinner; Enter is ignored;
  - on success, the input is cleared and focus stays in it;
  - on failure, the text stays and `displayErrorToast(e, 'Note create failed')` runs.
- The feed cache isn't touched on create. The new note shows up when the feed algorithm returns it.

### Feed cards

- A chat-less card's header shows only the relative time (no title, no `·`).
- Rating and delete switch to the new feed routes for every card. `chatId` is no longer needed for them.

### Out of scope

- Resolving notes from the feed. Chat-less notes can only be rated or deleted, and they don't show in the inbox.
- The inbox `MessageInput` limit (stays 255) and any messages/chats DTO limits.
- Stats for chat-less notes.

## Implementation plan

1. **`apps/api/prisma/schema.prisma`**
   - `Message`: `chatId String? @map("chat_id")`, `chat Chat? @relation(...)` (still `onDelete: Cascade`).
   - Add `userId String? @map("user_id")`, `user User? @relation(fields: [userId], references: [id], onDelete: Cascade)`, `@@index([userId, seenAt])`.
   - `User`: add `messages Message[]`.
   - Run `pnpm db:migrate:local` with the name `add_message_user_id`, then `prisma generate`.
2. **`apps/api/sql/backfills/2026102401__messages-user-id.sql`** (new)
   - `UPDATE messages m SET user_id = c.user_id FROM chats c WHERE c.id = m.chat_id AND m.user_id IS NULL;`, plus a header comment saying when to run it (right after the migration) and that it's safe to re-run.
3. **`apps/api/src/messages/messages.service.ts`**
   - In `createTextMessage`, add `userId: dto.userId` to the `create` data. Nothing else changes.
   - Fix the compile errors from the nullable `chatId` in messages/chats, if any, with minimal type-only changes (e.g. `DbAbstractMessageItem.chatId`). No behaviour changes.
4. **`packages/types/src/feed.ts`**
   - Make `chatId`/`chatTitle` nullable.
   - Add the create/rating/delete request and response types listed above.
5. **`apps/api/src/feed/feed.constants.ts`**
   - Add `FEED_NOTE_MAX_LENGTH = 1000`, `FEED_RATING_MIN = 0` and `FEED_RATING_MAX = 10000`.
6. **`apps/api/src/feed/feed.dto.ts`**
   - `CreateFeedNoteDto implements CreateFeedNoteRequestBody`: `@IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(FEED_NOTE_MAX_LENGTH) content`.
   - `SetFeedNoteRatingDto implements SetFeedNoteRatingRequestBody`: `@IsInt() @Min(FEED_RATING_MIN) @Max(FEED_RATING_MAX) rating`.
   - Both get `@ApiProperty`.
7. **`apps/api/src/feed/feed.types.ts`**
   - Add `CreateFeedNoteServiceDto`, `SetFeedNoteRatingServiceDto`, `DeleteFeedNoteServiceDto` and `CheckFeedNoteAccessServiceDto`.
   - `DbFeedItem`: `chatId: string | null`, `chat: { title: string } | null`.
8. **`apps/api/src/feed/feed.utils.ts`**
   - `buildFeedWhere`: `{ userId, messageResolution: { is: null } }`.
   - `buildFeedWhereSql`: `WHERE m.user_id = ${userId} AND NOT EXISTS (...)`. Update the doc comment: it expects `messages m` only.
   - `mapToFeedItem`: `chatId: message.chatId`, `chatTitle: message.chat?.title ?? null`.
9. **`apps/api/src/feed/feed.service.ts`**
   - `getNextPage`: drop `JOIN chats c` from the raw query. The Prisma `findMany` keeps selecting `chat: { select: { title: true } }` (now nullable).
   - `checkNoteAccess({ messageId, userId })`: `findUnique({ where: { id, userId } })`, otherwise `ForbiddenException("You don't have access to this note")`.
   - `createNote`: `message.create({ data: { type: 'TEXT', userId, chatId: null, seenAt: new Date(), textMessage: { create: { content } } }, select: <same as the feed select> })` → `mapToFeedItem`.
   - `setNoteRating`: check access, then `update` → `{ id, rating }`.
   - `deleteNote`: check access, then `delete`.
10. **`apps/api/src/feed/feed.controller.ts`**
    - Add `@Post('notes')`, `@Put('notes/:messageId/rating')` and `@Delete('notes/:messageId')`. Each returns `{ message, data }` in the usual style ("Create note successful", and so on).
11. **`apps/web/src/features/feed/const/feed.constants.ts`**
    - Add `FEED_NOTE_MAX_LENGTH = 1000` ("keep in sync with the API").
12. **`apps/web/src/features/feed/types/feed.types.ts`**
    - `SetMessageRatingParams` → `SetFeedNoteRatingParams { messageId; body }`.
    - `DeleteFeedNoteParams { messageId }` (drop `chatId`).
    - Add `CreateFeedNoteParams { body: CreateFeedNoteRequestBody }`.
13. **`apps/web/src/features/feed/api/feed.api.ts`**
    - `setMessageRating` → `setFeedNoteRating`: `PUT v1/feed/notes/:messageId/rating`. The cache patch stays as it is.
    - `deleteFeedNote`: `DELETE v1/feed/notes/:messageId`. The cache patch stays as it is.
    - Add `createFeedNote`: `POST v1/feed/notes`. No tags and no cache patch (comment why: the note was created as seen, and the feed algorithm returns it later).
    - Update the exported hooks.
14. **`apps/web/src/features/feed/hooks/useBatchedRating.ts`** and **`components/DeleteFeedNoteDialog.tsx`**
    - Use the renamed mutation and the new params, with no `chatId`.
15. **`apps/web/src/features/feed/components/FeedItem.tsx`**
    - Render the title and `·` only when `item.chatTitle` is set.
16. **`apps/web/src/features/feed/components/FeedNoteInput.tsx`** (new)
    - A copy of `MessageInput`, changed as listed in the requirements:
      - no `rows` logic, `className="min-h-0 max-h-48 resize-none"`, `rows={1}`;
      - placeholder, no autofocus, `maxLength={FEED_NOTE_MAX_LENGTH}`;
      - `isLoading` from `useCreateFeedNoteMutation` → `readOnly`, Send disabled, `<Spinner />` in place of the `Send` icon;
      - clear only after `unwrap()` resolves.
17. **`apps/web/src/features/feed/components/FeedContainer.tsx`**
    - The sticky header becomes a column: the title row (`h-12`), then `<FeedNoteInput />` with bottom padding, keeping `bg-background/80 backdrop-blur`.
18. **Verify** (no new automated tests)
    - Run `prisma generate`, `pnpm check-types` and `pnpm lint`.
    - Run the migration and then the backfill locally. Check that old notes still show in the feed and that the backfill is a no-op on a second run.
    - In the browser:
      - create a note with Enter and with Send;
      - Shift+Enter adds a newline;
      - a blank note can't be sent;
      - a long note grows the input to the cap, then scrolls;
      - the 1000-char cap works;
      - create while offline: the text stays and the error toast shows;
      - the created note comes up at the end of the feed rotation with a time-only header;
      - rate and delete a chat-less note and a chat note.
    - Create a note in the inbox and check that it has `user_id` and shows in the feed.
    - Swagger: the 3 new routes; `content` over 1000 chars or whitespace-only → 400.
