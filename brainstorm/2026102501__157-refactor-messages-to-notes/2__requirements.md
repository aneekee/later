# #157 refactor-messages-to-notes: requirements (agreed)

- **Input:** `0__init.md` (the raw ask) and `1__analysis.md` (facts, gaps G*, risks R*, couplings C*, questions Q*).
- **Grilled on:** 2026-10-25. Every Q in `1__analysis.md` §6 has an answer below.
- **Next:** `3__implementation-plan.md` (tasks T1..T10, plus the ops runbook).

The goal: move from chat-like notes to feed-like notes. A user has notes, sees them in the feed, creates, rates and deletes them, and sees a total count on the dashboard. Chats, resolutions, the inbox and user actions are gone, and so is the "message" / "chat" wording.

---

## 1. Data model and migrations

### 1.1 Target Prisma schema

```prisma
model User {
  // id, username, password, isVerified, createdAt unchanged
  notes Note[]
  @@map("users")
}

enum NoteType {
  TEXT
  @@map("note_type")
}

model Note {
  id        String    @id @default(uuid())
  type      NoteType  @default(TEXT)
  userId    String    @map("user_id")           // NOT NULL now
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(3)
  seenAt    DateTime? @map("seen_at") @db.Timestamptz(3)
  rating    Int       @default(0)

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  textNote TextNote?

  @@index([seenAt, createdAt])                    // kept, only renamed (Q8)
  @@index([userId, seenAt])
  @@map("notes")
}

model TextNote {
  id      String @id @default(uuid())
  noteId  String @unique @map("note_id")
  content String

  note Note @relation(fields: [noteId], references: [id], onDelete: Cascade)

  @@map("text_notes")
}
```

- The `Chat` and `MessageResolution` models are gone, and so are `Message.chatId`, `Message.chat`, `Message.messageResolution` and `User.chats`.
- The separate text table and the `type` column stay (D1).

### 1.2 Data decisions

| Q   | Decision                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q1  | **Resolved notes are deleted by hand on prod, before the migration.** The repo gets a one-off SQL file, `apps/api/sql/backfills/2026102501__delete-resolved-notes.sql`. The owner runs it. The migration itself only drops `message_resolutions` and doesn't delete any notes. |
| Q2  | Chat titles are dropped. The prod dump is the archive.                                                                                                                                                                                                                         |
| Q3  | Resolution comments (`message_resolutions.note`) are dropped with the table.                                                                                                                                                                                                   |
| Q4  | `user_id` becomes `NOT NULL`. **Prod is already backfilled** (Q25: yes), so the migration has no backfill. If a NULL is left, `SET NOT NULL` fails, and that's the abort.                                                                                                      |
| Q5  | **Two migrations:** M1 drops (resolutions, `chat_id`, `chats`, `user_id NOT NULL`), M2 renames. Both go to prod in one `migrate deploy`.                                                                                                                                       |
| Q6  | Full rename: tables, the column `message_id`→`note_id`, the enum, the relation fields (`textMessage`→`textNote`, `message`→`note`, `User.messages`→`notes`).                                                                                                                   |
| Q7  | Constraints and indexes are renamed to Prisma's default names, so nothing drifts.                                                                                                                                                                                              |
| Q8  | `messages_seen_at_created_at_idx` is **renamed** to `notes_seen_at_created_at_idx`, not dropped.                                                                                                                                                                               |

### 1.3 Migration rules

- **M2 must never be the SQL that Prisma generates.** Create it with `--create-only` and replace the body with hand-written `ALTER … RENAME` statements (R1). The full statement list is in `3__implementation-plan.md` T6.
- After every migration, running `migrate dev` again must report no schema changes (no drift).
- The local DB has to be prepared the same way prod is before M1: run the `user_id` backfill and the resolved-notes delete locally.

---

## 2. API (`apps/api/src`)

### 2.1 Modules

- **Deleted:** `messages/`, `chats/`, `user-actions/`, `shared/utils/prisma.utils.ts` (and with it the `shared/utils/` folder).
- **Kept:** `MongoModule`, `PerformanceAnalyticsModule` and the global `PerformanceInterceptor`. Mongo is still required (R11).
- **The Mongo `user_actions` collection is left as is** (Q21). No ops step.

### 2.2 New `notes` module (Q9)

Follows the standard feature layout (`notes.module/controller/service/dto/types/utils/constants.ts`). It imports `PrismaModule`, and `AppModule` registers it.

