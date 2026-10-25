# #157 refactor-messages-to-notes: implementation plan

- **Requirements:** `2__requirements.md` (the source of truth). The facts and line numbers are in `1__analysis.md`.
- **Branch:** `157-refactor-messages-to-notes`. One commit per task, one PR, squash-merged at the end.
- **Tasks:** T1..T10, run in the order below. Each task is written so that a fresh agent can run it from this file and `2__requirements.md` alone.
- **Ops:** the release runbook at the end is **for the owner**, not for an agent.

## Dependency graph

```
T1 web: remove inbox ─────────┐
                              ├─► T3 stats → dashboard ─┐
T2 api: remove modules ───────┤                         │
                              └─────────────────────────┴─► T4 notes module split ─┬─► T5 M1 drops ─► T6 M2 renames ─┬─► T9 sql cleanup ─┐
                                                                                   ├─► T7 types cleanup ──────────────┤                   ├─► T10 final sweep + CLAUDE.md
                                                                                   └─► T8 web cleanup ────────────────┴───────────────────┘
```

| Task | Depends on | Touches                                                                                                         | Parallel-safe with |
| ---- | ---------- | --------------------------------------------------------------------------------------------------------------- | ------------------ |
| T1   | —          | `apps/web` (inbox, App, store, sidebar, feed)                                                                   | T2                 |
| T2   | —          | `apps/api/src` (app.module, 3 modules, shared/utils), `scripts/`                                                | T1                 |
| T3   | T1         | `apps/api/src/stats`, `packages/types/stats.ts`, `apps/web` (home, App, sidebar, store)                         | T2                 |
| T4   | T1, T2, T3 | `apps/api/src/{feed,notes,app.module}`, `packages/types/{feed,notes,index}.ts`, `apps/web` (feed, notes, store) | —                  |
| T5   | T4         | `prisma/schema.prisma`, the new migration, `api/src/{feed,notes}`, `sql/backfills`                              | T7, T8             |
| T6   | T5         | `prisma/schema.prisma`, the new migration, `api/src/{feed,notes,stats}`                                         | T7, T8             |
| T7   | T4         | `packages/types`                                                                                                | T5, T6, T8         |
| T8   | T3, T4     | `apps/web` (shared, deps, eslint, css, assets, feed utils)                                                      | T5, T6, T7         |
| T9   | T6         | `apps/api/sql`                                                                                                  | T7, T8             |
| T10  | all        | `CLAUDE.md`, any naming leftovers                                                                               | —                  |

**Default: run the tasks one at a time in numeric order.** "Parallel-safe" means the file sets don't overlap. Run tasks in parallel only in separate git worktrees, because they commit to one branch and would otherwise mix staged files.

---

## Rules for every task (an agent reads these first)

1. **Read first:** `CLAUDE.md`, `2__requirements.md`, and this task's section. Don't do work that belongs to another task, even if it's tempting (e.g. don't rename `message` in the Prisma client before T6).
2. **Before starting,** check `git status`. The tree must be clean, and the previous task's commit must be in `git log`.
3. **Code style:** match the surrounding code (comment density, naming, the feature folder layout), and use Prettier (single quotes, trailing commas, 2 spaces). Run `pnpm --filter <app> exec prettier --write <changed files>` if you're unsure.
4. **Verification gate, before committing,** from the repo root:
   ```sh
   pnpm --filter api exec prisma generate
   pnpm build
   pnpm lint
   ```
   All three must pass. Lint warnings that already existed are fine; new errors aren't.
5. **Runtime check:** when a task changes API behaviour or raw SQL, start the stack (`cd apps/api && docker compose up -d`, then `pnpm dev` from the root) and hit the listed endpoints. Raw SQL isn't type-checked (R6). Use the web app in the browser, or `curl` with the `access_token` cookie from a login (`POST /api/v1/auth/login`). Use a local test user from the local DB; never real credentials.
6. **Commit** with `git add -A && git commit -m "<message from the task>"` and the repo's co-author trailer. Don't push.
7. **If something in the plan is wrong** (a file is missing, a name differs, or a step breaks the build): fix it the minimal way that matches `2__requirements.md`, and mention it in the commit body. If it changes a decision, stop and ask.

---

## T1: web: remove inbox

**Goal:** `features/inbox` is gone and the feed no longer depends on it. Covers G1, G2, G10 and C8.

**Steps:**

1. **Move `TextWithLinks`:**
   - Create `apps/web/src/features/feed/components/TextWithLinks.tsx` with the content of `features/inbox/components/messages/TextWithLinks.tsx`.
   - Move `URL_REGEX` (`/https?:\/\/[^\s]+/g`) from `features/inbox/const/message.constants.ts` into `features/feed/const/feed.constants.ts`, with a one-line comment, and import it from there.
   - Rename any `message` wording inside it.
2. **`FeedItem.tsx`:** import `TextWithLinks` from `./TextWithLinks`.
3. **`FeedEmpty.tsx`:** title "No notes yet", text "Write your first note above.". Remove the `Button`/`Link` block and those imports, and keep the `Newspaper` icon.
4. **`FeedNoteInput.tsx`:** replace the "A copy of the inbox MessageInput, creates chat-less notes." comment with a neutral one (e.g. "Creates a note; it's created as seen, so the feed returns it at the end of the rotation"), or drop it.
5. **`App.tsx`:** remove the lazy `InboxPage` and `<Route path="/inbox">`. Leave the other routes alone; T3 restructures them.
6. **`widgets/AppSidebar.tsx`:** remove the Inbox nav item and the `InboxIcon` import.
7. **`store.ts`:**
   - Remove `chatsApi`, `messagesApi`, `resolvedMessagesApi` and `chatsSlice` (imports, reducers and middleware).
   - Keep `RootState`. Leave `AppDispatch` for T8.
8. **Delete:** `git rm -r apps/web/src/features/inbox`.
9. **Check for leftovers:** `rg -i "inbox" apps/web/src` returns nothing.

**Done when:**

- The gate passes.
- In the browser: the sidebar shows Home and Feed, the feed renders links in note text, and `/inbox` shows the 404 page.

**Commit:** `T1: remove web inbox, move TextWithLinks into feed`

---

## T2: api: remove messages, chats, user-actions

**Goal:** the API has no chat, message or user-action modules. Covers D4, D7, G11 and C10/C11.

**Steps:**

1. **`apps/api/src/app.module.ts`:** remove the `ChatsModule`, `MessagesModule` and `UserActionsModule` imports and their entries. Keep `MongoModule` and `PerformanceAnalyticsModule` (R11).
2. **Delete the folders:** `git rm -r apps/api/src/messages apps/api/src/chats apps/api/src/user-actions`.
3. **Delete** `apps/api/src/shared/utils/prisma.utils.ts`, and the `shared/utils/` folder if it's empty.
   - First check: `rg "shared/utils/prisma.utils|isRecordNotFoundError|isUniqueConstraintError" apps/api/src` must return nothing.
   - `src/prisma/prisma.utils.ts` is a **different** file, used by `DEV__prisma.service.ts`. Keep it.
4. **Delete the transform scripts:** `git rm scripts/transform-chats-to-user-actions.js scripts/transform-messages-to-user-actions.js`. Keep `scripts/transform-performance-events.js`.
5. **Check:** `rg "user-actions|UserActions|ChatsService|MessagesService" apps/api/src` returns nothing.

**Don't touch:** `prisma/schema.prisma`, `src/feed`, `src/stats` (T3–T6), or `packages/types` (T7). `packages/types` still exports `chats.ts` and `messages.ts`, and that's fine for now.

**Done when:**

- The gate passes.
- The API boots (`pnpm --filter api run start:dev`, or `pnpm dev`).
- `GET /api/v1/feed` and `GET /api/v1/stats/notes/totals` still respond.
- Swagger (`/api/docs`) has no chats or messages routes.

**Commit:** `T2: remove messages, chats and user-actions API modules`

---

## T3: stats → total count, home → dashboard, routes

**Goal:**

- stats return `{ total }` counted by `user_id`;
- the web Home becomes the Dashboard at `/dashboard`;
- `/` redirects to `/feed`.

Covers D5, G4, G20, C6 and C13. The API, the types and the web change together (C6), or the build breaks.

**API (`apps/api/src/stats`):**

1. **`stats.service.ts`:**
   - Replace everything with one method:
     ```ts
     async getNotesTotals(dto: GetNotesTotalsServiceDto): Promise<NotesTotals> {
       const total = await this.prismaService.message.count({
         where: { userId: dto.userId },
       });
       return { total };
     }
     ```
   - Keep `prismaService.message` here; T6 renames it to `note`.
   - No raw SQL is left.
2. **`stats.controller.ts`:** remove the `burndown` route and its imports.
3. **`stats.types.ts`:** keep only `GetNotesTotalsServiceDto { userId }`. Delete `GetNotesBurndownServiceDto` and the `*Db` row types.
4. **Delete** `stats.dto.ts` and `stats.const.ts`.
5. **Check:** `rg "chats|message_resolutions|burndown|resol" apps/api/src/stats` returns nothing.

**Types (`packages/types/src/stats.ts`):**

6. Keep only `NotesTotals = { total: number }` and `GetNotesTotalsSuccessResponse`. Delete `NotesGap`, `NotesPeriodStats`, `NotesBurndownPoint` and `GetNotesBurndownSuccessResponse`.

**Web:**

7. **Rename the folder:** `git mv apps/web/src/features/home apps/web/src/features/dashboard`, and `pages/Home.page.tsx` → `pages/Dashboard.page.tsx` with `export const DashboardPage`.
8. **`Dashboard.page.tsx`:** render `NotesStatsContainer` only, and drop the burndown import.
9. **`api/stats.api.ts`:** keep only `notesTotals` and the tag `NotesTotals`, and export `useNotesTotalsQuery`.
10. **`NotesStatsContainer.tsx`:**
    - Render one `<NotesStatsCard label="Total notes" value={total} icon={NotebookPen} />`.
    - Keep `GRID_CLASS_NAME` (`grid grid-cols-1 gap-4 sm:grid-cols-3`). The loading state is **one** `<Skeleton>` sized like the card: check the card's real height and drop `h-60` if it no longer matches.
    - Remove the `CircleCheck`/`CircleDashed` and `toCardPeriods` imports.