| Route                         | Body          | Response                       | Notes                                                                                           |
| ----------------------------- | ------------- | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `POST v1/notes`               | `{ content }` | `CreateNoteSuccessResponse`    | Creates a `TEXT` note with `userId` and `seenAt: now()`, so it lands at the end of the rotation |
| `PUT v1/notes/:noteId/rating` | `{ rating }`  | `SetNoteRatingSuccessResponse` | The absolute rating, an int from `NOTE_RATING_MIN` to `NOTE_RATING_MAX` (0..10000)              |
| `DELETE v1/notes/:noteId`     | —             | `DeleteNoteSuccessResponse`    |                                                                                                 |

- `NotesService.checkNoteAccess({ noteId, userId })`: a note that's missing or belongs to someone else → `403 "You don't have access to this note"`. Rate and delete both call it.
- **Moved from `feed` into `notes`, with the same behaviour:**
  - the validation rules: `content` is a string, not blank, max `NOTE_MAX_LENGTH = 1000`;
  - the response message strings.
- **`notes.utils.ts`** owns `NOTE_SELECT` (`id`, `createdAt`, `rating`, `textNote.content`) and `mapToNoteEntity`. The feed imports both. That's a plain TS import, so `FeedModule` doesn't import `NotesModule`.
- **`notes.constants.ts`** owns `NOTE_MAX_LENGTH`, `NOTE_RATING_MIN` and `NOTE_RATING_MAX`. They replace `FEED_NOTE_MAX_LENGTH` and `FEED_RATING_MIN/MAX` on the API.

### 2.3 Feed

- `FeedController` keeps only `GET v1/feed`. It isn't idempotent: it marks the returned notes as seen. The order rule is unchanged (`FEED_RATING_STEP_HOURS` stays in `feed.constants.ts`).
- The feed filter is `user_id = $1` only, with no resolution filter, in both `buildFeedWhere` (Prisma) and `buildFeedWhereSql` (raw). Keep the two in sync.
- `total` now means "all of the user's notes". The web pagination logic stays as it is.
- The raw SQL uses `FROM notes n` with the alias `n`, and the comments say "Expects `notes n`".

### 2.4 Stats (Q11)

- `GET v1/stats/notes/totals` → `NotesTotals = { total }`, computed with `prisma.note.count({ where: { userId } })`. That equals the feed `total`, and it now counts notes created in the feed too.
- `GET v1/stats/notes/burndown`, `stats.dto.ts` and `stats.const.ts` are deleted, along with every raw SQL query in stats.

### 2.5 Tests (Q27)

- Specs go with the folders they're in. No new specs are written, and the existing jest setup isn't fixed.

---

## 3. Shared types (`packages/types`)