11. **`NotesStatsCard.tsx`:** remove the `details` prop, `renderGap` and every chip or period rendering. Keep the label, value and icon.
12. **Delete:**
    - `components/NotesBurndown/` (both files);
    - `components/NotesStats/NotesStatsCardChip.tsx` and `NotesStatsCardChipBlock.tsx`;
    - `utils/stats.utils.ts` and `types/stats.types.ts`. Delete the folders too if they end up empty.
13. **`store.ts`:** update the `statsApi` import path to `./features/dashboard/api/stats.api`.
14. **`App.tsx`:**
    - The lazy page is `DashboardPage` from `./features/dashboard/pages/Dashboard.page`.
    - Routes inside the auth layout:
      ```tsx
      <Route path="/" element={<Navigate to="/feed" replace />} />
      <Route path="/feed" element={<FeedPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      ```
    - Import `Navigate` from `react-router`.
    - Leave the `*` 404 and `/login` routes as they are.
15. **`widgets/AppSidebar.tsx`:**
    - `navItems` is `[{ to: '/feed', label: 'Feed', icon: NewspaperIcon, end: false }, { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon, end: false }]`.
    - Drop `HomeIcon`.
16. Leave `Login.page.tsx` as it is: it navigates to `/`, which redirects.

**Done when:**

- The gate passes.
- Login lands on `/feed`. The sidebar shows Feed and then Dashboard, and the active state is right on both.
- `/dashboard` shows one "Total notes" card, and its value equals `count(*) FROM messages WHERE user_id = <me>` (resolved notes are still counted until T5).
- `GET /api/v1/stats/notes/totals` returns `{ total }`, and `/burndown` returns 404.

**Commit:** `T3: reduce stats to the notes total, rename home to dashboard, land on feed`

---

## T4: notes module split (API, types, web)

**Goal:**

- create, rate and delete move to the `notes` module at `v1/notes/*`, and the feed keeps only `GET v1/feed`;
- the shared `NoteEntity` replaces `FeedItemEntity`, with no chat fields;
- the web has `features/notes` with `notesApi`;
- `messageId` → `noteId` everywhere outside the Prisma client.

Covers Q9, Q9a, Q9b, Q10, G8, G9 and C7. The Prisma model isn't renamed yet: keep using `prismaService.message`, `textMessage` and `Prisma.Message*` (T6 renames them).

**Types (`packages/types/src`):**

1. **New `notes.ts`** (follow `feed.ts` style: double quotes, `import type`):
   ```ts
   import type { BaseSuccessResponse } from "./shared";

   export type NoteEntity = {
     id: string;
     content: string;
     createdAt: string;
     rating: number;
   };

   // create note
   export interface CreateNoteRequestBody {
     content: string;
   }
   export interface CreateNoteSuccessResponse extends BaseSuccessResponse<NoteEntity> {}

   // set note rating
   export interface SetNoteRatingRequestBody {
     rating: number;
   }
   export type NoteRatingEntity = { id: string; rating: number };
   export interface SetNoteRatingSuccessResponse extends BaseSuccessResponse<NoteRatingEntity> {}

   // delete note
   export interface DeleteNoteSuccessResponse extends BaseSuccessResponse {}
   ```
2. **`feed.ts`:** keep `GetFeedQueryParams`, `FeedPage = { items: NoteEntity[]; total: number }` (import `NoteEntity` from `./notes`) and `GetFeedSuccessResponse`. Remove `FeedItemEntity` and every `*FeedNote*` type.
3. **`index.ts`:** add `export * from "./notes";`. Leave the `chats` and `messages` exports for T7.

**API: new `apps/api/src/notes/`:**

4. **`notes.constants.ts`:** `NOTE_MAX_LENGTH = 1000`, `NOTE_RATING_MIN = 0` and `NOTE_RATING_MAX = 10000`, with the existing comments. Remove those three from `feed/feed.constants.ts` and keep `FEED_RATING_STEP_HOURS` there.
5. **`notes.dto.ts`:**
   - `CreateNoteDto implements CreateNoteRequestBody` and `SetNoteRatingDto implements SetNoteRatingRequestBody`.
   - Move them from `feed.dto.ts` with the same decorators, examples and descriptions, using the `NOTE_*` constants.
   - `feed.dto.ts` keeps only `GetFeedDto`.
6. **`notes.types.ts`:**
   - `CheckNoteAccessServiceDto { noteId; userId }`, `CreateNoteServiceDto { content; userId }`, `SetNoteRatingServiceDto { noteId; userId; rating }` and `DeleteNoteServiceDto { noteId; userId }`;
   - `DbNote = { id: string; createdAt: Date; rating: number; textMessage: { content: string } | null }` (T6 renames the key to `textNote`).
7. **`notes.utils.ts`:**
   - `NOTE_SELECT = { id, createdAt, rating, textMessage: { select: { content } } } satisfies Prisma.MessageSelect`;
   - `mapToNoteEntity(note: DbNote): NoteEntity`. No `chatId` or `chatTitle`.
8. **`notes.service.ts` (`NotesService`):** move `checkNoteAccess`, `createNote`, `setNoteRating` and `deleteNote` out of `FeedService`.
   - Rename `messageId` → `noteId` in the params and local variables, and `message` → `note`.
   - In `createNote`, keep `chatId: null` for now (T5 removes it), and return `mapToNoteEntity(...)`.
   - Rewrite the doc comment to "Creates a note. It's created as seen, so the feed returns it at the end of the rotation" (drop "chat-less").
9. **`notes.controller.ts`:** `@Controller('v1/notes')`, with:
   - `@Post()` `createNote`;
   - `@Put(':noteId/rating')` `setNoteRating`;
   - `@Delete(':noteId')` `deleteNote`;
   - `@Param('noteId')`, and the same response `message` strings as today.
10. **`notes.module.ts`:** imports `PrismaModule`, with `NotesController` and `NotesService`. Register `NotesModule` in `app.module.ts`.

**API: `apps/api/src/feed/`:**

11. **`feed.controller.ts`:** keep only `getFeed`, and trim the imports.
12. **`feed.service.ts`:**
    - Keep only `getNextPage`. Use `NOTE_SELECT` and `mapToNoteEntity` from `src/notes/notes.utils`.
    - Rename the locals to `notes`, `noteById` and `orderedNotes`.
    - Leave the raw SQL and `prismaService.message` alone (T6).
13. **`feed.utils.ts`:** remove `FEED_ITEM_SELECT` and `mapToFeedItem`. Keep `buildFeedWhere`, `buildFeedWhereSql` and `buildFeedOrderSql` unchanged (T5 and T6 change them).
14. **`feed.types.ts`:** keep only `GetFeedServiceDto`.
15. **Check:** `rg "messageId|chatTitle|chatId|FeedItemEntity|FeedNote" apps/api/src` → only `chatId: null` in `notes.service.ts` is left.

**Web: new `apps/web/src/features/notes/`:**

16. **`types/notes.types.ts`:** `CreateNoteParams { body: CreateNoteRequestBody }`, `SetNoteRatingParams { noteId: string; body: SetNoteRatingRequestBody }` and `DeleteNoteParams { noteId: string }`.
17. **`api/notes.api.ts`:**
    - `export const notesApi = createApi({ reducerPath: 'notesApi', baseQuery: baseQueryWithCookies, endpoints: () => ({}) })`, then `notesApiEndpoints = notesApi.injectEndpoints(...)` with:
      - `createNote`: `POST v1/notes`. No cache patch; keep the existing comment explaining why.
      - `setNoteRating`: `PUT v1/notes/${noteId}/rating`. Move the `onQueryStarted` from `feed.api.ts` and patch with `feedApiEndpoints.util.updateQueryData('feed', { pageSize: FEED_PAGE_SIZE }, …)`, imported from `@/features/feed/api/feed.api` and `@/features/feed/const/feed.constants`.
      - `deleteNote`: `DELETE v1/notes/${noteId}`. Same pattern, using `removeFeedItem` from `@/features/feed/utils/feed.utils`.
    - Keep the feed-cache comments ("no tags: the feed is never refetched…"), and add a top-level comment that these mutations must patch the feed cache, never invalidate it (CLAUDE.md feed cache rule).
    - Export `useCreateNoteMutation`, `useSetNoteRatingMutation` and `useDeleteNoteMutation`.
18. **`store.ts`:** register `notesApi` (the reducer and `.concat(notesApi.middleware)`).

**Web: `features/feed`:**

19. **`api/feed.api.ts`:** keep only the `feed` infinite query and `useFeedInfiniteQuery`, and trim the imports.
20. **`types/feed.types.ts`:** keep only `GetFeedParams`.
21. **`utils/feed.utils.ts`:**
    - Change the types to `NoteEntity`: `dedupeKeepLast` returns `NoteEntity[]`.
    - `removeFeedItem(pages, noteId)`.
    - Leave `formatRelativeTime` for T8.
22. **Switch the hooks:**
    - `components/FeedNoteInput.tsx` → `useCreateNoteMutation`;
    - `components/DeleteFeedNoteDialog.tsx` → `useDeleteNoteMutation`, `{ noteId: item.id }`;
    - `hooks/useBatchedRating.ts` → `useSetNoteRatingMutation`, `noteId`.
    - Rename the locals (`createFeedNote` → `createNote`, etc.).
23. **`FeedItemEntity` → `NoteEntity`** in every feed file that uses it: props in `FeedItem`, `FeedRating`, `DeleteFeedNoteDialog`, `useBatchedRating`, …
24. **`components/FeedItem.tsx`:** remove the chat title and the `·` from the header, so it shows the time only.
25. **Check:** `rg "messageId|chatTitle|chatId|FeedItemEntity|CreateFeedNote|SetFeedNote|DeleteFeedNote(Success|Params)|useCreateFeedNote|useSetFeedNote|useDeleteFeedNote" apps/web/src packages/types/src` → no hits. The component name `DeleteFeedNoteDialog` stays.