| File                      | Result                                                                                                                                                                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notes.ts`                | **New.** `NoteEntity { id; content; createdAt; rating }`, `CreateNoteRequestBody { content }`, `CreateNoteSuccessResponse` (`<NoteEntity>`), `SetNoteRatingRequestBody { rating }`, `NoteRatingEntity { id; rating }`, `SetNoteRatingSuccessResponse` (`<NoteRatingEntity>`), `DeleteNoteSuccessResponse` |
| `feed.ts`                 | Only `GetFeedQueryParams`, `FeedPage { items: NoteEntity[]; total }` and `GetFeedSuccessResponse` stay. `FeedItemEntity` and every `*FeedNote*` type are removed                                                                                                                                          |
| `stats.ts`                | `NotesTotals { total }` and `GetNotesTotalsSuccessResponse` only                                                                                                                                                                                                                                          |
| `shared.ts`               | `BaseSuccessResponse` only (`SuccessListResponse` is removed)                                                                                                                                                                                                                                             |
| `chats.ts`, `messages.ts` | Deleted, along with their `index.ts` re-exports. `index.ts` exports `auth`, `shared`, `notes`, `feed` and `stats`                                                                                                                                                                                         |
| `auth.ts`                 | Unchanged                                                                                                                                                                                                                                                                                                 |

---

## 4. Web (`apps/web/src`)

### 4.1 Routing and navigation (Q12, Q13)

- **Routes:**
  - `/` → `<Navigate to="/feed" replace />`;
  - `/feed` → `FeedPage`;
  - `/dashboard` → `DashboardPage`;
  - `/inbox` is removed and falls through to the existing `*` 404 page, which stays as it is.
- The Login page still navigates to `/`, which redirects to `/feed`.
- **Sidebar:**
  1. **Feed** (`/feed`, `NewspaperIcon`);
  2. **Dashboard** (`/dashboard`, `LayoutDashboardIcon`).

  The Home and Inbox items are removed.

### 4.2 Dashboard (was Home)

- `features/home` is renamed to `features/dashboard`, and `HomePage` (`Home.page.tsx`) to `DashboardPage` (`Dashboard.page.tsx`).
- The page renders `NotesStatsContainer` only, with a single `NotesStatsCard` (label "Total notes", `NotebookPen` icon, value `total`).
  - The card loses `details`, `renderGap` and the chip components.
  - The grid stays `grid-cols-1 sm:grid-cols-3`, so later cards fit. The loading state shows **one** skeleton, with the same height as the card.
- `stats.api.ts` keeps only `notesTotals` (tag `NotesTotals`). `StatsError` stays.
- Deleted: the burndown components, `NotesStatsCardChip`, `NotesStatsCardChipBlock`, `utils/stats.utils.ts` and `types/stats.types.ts`.

### 4.3 Notes (Q9a, Q9b)

- **New `features/notes`, holding the API layer only:**
  - `api/notes.api.ts`: a `notesApi` `createApi` (`reducerPath: 'notesApi'`, `baseQueryWithCookies`), registered in `store.ts` (reducer and middleware).
    - Mutations: `createNote` (`POST v1/notes`), `setNoteRating` (`PUT v1/notes/:noteId/rating`) and `deleteNote` (`DELETE v1/notes/:noteId`).
    - Hooks: `useCreateNoteMutation`, `useSetNoteRatingMutation` and `useDeleteNoteMutation`.
  - `types/notes.types.ts`: `CreateNoteParams { body }`, `SetNoteRatingParams { noteId; body }` and `DeleteNoteParams { noteId }`.
- **The feed cache rule still holds.** The `notesApi` mutations never invalidate or refetch the feed. In `onQueryStarted` they patch it with `feedApiEndpoints.util.updateQueryData('feed', { pageSize: FEED_PAGE_SIZE }, …)`, imported from `features/feed`:
  - rating: set `item.rating`;
  - delete: `removeFeedItem`;
  - create: no patch, as today.
- `feedApi` keeps only the `feed` infinite query.
- **Feed components stay in `features/feed`** with their current names (`FeedNoteInput`, `DeleteFeedNoteDialog`, `FeedRating`, `useBatchedRating`, `useHoldRepeat`). They switch to the `notes` hooks and use `noteId`.
- The web `FEED_NOTE_MAX_LENGTH` and `FEED_RATING_*` constants stay in `feed.constants.ts`.

### 4.4 Feed UI

- `TextWithLinks` moves from inbox to `features/feed/components/TextWithLinks.tsx`, and `URL_REGEX` moves to `features/feed/const/feed.constants.ts`.
- `FeedItem` header: the time only. The chat title and the `·` are removed.
- **`FeedEmpty`** (Q14):
  - title "No notes yet";
  - text "Write your first note above.";
  - no button. The unused `Link` and `Button` imports are removed, and the `Newspaper` icon stays.
- `FeedNoteInput`: drop the "copy of the inbox MessageInput, creates chat-less notes" comment.

### 4.5 Removed

- `features/inbox/**`, together with its route, nav item and store wiring (`chatsApi`, `messagesApi`, `resolvedMessagesApi`, `chatsSlice`).
- **Made unused by this refactor** (Q23):
  - shadcn: `ui/combobox`, `ui/input-group`, `ui/context-menu`, `ui/toggle-group`, `ui/toggle`, `ui/chart`;
  - `shared/components/ConditionalWrapper.tsx`, `shared/hooks/useDebouncedValue.ts`, `shared/types/api.ts`;
  - in `date.util.ts`: `isOnDifferentDay`, `getReadableDate`, `getBrowserTimezone`, `formatCalendarDay`, `formatDuration`;
  - deps `recharts` and `@base-ui/react`;
  - the eslint overrides for `toggle-group.tsx` and `chart.tsx`;
  - the `--chart-*` / `--color-chart-*` tokens in `index.css`.
- **Already dead before this refactor** (Q16, web only):
  - `formatRelativeTime` in `features/feed/utils/feed.utils.ts`;
  - `shared/utils/numbers.utils.ts`;
  - `isMoreThanOneDayApart` and `shared/const/date.const.ts`;
  - `AppDispatch` in `store.ts`;
  - `src/assets/{hero.png,react.svg,vite.svg}`.
- **Kept:** `RootState` (Q17), and every dependency, component and helper listed as still used in `1__analysis.md` §2.4.5.

---

## 5. Naming rule (D2, Q15)

- No "message", "chat", "inbox" or "resolve/resolution" in **domain** naming. That covers Prisma models, tables, columns, enums, routes, route params, DTOs, types, variables, functions, files, comments and UI copy.
- **Excluded:**
  - the `{ message, data }` response envelope (`BaseSuccessResponse.message`);
  - Nest error `message` fields;
  - the class-validator `{ message }` option;
  - `useDisplayErrorToast` reading `error.data.message`;
  - `prisma/migrations/**` (history);
  - `brainstorm/**`;
  - the sonner/toast and other library APIs.
- **Check:** `rg -i "message|chat|inbox|resol" apps packages --glob '!**/migrations/**' --glob '!**/node_modules/**' --glob '!**/generated/**' --glob '!**/dist/**'`. Every hit that's left must fall under an exclusion.

---

## 6. Files outside the app code

| Item                                                           | Decision                              |
| -------------------------------------------------------------- | ------------------------------------- |
| `apps/api/sql/backfills/2026102501__delete-resolved-notes.sql` | **New** (Q1), run by hand on prod     |
| `apps/api/sql/backfills/2026102401__messages-user-id.sql`      | Delete (Q19), already applied on prod |
| `apps/api/sql/seeds/2026091401__seed.sql`                      | Delete (Q18)                          |
| `apps/api/sql/performance/*.md`                                | Delete (Q22)                          |
| `scripts/transform-{chats,messages}-to-user-actions.js`        | Delete (Q20)                          |
| `brainstorm/**` (older folders)                                | Keep, as history                      |
| `apps/api/src/prisma/DEV__prisma.service.ts`                   | Keep                                  |
| `CLAUDE.md`                                                    | Update (Q24). No `CONTEXT.md`         |
| Mongo `user_actions` collection                                | Leave (Q21)                           |
| API `pg` dep, undeclared `dotenv`, `ENABLE_SQL_LOGGING`        | Out of scope (Q16)                    |

---

## 7. Process (Q26, Q28)

- **Git:**
  - all work happens on one branch, `157-refactor-messages-to-notes`, with **one commit per task**;
  - one PR, squash-merged.
- **Every task leaves the repo green:** `pnpm --filter api exec prisma generate && pnpm build && pnpm lint`.
- **Release:** a manual runbook, run by the owner. It's in `3__implementation-plan.md` §Ops. One maintenance window, short downtime accepted:
  1. `pg_dump`;
  2. the delete-resolved SQL;
  3. `db:migrate:prod`;
  4. the new API image;
  5. the web deploy;
  6. a hard refresh.

---

## 8. Acceptance criteria

1. **Schema:** Postgres has only `users`, `notes` and `text_notes` (plus `_prisma_migrations`), and the enum `note_type`. All constraint and index names match Prisma's defaults. `migrate dev` reports no drift.
2. **Data:** local migration of the current data loses no unresolved notes. `count(notes)` = old `count(messages)` − deleted resolved notes, `count(text_notes)` = `count(notes)`, and `notes.user_id IS NULL` = 0.
3. **API routes:** Swagger lists only `health`, `auth`, `v1/feed` (GET), `v1/notes` (POST, PUT rating, DELETE) and `v1/stats/notes/totals`.
4. **Notes behaviour:**
   - `POST/PUT/DELETE v1/notes…` behave like the old `v1/feed/notes…` did;
   - another user's note → 403.
5. **Feed and stats:**
   - `GET v1/feed` pages through all of the user's notes, in the same order as before;
   - `GET v1/stats/notes/totals` returns `{ total }`, equal to the feed `total`.
6. **Web navigation:**
   - after login the user lands on `/feed`;
   - the sidebar shows Feed and then Dashboard;
   - `/inbox` → 404.
7. **Web feed:**
   - load, infinite scroll, create, rate (including press and hold) and delete all work;
   - card headers show the time only;
   - the empty state reads "No notes yet".
8. **Web dashboard:** shows one "Total notes" card.
9. **Clean-up:**
   - the naming check (§5) is clean;
   - `recharts` and `@base-ui/react` are gone from `apps/web/package.json` and the lockfile;
   - `CLAUDE.md` describes the new model.
10. **Mongo:** `performance_events` still receives events.