**Done when:**

- The gate passes.
- Runtime:
  - `POST /api/v1/notes`, `PUT /api/v1/notes/:id/rating` and `DELETE /api/v1/notes/:id` work, and another user's id gets 403;
  - the old `/api/v1/feed/notes…` routes return 404;
  - `GET /api/v1/feed` items have no `chatId` or `chatTitle`.
- In the browser:
  - create a note: the input clears and there's no feed refetch (check the network tab: no extra `GET v1/feed`);
  - rate one, including press and hold: the change persists after the card remounts;
  - delete one: it disappears without a refetch.
- Card headers show the time only.

**Commit:** `T4: move note create/rate/delete into a notes module and notesApi`

---

## T5: migration M1: drop chats and resolutions, make user_id required

**Goal:** the schema has no `Chat` or `MessageResolution`, no `Message.chatId`, and `userId` is required. Covers D3, D6, G3, G5, C2 and C3. The models aren't renamed yet.

**Steps:**

1. **Add the manual prod script** `apps/api/sql/backfills/2026102501__delete-resolved-notes.sql`:
   ```sql
   -- Deletes the resolved notes (messages that have a message_resolutions row).
   -- Run by hand on prod BEFORE the drop_chats_and_resolutions migration is deployed,
   -- otherwise every resolved note comes back into the feed once message_resolutions is dropped.
   -- text_messages and message_resolutions rows are removed by ON DELETE CASCADE.
   -- Idempotent: safe to re-run.
   BEGIN;

   SELECT count(*) AS notes_before FROM messages;
   SELECT count(*) AS resolved_to_delete FROM message_resolutions;

   DELETE FROM messages m
   USING message_resolutions r
   WHERE r.message_id = m.id;

   SELECT count(*) AS notes_after FROM messages;
   SELECT count(*) AS text_messages_orphans
   FROM text_messages t LEFT JOIN messages m ON m.id = t.message_id
   WHERE m.id IS NULL;

   COMMIT;
   ```
   Before committing, check that `text_messages.message_id` and `message_resolutions.message_id` really are `ON DELETE CASCADE` (`\d text_messages` / `\d message_resolutions` in psql, or the migrations `20260426101245_*` and `20260517105835_*`). If one isn't, add an explicit `DELETE` for it first.
2. **Prepare the local DB the way prod is.** Start it with `cd apps/api && docker compose up -d`. Using `psql "$DATABASE_URL"` from `apps/api/.env` (or `docker compose exec`):
   - Record the counts: `SELECT count(*) FROM messages; SELECT count(*) FROM message_resolutions; SELECT count(*) FILTER (WHERE user_id IS NULL) FROM messages;`.
   - Run `apps/api/sql/backfills/2026102401__messages-user-id.sql`, which fills in `user_id` (local data may predate it).
   - Run the new `2026102501__delete-resolved-notes.sql`.
   - `SELECT count(*) FROM messages WHERE user_id IS NULL` must be 0.
3. **`prisma/schema.prisma`:**
   - Delete the `Chat` and `MessageResolution` models.
   - `User`: remove `chats Chat[]`.
   - `Message`:
     - remove `chatId`, the `chat` relation, `messageResolution` and `@@index([chatId, createdAt])`;
     - `userId String @map("user_id")` (required);
     - `user User @relation(fields: [userId], references: [id], onDelete: Cascade)` (no `?`).
4. **Create the migration without applying it:** `cd apps/api && pnpm db:migrate:local --create-only --name drop_chats_and_resolutions`.
   - Read the generated SQL. It must contain only:
     - dropping the FKs `messages_chat_id_fkey`, `chats_user_id_fkey` and `message_resolutions_message_id_fkey`;
     - dropping the index `messages_chat_id_created_at_idx`;
     - `ALTER TABLE "messages" DROP COLUMN "chat_id", ALTER COLUMN "user_id" SET NOT NULL`;
     - `DROP TABLE "chats"` and `DROP TABLE "message_resolutions"`.
   - **Nothing may touch `messages` rows or `text_messages`.** If Prisma adds anything else, stop and investigate.
5. **Apply it:** `pnpm db:migrate:local`. Then run `pnpm db:migrate:local --create-only --name drift_check`: it must report that there are no changes. If it creates a folder anyway, inspect it, fix the schema, and delete the folder.
6. **Code:**
   - `notes/notes.service.ts` `createNote`: remove `chatId: null`.
   - `feed/feed.utils.ts`:
     - `buildFeedWhere` → `{ userId }`;
     - `buildFeedWhereSql` → `WHERE m.user_id = ${userId}` (drop the `NOT EXISTS` on `message_resolutions`);
     - keep the "keep them in sync" comments.
   - `rg "chat|resolution|Resolution" apps/api/src` → no hits.
7. Leave the old `2026102401__messages-user-id.sql` in place; T9 deletes it.

**Done when:**

- The gate passes, and there's no drift.
- Local counts: `count(messages)` = the recorded count − the resolved notes deleted, and `count(text_messages)` = `count(messages)`.
- Runtime:
  - `GET /api/v1/feed` pages through every note;
  - `GET /api/v1/stats/notes/totals` `total` = the feed `total`;
  - create, rate and delete still work.

**Commit:** `T5: drop chats and message resolutions, require note user_id`

---

## T6: migration M2: rename to Note / TextNote / NoteType

**Goal:** no `message` naming in the DB, the Prisma client or the API code. Covers D1, D2, G6, G7, C4, R1 and R13.

**Steps:**

1. **`prisma/schema.prisma`:** make it match `2__requirements.md` §1.1 exactly:
   - `enum NoteType` with `@@map("note_type")`;
   - `model Note` with `@@map("notes")`, `type NoteType`, and `textNote TextNote?`;
   - `model TextNote` with `@@map("text_notes")`, `noteId String @unique @map("note_id")`, and `note Note @relation(fields: [noteId], …)`;
   - `User.notes Note[]`;
   - keep both `@@index`es.
2. **Create the migration without applying it:** `cd apps/api && pnpm db:migrate:local --create-only --name rename_messages_to_notes`.
3. **Replace the entire generated `migration.sql`** (it will be DROP/CREATE, which would lose every note) with:
   ```sql
   -- Hand-written: renames only, no data is touched.
   -- Prisma generates DROP/CREATE for renamed models, never use the generated SQL here.

   -- enum
   ALTER TYPE "message_type" RENAME TO "note_type";

   -- messages -> notes
   ALTER TABLE "messages" RENAME TO "notes";
   ALTER TABLE "notes" RENAME CONSTRAINT "messages_pkey" TO "notes_pkey";
   ALTER TABLE "notes" RENAME CONSTRAINT "messages_user_id_fkey" TO "notes_user_id_fkey";
   ALTER INDEX "messages_seen_at_created_at_idx" RENAME TO "notes_seen_at_created_at_idx";
   ALTER INDEX "messages_user_id_seen_at_idx" RENAME TO "notes_user_id_seen_at_idx";

   -- text_messages -> text_notes
   ALTER TABLE "text_messages" RENAME TO "text_notes";
   ALTER TABLE "text_notes" RENAME CONSTRAINT "text_messages_pkey" TO "text_notes_pkey";
   ALTER TABLE "text_notes" RENAME COLUMN "message_id" TO "note_id";
   ALTER INDEX "text_messages_message_id_key" RENAME TO "text_notes_note_id_key";
   ALTER TABLE "text_notes" RENAME CONSTRAINT "text_messages_message_id_fkey" TO "text_notes_note_id_fkey";
   ```
   - Before this step, list the live names (`\d+ messages`, `\d+ text_messages`, `\dT`) and check that each source name exists.
   - If a name differs (e.g. the pkey was created with another name), rename it from the real name, and add a comment.
4. **Apply it:** `pnpm db:migrate:local`, then `pnpm db:migrate:local --create-only --name drift_check`. It **must** report no changes. Any generated SQL means a name mismatch: fix it in `rename_messages_to_notes` (reset the local DB with `prisma migrate reset` only if needed, after re-running the T5 local prep), and delete the `drift_check` folder.
5. **Verify the data:** `count(notes)` and `count(text_notes)` equal the T5 counts.
6. **Regenerate cleanly:** `rm -rf apps/api/generated/prisma && pnpm --filter api exec prisma generate`.
7. **API code sweep (`apps/api/src`):**
   - `prismaService.message` / `tx.message` → `.note` in `feed.service.ts`, `notes.service.ts` and `stats.service.ts`.
   - `Prisma.MessageSelect` / `Prisma.MessageWhereInput` → `Prisma.NoteSelect` / `Prisma.NoteWhereInput`.
   - `textMessage` → `textNote` in `NOTE_SELECT`, `DbNote`, `mapToNoteEntity` and the `createNote` nested create (`textNote: { create: { content } }`).
   - **Raw SQL:**
     - `feed.service.ts`: `SELECT n.id FROM notes n`;
     - `feed.utils.ts`: `buildFeedWhereSql` / `buildFeedOrderSql` use the alias `n.` (`n.user_id`, `n.seen_at`, `n.rating`, `n.created_at`, `n.id`), and the comment says "Expects `notes n`".
   - Rename any local `message`/`messages` variables and comments.
8. **Check:** `rg -i "message|chat|resol" apps/api/src apps/api/prisma/schema.prisma` → only the `{ message: '…' }` response envelope and the class-validator `{ message: … }` option are left (excluded by `2__requirements.md` §5).

**Done when:**

- The gate passes, and there's no drift.
- Runtime (raw SQL!):
  - `GET /api/v1/feed`: several pages, the order is unchanged, and the notes get marked as seen;
  - `POST`, `PUT rating` and `DELETE /api/v1/notes…` work;
  - `GET /api/v1/stats/notes/totals` works.
- `\dt` shows `users`, `notes`, `text_notes` and `_prisma_migrations`, and `\dT` shows `note_type`.

**Commit:** `T6: rename messages to notes in the schema and API`

---

## T7: shared types cleanup

**Goal:** `packages/types` exports only what's used. Covers D8 and C5.

**Steps:**

1. **Check that nothing uses them:** `rg "@later/types" apps -A12 | rg "Chat|Message|SuccessListResponse"` → no hits. (Or check each export of `chats.ts` and `messages.ts` with `rg "<Name>" apps`.)
2. **Delete the files:** `git rm packages/types/src/chats.ts packages/types/src/messages.ts`.
3. **`index.ts`:** remove the `chats` and `messages` exports, leaving `auth`, `shared`, `notes`, `stats` and `feed`.
4. **`shared.ts`:** remove `SuccessListResponse`.
5. **Check every remaining export for a consumer** in `apps/` (`rg -w <Name> apps`). The only exception is a type used solely as a part of another exported response type (e.g. `NoteRatingEntity`, `FeedPage`), which is fine.

**Done when:** the gate passes (the build compiles both apps against the source).

**Commit:** `T7: remove unused shared types`

---

## T8: web cleanup: unused components, helpers, dependencies

**Goal:** no dead code or dependencies in `apps/web`. Covers G12, Q16, Q23 and C9.

**Steps:**

1. **Before deleting each file,** confirm it has no importers: `rg "<basename without extension>" apps/web/src`.
2. **shadcn:** `git rm apps/web/src/shared/components/ui/{combobox,input-group,context-menu,toggle-group,toggle,chart}.tsx`.
3. **Shared helpers:** `git rm apps/web/src/shared/components/ConditionalWrapper.tsx apps/web/src/shared/hooks/useDebouncedValue.ts apps/web/src/shared/types/api.ts apps/web/src/shared/utils/numbers.utils.ts apps/web/src/shared/const/date.const.ts`. Remove the folders if they're empty.
4. **`shared/utils/date.util.ts`:**
   - Remove `isOnDifferentDay`, `getReadableDate`, `getBrowserTimezone`, `formatCalendarDay`, `formatDuration` and `isMoreThanOneDayApart`, along with any imports that only they used (e.g. from `date.const.ts`).
   - Keep `formatIsoDate`, `formatIsoTime` and `formatIsoDateTime`.
   - Then check each kept function for importers.
5. **`features/feed/utils/feed.utils.ts`:** remove `formatRelativeTime`, `RELATIVE_UNITS` and `RELATIVE_MAX_MS`.
6. **`store.ts`:** remove `AppDispatch` and its TODO comment, and keep `RootState`.
7. **Assets:** `git rm apps/web/src/assets/{hero.png,react.svg,vite.svg}`, after `rg "hero.png|react.svg|vite.svg" apps/web` shows no users. Check `index.html` too: if it uses `/vite.svg` from `public/`, that's a different file, so keep it.
8. **Dependencies:**
   - `pnpm --filter web remove recharts @base-ui/react`.
   - Confirm with `rg "recharts|@base-ui" apps/web/src` that nothing imports them.
   - Check that `radix-ui` is still used, and keep it.
9. **`apps/web/eslint.config.js`:** remove the override blocks for `src/shared/components/ui/toggle-group.tsx` and `src/shared/components/ui/chart.tsx`.
10. **`apps/web/src/index.css`:** remove the `--color-chart-1..5` lines in `@theme` and the `--chart-1..5` lines in `:root` and `.dark`.
11. **Last pass:** list every file under `apps/web/src/shared` and `apps/web/src/features` and check for importers. Report anything else that's unused in the commit body, and delete it only if it was made dead by #157.

**Done when:**

- The gate passes, and `pnpm-lock.yaml` is updated.
- The browser smoke test passes: login, feed, dashboard, the sidebar on mobile width (the sheet), and the user menu logout.

**Commit:** `T8: remove unused web components, helpers and dependencies`

---

## T9: sql folder cleanup

**Goal:** `apps/api/sql` holds only what still applies. Covers G13, Q18, Q19 and Q22.

**Steps:**

1. `git rm apps/api/sql/seeds/2026091401__seed.sql apps/api/sql/backfills/2026102401__messages-user-id.sql apps/api/sql/performance/*.md`.
2. **Keep** `apps/api/sql/backfills/2026102501__delete-resolved-notes.sql`. The owner runs it during the release; it references the old table names on purpose, because it runs before the migrations.
3. **Check** that nothing else refers to the deleted files: `rg "sql/seeds|sql/performance|messages-user-id" --glob '!brainstorm/**'`. Any hits in `CLAUDE.md` are fixed in T10.

**Done when:** the gate passes.

**Commit:** `T9: remove the obsolete seed, backfill and performance write-ups`

---

## T10: final naming sweep and CLAUDE.md

**Goal:** the naming rule holds everywhere, and `CLAUDE.md` describes the new model. Covers G15, G21 and all of the acceptance criteria.

**Steps:**

1. **Sweep:**
   ```sh
   rg -i "message|chat|inbox|resol" apps packages scripts \
     --glob '!**/migrations/**' --glob '!**/node_modules/**' \
     --glob '!**/generated/**' --glob '!**/dist/**' \
     --glob '!apps/api/sql/backfills/2026102501__delete-resolved-notes.sql'
   ```
   - Every remaining hit must be one of the exclusions in `2__requirements.md` §5: the envelope `message`, Nest/validator `message`, error-toast `data.message`, or library APIs.
   - Fix anything else: names, comments, UI copy, Swagger `@ApiProperty` texts.
2. **`CLAUDE.md`:** update every stale line:
   - "What this is": notes in a feed (create, rate, delete, work through stale notes); the dashboard shows the total number of notes. No chats or resolving.
   - The single-test example: replace `src/chats/chats.service.spec.ts` with `src/auth/auth.service.spec.ts`.
   - The response shapes: only `BaseSuccessResponse`; remove `SuccessListResponse`.
   - **Ownership checks:** `NotesService.checkNoteAccess`. Every write path to a note must call it.
   - **Two databases:**
     - Postgres holds `users`, `notes` and `text_notes`, and a note is a `Note` with a `TextNote`;
     - Mongo holds performance analytics only (`PerformanceInterceptor` → `PerformanceAnalyticsService`);
     - remove the user-actions bullet;
     - stats are Postgres-only.
   - `DEV__prisma.service.ts`: keep it, and remove the `sql/performance/` and `sql/seeds/` mentions. Mention `sql/backfills/` for one-off manual data scripts.
   - The feed: `GET v1/feed` only. Note create, rate and delete live in the `notes` module (`v1/notes`).
   - **Web:**
     - `slices`/`selectors` are no longer used by any feature; keep them in the layout list only as optional, or drop them;
     - pages: `/` → `/feed`, plus `/dashboard`;
     - `features/notes` holds `notesApi`, whose mutations patch the feed cache (they never invalidate it);
     - update the feed cache rule to mention `notesApi`.
3. **Run the full acceptance checklist** (`2__requirements.md` §8) locally: the API, the browser (desktop and mobile width), Swagger, and that Mongo `performance_events` still gets new documents.
4. **Report** the result of each criterion in the commit body.

**Done when:** the gate passes, every acceptance criterion is checked, and the sweep is clean.

**Commit:** `T10: final naming sweep, update CLAUDE.md`

After T10, open the PR from `157-refactor-messages-to-notes` (squash-merge, titled after the branch).

---

## Ops: release runbook (the owner runs this by hand, after the PR is merged)

The window is short; downtime is accepted. The old web against the new API breaks the dashboard and feed (R7), and the old API against the new schema returns 500s (R8). Do all of it in one go.

1. **Back up** (R2: the drops are irreversible):
   ```sh
   pg_dump "$PROD_DATABASE_URL" -Fc -f later-$(date +%Y%m%d-%H%M).dump
   ```
2. **Pre-flight checks** (read-only):
   ```sql
   SELECT count(*) AS notes, count(*) FILTER (WHERE user_id IS NULL) AS no_owner FROM messages;
   SELECT count(*) AS resolved FROM message_resolutions;
   ```
   `no_owner` must be 0. Otherwise, rerun the old `user_id` backfill from git history (`git show <T9 commit>^:apps/api/sql/backfills/2026102401__messages-user-id.sql`).
3. **Stop the running API container**, so nothing writes during the migration.
4. **Delete the resolved notes:** run `apps/api/sql/backfills/2026102501__delete-resolved-notes.sql` against prod, and check the printed counts (`notes_after = notes_before − resolved_to_delete`, `text_messages_orphans = 0`).
5. **Migrate:** `pnpm --filter api db:migrate:prod`. This applies `drop_chats_and_resolutions` and then `rename_messages_to_notes`.
6. **Check the schema:** `\dt` → `users`, `notes`, `text_notes`, `_prisma_migrations`. `SELECT count(*) FROM notes;` = `notes_after`.
7. **Build and run the new API image:** `scripts/build.sh`, then `scripts/run.sh`. Check `GET /health`, then `/api/docs`.
8. **Deploy the web** (Vercel, from `main`). Then hard-refresh the open tabs.
9. **Smoke test on prod:** login → `/feed`; create, rate and delete a note; `/dashboard` total = the feed total.
10. **Rollback, only if needed:** `pg_restore` the dump into a fresh DB, then redeploy the previous API image and web build. Prisma has no down migrations.

---

## Running this with agents

- **One task per fresh agent session,** in numeric order. Prompt template:

  > Execute task **T<N>** from `brainstorm/2026102501__157-refactor-messages-to-notes/3__implementation-plan.md`. Read `CLAUDE.md`, `2__requirements.md`, the "Rules for every task" section and the T<N> section first. Follow its steps, run the verification gate and the runtime checks listed under "Done when", then commit with the given message. Don't start any other task. Report what you changed, the check results, and any deviation from the plan.

- **Optional orchestrator,** in one session that spawns a subagent per task: run T1 and T2 (parallel only in worktrees, otherwise sequential), then T3, T4, T5, T6, T7, T8, T9 and T10. After each subagent, check that `git log -1` is the expected commit and that the gate passes, before starting the next one.
- **Review points worth pausing at:**
  - after T4 (the contract change across all three packages);
  - after T5 and T6 (read both `migration.sql` files yourself before moving on).
