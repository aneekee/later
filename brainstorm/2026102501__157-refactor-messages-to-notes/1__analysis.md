# #157 refactor-messages-to-notes: analysis

- **Input:** `0__init.md` in this folder.
- **Research:** a read-only pass over `apps/api`, `apps/web`, `packages/types`, `apps/api/sql`, `scripts/`, `CLAUDE.md` and the earlier brainstorm folders. Done on 2026-10-25, on branch `157-refactor-messages-to-notes` at `5a5ed62`. Nothing was run (no build, tests or DB queries).
- **Next:** grill §6, write `2__requirements-and-plan.md`, then plan the subtasks using §5.
- **IDs:** G = gap, R = risk, C = coupling, Q = question. Use them to refer to items in grilling and planning.

## TL;DR

- **Little code coupling.**
  - API: `src/feed` imports nothing from `messages`, `chats` or `user-actions`. Only `src/app.module.ts` wires those three modules in.
  - Web: inbox is imported only by `App.tsx`, `store.ts` and `features/feed/components/FeedItem.tsx` (`TextWithLinks`).
- **The data is the hard part:**
  1. **Resolved notes come back.** Dropping `message_resolutions` puts every resolved note back in the feed. The ones never seen (`seen_at IS NULL`) go straight to the top, because of `ASC NULLS FIRST`. → Q1
  2. **`messages.user_id` is still nullable.** Notes from before #145 may have an owner only through their chat. Dropping `chat_id` before a backfill and `NOT NULL` orphans them: they become invisible and can't be deleted. → Q4
  3. **The rename can lose data.** If you rename a model and change its `@@map`, `prisma migrate dev` generates `DROP TABLE` + `CREATE TABLE`. The migration must be created with `--create-only` and use hand-written `RENAME`s, including the constraint and index names. → R1
  4. **Raw SQL isn't type-checked.** Feed and stats name tables as SQL strings, so `tsc` won't catch a leftover `messages`, `chats` or `message_resolutions`. It fails at runtime. → R6
- **Stats don't use Mongo or user actions.** `CLAUDE.md` says they do, which is wrong. The stats SQL joins `chats`, so notes created in the feed aren't counted today. The new count must go by `user_id`.
- **Mongo stays,** because `PerformanceInterceptor` and performance analytics need it. Only the `user_actions` code and collection go.
- **Dependencies:**
  - API: none becomes unused.
  - Web: `recharts` and `@base-ui/react` become unused, along with 6 shadcn components and a few shared helpers (§2.4.5).

---

## 1. Scope decided in `0__init.md`

| #   | Decision                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Rename the Prisma model `Message`→`Note` (`messages`→`notes`), `TextMessage`→`TextNote` (`text_messages`→`text_notes`) and the enum `MessageType`→`NoteType` (`message_type`→`note_type`). The `type` column and the separate text table stay. |
| D2  | No "message" or "chat" naming anywhere, only "notes". (How far this goes is Q15.)                                                                                                                                                              |
| D3  | Delete the `Chat` model and the `chats` table, and remove `chatId` from the note.                                                                                                                                                              |
| D4  | Delete `apps/api/src/messages`, `apps/api/src/chats` and `apps/web/src/features/inbox`.                                                                                                                                                        |
| D5  | Keep only "current number of notes" in `apps/api/src/stats` and `apps/web/src/features/home`; it gets extended later.                                                                                                                          |
| D6  | Delete the `MessageResolution` model, its table and all resolution logic.                                                                                                                                                                      |
| D7  | Delete `apps/api/src/user-actions`.                                                                                                                                                                                                            |
| D8  | Remove unused shared types from `packages/types`, and check which libs and shared components become unused.                                                                                                                                    |
| D9  | Subtasks should be implementable one by one, by subagents or by hand.                                                                                                                                                                          |

---

## 2. Current state (facts)

### 2.1 Data model: `apps/api/prisma/schema.prisma`

| Model (table)                               | Fields that matter                                                                                     | Relations / indexes                                                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User` (`users`)                            | id, username, password, isVerified, createdAt                                                          | `chats Chat[]`, `messages Message[]`                                                                                                                                             |
| `Chat` (`chats`)                            | id, `userId` (NOT NULL), title, createdAt                                                              | `user` (no onDelete → RESTRICT); `@@index([userId])`                                                                                                                             |
| enum `MessageType` (`message_type`)         | `TEXT` only                                                                                            | —                                                                                                                                                                                |
| `Message` (`messages`)                      | id, `type`, **`chatId String?`**, **`userId String?`**, createdAt, `seenAt?`, `rating Int @default(0)` | `chat` (Cascade), `user` (Cascade), `textMessage TextMessage?`, `messageResolution MessageResolution?`; indexes `[chatId, createdAt]`, `[seenAt, createdAt]`, `[userId, seenAt]` |
| `TextMessage` (`text_messages`)             | id, **`messageId`** (`message_id`, unique), content                                                    | `message` (Cascade)                                                                                                                                                              |
| `MessageResolution` (`message_resolutions`) | id, `messageId` (unique), **`note String?`** (the resolution comment), createdAt                       | `message` (Cascade)                                                                                                                                                              |

**Migration history that matters here:**

- `20261024175341_add_message_user_id` (#145):
  - adds a nullable `user_id` with an FK to `users` (`ON DELETE CASCADE`) and the index `messages_user_id_seen_at_idx`;
  - makes `chat_id` nullable.
- `apps/api/sql/backfills/2026102401__messages-user-id.sql`:
  - a manual, idempotent `UPDATE messages SET user_id = chats.user_id … WHERE user_id IS NULL`;
  - **the repo doesn't record whether it ran on prod** (Q25).
- `20261010150813`: `messages.chat_id` has `ON DELETE CASCADE`, so deleting a chat row deletes its notes.
- `20261011184716`: `seen_at` was added as NULL for every existing row. Notes never served by the feed still have `seen_at IS NULL`.
- **Earlier intent** (#145 `1__requirements-and-plan.md`): "make `user_id` required and drop chats later". This refactor is that "later".

### 2.2 DB object names the new migration has to handle

These are the live names after all migrations. Prisma derives the expected names from table and column names, so anything not renamed shows up as drift.

**Rename** (use `ALTER … RENAME`, never DROP/CREATE):

| Now                               | Becomes                                         |
| --------------------------------- | ----------------------------------------------- |
| table `messages`                  | `notes`                                         |
| `messages_pkey`                   | `notes_pkey`                                    |
| `messages_user_id_fkey`           | `notes_user_id_fkey`                            |
| `messages_user_id_seen_at_idx`    | `notes_user_id_seen_at_idx`                     |
| `messages_seen_at_created_at_idx` | `notes_seen_at_created_at_idx`, or drop it (Q8) |
| table `text_messages`             | `text_notes`                                    |
| `text_messages_pkey`              | `text_notes_pkey`                               |
| column `text_messages.message_id` | `note_id` (Q6)                                  |
| `text_messages_message_id_key`    | `text_notes_note_id_key`                        |
| `text_messages_message_id_fkey`   | `text_notes_note_id_fkey`                       |
| enum type `message_type`          | `note_type` (`ALTER TYPE … RENAME TO`)          |

**Drop:**

- `messages.chat_id`, together with `messages_chat_id_fkey` and `messages_chat_id_created_at_idx`;
- the table `chats`, with `chats_pkey`, `chats_user_id_fkey` and `chats_user_id_idx`;
- the table `message_resolutions`, with `message_resolutions_pkey`, `message_resolutions_message_id_key` and `message_resolutions_message_id_fkey`.

**Unchanged:** `users_pkey`, `users_username_key`.

### 2.3 API (`apps/api/src`)

#### 2.3.1 Module wiring

- **`app.module.ts`** imports `ChatsModule` (lines 10/25), `MessagesModule` (11/26) and `UserActionsModule` (15/29). These are the **only** imports of those three folders from outside them.
- **Inside the three folders:**
  - `messages.module` imports `ChatsModule` and `UserActionsModule`;
  - `chats.module` imports `UserActionsModule`;
  - `UserActionsService.record` is called only from `messages.service.ts` (lines 174, 235, 289) and `chats.service.ts` (line 102).
- **Users and auth:** `register` creates no default chat, and `UsersService` has no chat or message references. The only links are the `User.chats` and `User.messages` relation fields.
- **Already dead route:** `PUT v1/chats/:chatId/messages/:messageId/rating` has no web caller since #145. It's deleted with the folder anyway.

#### 2.3.2 Feed (`src/feed`): survives; every message/chat reference

- **`feed.controller.ts`:**
  - `@Put('notes/:messageId/rating')` (71) and `@Delete('notes/:messageId')` (91), with `@Param('messageId')` at 74 and 94.
  - Renaming the param to `:noteId` doesn't change the URL contract.
- **`feed.service.ts`:**
  - `prismaService.message.*` at 26, 52, 59, 64, 80, 105 and 118.
  - Raw SQL `SELECT m.id FROM messages m` (44).
  - `chatId: null` (84) and `textMessage: { create }` (86).
  - Local names `message`, `messages`, `messageById` and `orderedMessages`.
  - The comment "Creates a chat-less note" (76).
- **`feed.types.ts`:** `messageId` in the access-check, rating and delete service DTOs (7, 17, 23). `DbFeedItem` has `chatId`, `textMessage` and `chat: { title } | null` (27–34).
- **`feed.utils.ts`:**
  - `FEED_ITEM_SELECT` selects `chatId`, `textMessage` and `chat.title`, typed `satisfies Prisma.MessageSelect`.
  - `buildFeedWhere` returns `Prisma.MessageWhereInput` with **`messageResolution: { is: null }`** (23–28).
  - `buildFeedWhereSql` has **`NOT EXISTS (SELECT 1 FROM message_resolutions r WHERE r.message_id = m.id)`** (35–40), with the comment "Expects `messages m`".
  - `mapToFeedItem` outputs `chatId` and `chatTitle` (64–65).
  - `buildFeedOrderSql` doesn't use resolutions: `seen_at − rating·1h ASC NULLS FIRST, rating DESC, created_at, id`. Only the **filter** and **`total`** depend on resolutions.
- **`feed.dto.ts` and `feed.constants.ts`** are clean.

#### 2.3.3 Stats (`src/stats`): to be cut down

- **Raw `$queryRaw` (Postgres) only.** No Mongo, no user actions; #132 says so explicitly. `CLAUDE.md:55` claims the opposite.
- **`GET v1/stats/notes/totals`** returns `NotesTotals { total, resolved, unresolved, periods[] }`.
  - The main query is `FROM messages m JOIN chats c … LEFT JOIN message_resolutions mr … WHERE c.user_id = $1` (`stats.service.ts:28-35`).
  - Two more CTE queries compute deltas, average and median gaps per 1/7/30 days (59–65, 84–90), using the same joins.
- **`GET v1/stats/notes/burndown?timezone=`** returns 90 days of cumulative created and resolved counts (153–193), using the same joins.
- **The join on `chats` leaves out every note created in the feed** (`chat_id NULL`). This is the known gap from #145.
- **What stays:** one count, e.g. `prisma.note.count({ where: { userId } })`. Once resolutions are gone, this equals the feed's `total`.
- **Files that end up with no users:** `stats.const.ts` and `stats.dto.ts` (burndown only), plus most of `stats.types.ts`.

#### 2.3.4 Mongo

- **Still required.** `MongoModule` calls `getOrThrow('MONGODB_URI')`.
  - `PerformanceAnalyticsModule` owns the `performance_events` collection.
  - The global `PerformanceInterceptor` writes one event per request.
- **After user-actions is removed:**
  - The `user_actions` collection stays in the database with its old documents (Q21).
  - Earlier notes in #104 said "MongoDB is going away", but that's not part of #157.

#### 2.3.5 Other API leftovers

- **`src/shared/utils/prisma.utils.ts`** (`isRecordNotFoundError`, `isUniqueConstraintError`): only `chats.service.ts` and `messages.service.ts` use it, so it becomes dead.
- **`src/prisma/*`** (including `DEV__prisma.service.ts`): no message or chat code.
- **Dependencies:** none becomes unused.
  - `class-transformer`, `class-validator`, `@nestjs/swagger`, `mongoose`/`@nestjs/mongoose`, `bcrypt`, `@nestjs/jwt`, `cookie-parser`, `rxjs` and `@prisma/adapter-pg` are all still used.
  - Pre-existing, outside this refactor: `pg` is never imported directly, and `prisma.config.ts` imports an undeclared `dotenv`.
- **Swagger:** there are no `@ApiTags` or `@ApiOperation` decorators. No surviving `@ApiProperty` description, log line or response string mentions message or chat.
- **Tests:**
  - The specs in the three deleted folders are boilerplate ("should be defined") and go with the folders.
  - The other specs are boilerplate too and probably already fail: jest has no `moduleNameMapper` for the `src/*` and `generated/*` aliases.
  - `test/app.e2e-spec.ts` boots the whole `AppModule`, so it needs Postgres and Mongo.
  - CI doesn't run tests.

### 2.4 Web (`apps/web/src`)

#### 2.4.1 Wiring

- **`App.tsx`:** the lazy `InboxPage` (15–19) and `<Route path="/inbox">` (50). There's no index route; `/` → Home and `/feed` → Feed.
  - Login navigates to `/`.
  - `*` → a bare 404 page outside the layout, with no link back.
- **`store.ts`:** `chatsApi`, `messagesApi`, `resolvedMessagesApi` and `chatsSlice` (imports 4–6 and 9, reducers 15–17 and 22, middleware 27–29).
  - `RootState` is used only by `inbox/selectors/chats.selectors.ts`.
  - `AppDispatch` is already unused (`// TODO: do I really need it?`).
- **`widgets/AppSidebar.tsx`:** the Inbox nav item (line 20) and the `InboxIcon` import (line 2).
- **Auth:** no chat or message dependencies. There's no `resetApiState` on logout.
- **Inbox-only state, gone with the folder:** the `chats` slice (`activeChat`), the `?chatId=` query string on `/inbox` (with the sentinel `RESOLVED_NOTES_CHAT`), and cache invalidation between the three inbox APIs. No localStorage or sessionStorage is used.

#### 2.4.2 Feed → inbox coupling (**blocker for deleting inbox**)

- `features/feed/components/FeedItem.tsx:6` imports `TextWithLinks` from `features/inbox/components/messages/TextWithLinks.tsx`.
- `TextWithLinks` imports `URL_REGEX` from `features/inbox/const/message.constants.ts:3`: `/https?:\/\/[^\s]+/g`.
- Both have to move out of inbox first (Q-minor: to `features/feed` or to `shared/components`).

#### 2.4.3 Message/chat wording in the feed

- **`messageId`:**
  - `types/feed.types.ts:15,20`
  - `api/feed.api.ts:81,100,120,133`
  - `utils/feed.utils.ts:26,33`
  - `DeleteFeedNoteDialog.tsx:45`
  - `hooks/useBatchedRating.ts:49`
- **`chatTitle`:** the card header in `FeedItem.tsx:33-39` (title + `·`). `chatId` is never read on the web.
- **`FeedNoteInput.tsx:13`:** the comment "A copy of the inbox MessageInput, creates chat-less notes."
- **`FeedEmpty.tsx`:** "Nothing to revisit / Your inbox is clear." plus `<Link to="/inbox">Go to inbox</Link>`. After the refactor that link goes to the 404 page (Q14).
- **Feed pagination:** `getNextPageParam` returns a next page when `total > items.length`. `total` was the unresolved count; afterwards it's all of the user's notes, and the logic still works.

#### 2.4.4 Home (`features/home`): what stays

| File                                                                          | Today                                                                                    | After D5                                               |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `pages/Home.page.tsx`                                                         | `NotesStatsContainer` + `NotesBurndownContainer`                                         | `NotesStatsContainer` only                             |
| `api/stats.api.ts`                                                            | `notesTotals` + `notesBurndown`, tags `NotesTotals`/`NotesBurndown`                      | `notesTotals` only                                     |
| `components/NotesStats/NotesStatsContainer.tsx`                               | 3 cards: Total, Unresolved, Resolved, with period details; 3-column grid and 3 skeletons | 1 card, "Total notes"; fix the grid and skeleton count |
| `components/NotesStats/NotesStatsCard.tsx`                                    | label, value and icon, plus optional `details` (chips, gaps)                             | drop `details` and `renderGap`                         |
| `components/NotesStats/NotesStatsCardChip.tsx`, `NotesStatsCardChipBlock.tsx` | chips                                                                                    | delete                                                 |
| `components/NotesBurndown/*` (2 files)                                        | recharts burndown                                                                        | delete                                                 |
| `components/StatsError.tsx`                                                   | error with retry                                                                         | keep                                                   |
| `utils/stats.utils.ts`, `types/stats.types.ts`                                | period and delta helpers, burndown params                                                | delete both                                            |

#### 2.4.5 Shared code and dependencies that become unused

Assumes inbox is deleted and home is reduced as in the table above.

- **shadcn UI (`shared/components/ui`):**
  - `combobox.tsx`, `input-group.tsx` (used only by combobox), `context-menu.tsx`, `toggle-group.tsx`, `toggle.tsx` (used only by toggle-group);
  - `chart.tsx` (burndown only).
- **Shared components and hooks:** `shared/components/ConditionalWrapper.tsx`, `shared/hooks/useDebouncedValue.ts`.
- **Shared types:** `shared/types/api.ts` (`BasePaginationParams`, inbox only). The folder ends up empty.
- **`shared/utils/date.util.ts`:**
  - Keep `formatIsoDate`, `formatIsoTime` and `formatIsoDateTime` (`FeedItem`).
  - Drop `isOnDifferentDay` and `getReadableDate` (inbox), `getBrowserTimezone` and `formatCalendarDay` (burndown), and `formatDuration` (stat card details).
- **`package.json`:** `recharts` (only `ui/chart.tsx` and the burndown) and `@base-ui/react` (only `ui/combobox.tsx`).
- **`eslint.config.js`:** the overrides for `src/shared/components/ui/toggle-group.tsx` (lines ~67–72) and `src/shared/components/ui/chart.tsx` (~73–82) go stale.
- **`index.css`:** the `--chart-1..5` / `--color-chart-*` tokens are only used by the burndown. They're standard shadcn tokens, so removing them is optional.
- **Still used:**
  - `react-hook-form`, `zod` and `@hookform/resolvers` (login form);
  - `react-redux` (`Provider` only);
  - `radix-ui` (dialog, label, separator, sheet, dropdown, tooltip, Slot);
  - `FormInput`, `ui/field` and `ui/label` (login);
  - `ui/textarea` (`FeedNoteInput`), `ui/card`, `ui/dialog`, `ui/spinner`, `ui/skeleton`, `ui/sidebar` and its dependencies.

**Already dead before this refactor** (Q16):

- `features/feed/utils/feed.utils.ts` `formatRelativeTime` (no callers);
- `shared/utils/numbers.utils.ts` (`clamp`);
- `date.util.ts` `isMoreThanOneDayApart`, and with it `shared/const/date.const.ts`;
- `store.ts` `AppDispatch`;
- `src/assets/{hero.png,react.svg,vite.svg}`.

### 2.5 Shared types (`packages/types`)

- **Package setup:** `exports` → `src/index.ts`. The package holds types only (its build emits declarations only), so constants are duplicated in the API and the web. It has no lint or check-types script. `dist/` is stale and gitignored, and is wiped by `prebuild`.
- **Delete entirely:**
  - `chats.ts`: every export is used only by `api/src/chats` and `web/features/inbox`.
  - `messages.ts`: every export is used only by `api/src/messages` and `web/features/inbox`. That includes `MessageType`, which duplicates the Prisma enum; the feed uses the Prisma literal `'TEXT'`.
  - The `index.ts` re-exports of both files.
- **`shared.ts`:**
  - `SuccessListResponse`: only chats.ts and messages.ts use it → delete.
  - `BaseSuccessResponse`: stays.
- **`stats.ts`:**
  - Delete `NotesGap`, `NotesPeriodStats`, `NotesBurndownPoint` and `GetNotesBurndownSuccessResponse`.
  - Shrink `NotesTotals` to `{ total }`.
  - Keep `GetNotesTotalsSuccessResponse`.
- **`feed.ts`:**
  - Remove `FeedItemEntity.chatId` and `chatTitle`.
  - Everything else stays.
  - `FeedPage` and `FeedNoteRatingEntity` are only used inside the package, as parts of response types. That's fine.
- **`auth.ts`:** unchanged.

### 2.6 Outside the code

- **`CLAUDE.md` lines that go stale:**
  - 7: "built around chats… resolve notes… how fast notes are created and resolved"
  - 35: the example `src/chats/chats.service.spec.ts`
  - 48: `SuccessListResponse`
  - 52: `ChatsService.checkAccess` / `MessagesService.checkAccess`. These names are already wrong today; the only check left is `FeedService.checkNoteAccess`.
  - 53: the table list and "a note is a `Message` with a `TextMessage`"
  - 55: user actions, already false today
  - 57: `sql/seeds`
  - 62: `slices` and `selectors`, which only inbox has
- **`apps/api/sql/seeds/2026091401__seed.sql`:** a load-test seed (1k users, 50k chats, 2M messages, ~30% resolved). It writes to `chats`, `messages` (without `user_id`), `text_messages` and `message_resolutions`, so it breaks after the refactor (Q18).
- **`apps/api/sql/backfills/2026102401__messages-user-id.sql`:** can't run once `chats` is gone (Q19).
- **`apps/api/sql/performance/*.md`:** historical write-ups about the chat and message endpoints (Q22).
- **`scripts/transform-chats-to-user-actions.js` and `scripts/transform-messages-to-user-actions.js`** (tracked): obsolete. `scripts/transform-performance-events.js` stays.
- **`apps/api/docker-compose.yaml`:** the Mongo service stays.
- **Gitignored local leftovers (no action needed):**
  - `apps/api/dumps/2026-06-04/{chats,messages,text_messages,message_resolutions,users}.json`
  - `apps/api/logs/prisma-queries.log`
  - `apps/api/generated/prisma`: regenerate it, and delete the folder first so stale model files don't linger.
- **No domain glossary:** there's no `CONTEXT.md`, ADR or `docs/` folder. The only glossary text is in `CLAUDE.md` (lines 7 and 53).
- **Deploy facts:**
  - API: a Docker image built and run by hand (`scripts/build.sh` and `run.sh`, `Dockerfile.prod`). **The image doesn't run migrations.**
  - Prod migrations: `pnpm --filter api db:migrate:prod` (`prisma migrate deploy` with `.env.production.local`), run by hand.
  - Web: Vercel, with an SPA rewrite.

---

## 3. Gaps: what `0__init.md` doesn't mention

| ID  | Gap                                                                                                                                                                                                                 | Where                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| G1  | Feed imports `TextWithLinks` and `URL_REGEX` from inbox. Move them before deleting inbox.                                                                                                                           | `web/features/feed/components/FeedItem.tsx:6`         |
| G2  | The feed empty state talks about the inbox and links to `/inbox`.                                                                                                                                                   | `web/features/feed/components/FeedEmpty.tsx`          |
| G3  | The feed filters out resolved notes in two places that must stay in sync (Prisma and raw SQL). Both must change in the same release that drops the table, and `total` changes meaning from unresolved to all notes. | `api/feed/feed.utils.ts:23-41`                        |
| G4  | Stats join `chats` and filter by `c.user_id`. They have to switch to `user_id`, which also fixes the #145 gap where feed notes aren't counted.                                                                      | `api/stats/stats.service.ts`                          |
| G5  | `user_id` is nullable and the backfill was manual. It needs a backfill inside the migration, a check, and `NOT NULL` **before** `chat_id` and `chats` are dropped.                                                  | schema, migration                                     |
| G6  | A rename through Prisma becomes DROP/CREATE. Constraint, index and enum names must be renamed too (§2.2).                                                                                                           | migration                                             |
| G7  | Renaming goes beyond the three models. The full list is below this table.                                                                                                                                           | schema, feed, stats                                   |
| G8  | `FeedItemEntity.chatId` and `chatTitle` are a contract between the API, the shared types and the web card header.                                                                                                   | `types/feed.ts:7-8`, `api/feed/*`, `web/FeedItem.tsx` |
| G9  | `messageId` naming in the feed route params, DTOs and web params, plus the "chat-less" and "inbox MessageInput" comments.                                                                                           | §2.3.2, §2.4.3                                        |
| G10 | Web wiring: the route, the sidebar item, the store (3 APIs + 1 slice), and `RootState`, which only inbox uses.                                                                                                      | `App.tsx`, `store.ts`, `AppSidebar.tsx`               |
| G11 | The API helper `shared/utils/prisma.utils.ts` becomes dead code.                                                                                                                                                    | API                                                   |
| G12 | Unused web components, helpers and dependencies, plus the stale eslint overrides.                                                                                                                                   | §2.4.5                                                |
| G13 | The seed, the backfill and the two transform scripts go stale.                                                                                                                                                      | §2.6                                                  |
| G14 | The Mongo `user_actions` collection keeps its data after the code is gone.                                                                                                                                          | Mongo                                                 |
| G15 | `CLAUDE.md` goes stale, and line 55 is already wrong.                                                                                                                                                               | §2.6                                                  |
| G16 | `messages_seen_at_created_at_idx` has probably been unused since #145, when the feed started filtering by `user_id`. Decide whether to drop it while renaming.                                                      | Q8                                                    |
| G17 | Deploy order and version skew. Contracts change in three places (DB, API, web); prod migrations and the API image are manual, and the web deploys on its own.                                                       | R7, R8, Q26                                           |
| G18 | No backup step. Dropping `chats` and `message_resolutions` can't be undone, and Prisma has no down migrations.                                                                                                      | R2, Q26                                               |
| G19 | The 404 page has no way back, and old `/inbox` bookmarks land there.                                                                                                                                                | Q13                                                   |
| G20 | Home with a single card still has a 3-column grid and 3 skeletons.                                                                                                                                                  | `NotesStatsContainer.tsx`                             |
| G21 | The "no message wording" rule collides with the `{ message, data }` response envelope, Nest's error `message`, and class-validator's `{ message }` option. Exclude them explicitly.                                 | Q15                                                   |

**G7 rename list:**

- `User.messages` → `notes`, and `User.chats` is removed.
- The relation fields `textMessage` → `textNote` and `TextNote.message` → `note`.
- The column `message_id` → `note_id`.
- The Prisma client: delegate `prisma.message` → `prisma.note`, and the types `Prisma.MessageSelect` / `MessageWhereInput` → `Note*`.
- The SQL alias `m` and the local names `message` and `messages`.

---

## 4. Risks

| ID  | Risk                                                                                                                                 | Impact                                                                                                                                          | Mitigation                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `prisma migrate dev` generates DROP/CREATE for the renamed models                                                                    | **All notes lost**                                                                                                                              | Use `migrate dev --create-only` and replace the SQL with `ALTER TABLE/INDEX/TYPE … RENAME`. Then run `pnpm db:migrate:local` again: it must find **no** schema changes, i.e. no drift. Rehearse on a local restore of a prod dump. |
| R2  | Dropping `chats` and `message_resolutions` can't be undone                                                                           | Chat titles and resolution comments are lost for good                                                                                           | Run `pg_dump` (or the JSON dumps, as in `apps/api/dumps/`) before `db:migrate:prod`.                                                                                                                                               |
| R3  | Notes with `user_id IS NULL` when `chat_id` is dropped                                                                               | They become invisible in the feed and can't be rated or deleted (`checkNoteAccess` filters on `userId`)                                         | Inside the migration: run the backfill `UPDATE`, abort if any NULLs remain, then `SET NOT NULL`, then drop `chat_id` and `chats`.                                                                                                  |
| R4  | Resolved notes come back into the feed; the never-seen ones go to the top                                                            | The feed fills with notes that were already "done"                                                                                              | Decide in Q1. Measure first with the pre-flight queries in §7.                                                                                                                                                                     |
| R5  | Losing the chat title, which is the note's context in the feed card                                                                  | Notes like "call him" lose their meaning                                                                                                        | Decide in Q2.                                                                                                                                                                                                                      |
| R6  | Raw SQL with table names as strings in `feed.service.ts`, `feed.utils.ts` and `stats.service.ts`                                     | `tsc` and lint pass, but it fails at **runtime**                                                                                                | Grep for `messages`, `message_resolutions`, `chats`, `text_messages` and the alias `m.` in the raw SQL; hit the feed and stats endpoints by hand after each step.                                                                  |
| R7  | Version skew: old web against the new API                                                                                            | The old Home crashes on the new `NotesTotals` (`periods` is undefined). The old inbox gets 404s. The old feed card shows an empty title and `·` | Deploy the web right after the API and hard-refresh. Acceptable for a single-user app (Q26).                                                                                                                                       |
| R8  | Migration timing: the old API container keeps running against renamed or dropped tables (or the new API runs against the old schema) | 500s until both sides match                                                                                                                     | Do it in one maintenance window: backup → migrate → deploy the new API image → deploy the web.                                                                                                                                     |
| R9  | A step that leaves the build broken                                                                                                  | A subagent session can't verify its work                                                                                                        | Follow the coupling rules in §5. Every subtask must leave `prisma generate && pnpm build && pnpm lint` green.                                                                                                                      |
| R10 | The naming sweep goes too far (Q15)                                                                                                  | The response envelope or error toasts break (`useDisplayErrorToast` reads `error.data.message`)                                                 | Exclude the envelope, error `message` and validator `{ message }` explicitly.                                                                                                                                                      |
| R11 | Removing Mongo along with user-actions                                                                                               | The API won't boot (`MONGODB_URI` is `getOrThrow`, and the interceptor is global)                                                               | Keep `MongoModule`, `PerformanceAnalyticsModule` and the interceptor.                                                                                                                                                              |
| R12 | Deleted shadcn components are needed again later                                                                                     | Small re-add cost                                                                                                                               | Re-add with `shadcn add`, then fix the bogus `cn` import (a known quirk).                                                                                                                                                          |
| R13 | Hand-written constraint names that differ from Prisma's defaults                                                                     | `migrate dev` keeps generating "rename constraint" migrations                                                                                   | Use Prisma's default names (§2.2), and verify with the no-drift check in R1.                                                                                                                                                       |

---

## 5. Coupling and ordering constraints (input for the planning session)

**What must land together, or in this order:**

| ID  | Constraint                                                                                                                                                                                                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Changing the Prisma schema regenerates the client, so **every** `prisma.message`, `Prisma.Message*`, `textMessage` and `messageResolution` reference must change in the same commit. Delete the `messages` and `chats` modules **before** the schema change, so they don't have to be ported. |
| C2  | Dropping `message_resolutions` requires changing, in the same release: the feed's `buildFeedWhere` and `buildFeedWhereSql`, and the stats SQL. The SQL part isn't caught at compile time (R6).                                                                                                |
| C3  | Dropping `chats` and `chat_id` requires changing: the stats SQL (join), the feed's `FEED_ITEM_SELECT` (`chat.title`), `DbFeedItem`, `mapToFeedItem`, `createNote` (`chatId: null`), `FeedItemEntity` (types) and `FeedItem.tsx` (web).                                                        |
| C4  | The renames require updating the raw SQL strings (`FROM messages m` and the stats CTEs).                                                                                                                                                                                                      |
| C5  | Deleting `chats.ts`, `messages.ts` and `SuccessListResponse` from `packages/types` only after `api/src/{messages,chats}` and `web/features/inbox` are gone.                                                                                                                                   |
| C6  | The `NotesTotals` contract: API stats, `packages/types/stats.ts` and web home change together.                                                                                                                                                                                                |
| C7  | The `FeedItemEntity` contract: API feed, `packages/types/feed.ts` and web `FeedItem.tsx` change together.                                                                                                                                                                                     |
| C8  | Deleting web inbox needs G1 (move `TextWithLinks`) done first. `App.tsx`, `store.ts`, `AppSidebar.tsx` and `FeedEmpty.tsx` change in the same step.                                                                                                                                           |
| C9  | The web cleanup of shared components and dependencies comes after deleting inbox **and** reducing home.                                                                                                                                                                                       |
| C10 | `api/shared/utils/prisma.utils.ts` is removed after the `messages` and `chats` modules.                                                                                                                                                                                                       |
| C11 | Deleting user-actions is trivial after (or together with) the `messages` and `chats` modules. Before them, it means editing those services.                                                                                                                                                   |
| C12 | To keep the **deployed app usable** at every step: remove the web inbox before or together with the API `messages` and `chats` modules. Otherwise the inbox UI 404s. In code terms the two are independent.                                                                                   |
| C13 | Stats can switch to counting by `user_id` before the schema change, since nothing in it depends on the migration. Do that before C2 and C3, so stats no longer reference `chats` or `message_resolutions` by then.                                                                            |
| C14 | `CLAUDE.md` and the ops steps (backup, prod migration, deploy, dropping Mongo `user_actions`) come last.                                                                                                                                                                                      |

**Natural seams.** These are hints for the planner, not a plan.

| Seam | Contents                                                                                                                                                                     | After                      |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| S1   | web: move `TextWithLinks` and `URL_REGEX` out of inbox; new `FeedEmpty` copy                                                                                                 | —                          |
| S2   | web: delete inbox, its route, nav item and store wiring                                                                                                                      | S1                         |
| S3   | api: delete `messages`, `chats`, `user-actions`, `shared/utils/prisma.utils.ts`, the transform scripts                                                                       | S2 (deploy usability)      |
| S4   | stats down to the count: API (by `user_id`), types, web home                                                                                                                 | —                          |
| S5   | schema A: drop resolutions, backfill, `user_id NOT NULL`, drop `chat_id` and `chats`; feed filter and select; `FeedItemEntity` without chat fields; web card header          | S3, S4                     |
| S6   | schema B: renames (Note, TextNote, NoteType, columns, constraints, indexes); Prisma client renames in feed and stats; raw SQL; the `messageId`→`noteId` sweep in API and web | S5 (or merged with S5, Q5) |
| S7   | types cleanup: `chats.ts`, `messages.ts`, `SuccessListResponse`, stats extras                                                                                                | S2, S3, S4                 |
| S8   | web cleanup: unused shadcn components, helpers, `recharts`, `@base-ui/react`, eslint overrides, chart tokens (Q16 for pre-existing dead code)                                | S2, S4                     |
| S9   | `sql/` seed rewrite or delete, backfill delete                                                                                                                               | S6                         |
| S10  | `CLAUDE.md` and an optional `CONTEXT.md`                                                                                                                                     | everything else            |
| S11  | ops: backup, `db:migrate:prod`, deploy API and web, drop Mongo `user_actions`                                                                                                | everything else            |

S1/S4, and S7/S8/S9, can run in parallel. S5 and S6 touch the same files (`schema.prisma`, `feed/*`, `stats/*`), so they run one after the other.

---

## 6. Open questions (for grilling)

The list is ordered by impact. ★ marks blockers that the plan can't be written without. Each question has a recommendation.

### Data

**Q1 ★ What happens to resolved notes?**

- Context: today a resolve means "done", and resolved notes are hidden from the feed. Dropping the table brings them back, and the never-seen ones go to the top.
- Options:
  - (a) delete resolved notes (and their `text_*` rows) in the migration;
  - (b) keep them as normal notes;
  - (c) keep them but push them to the end of the rotation by setting `seen_at = resolution.created_at`.
- **Recommendation: (a)**, after a dump. Deleting from the feed is now the "done" action. Check the counts first (§7).

**Q2 ★ What happens to chat titles?**

- Options:
  - (a) drop them;
  - (b) prepend them to the content (`[title] content`);
  - (c) move them into a new note field.
- **Recommendation: (a)**, with the dump as the archive. (c) brings the chat concept back under another name.

**Q3 What happens to the resolution comments (`message_resolutions.note`)?** They go with Q1. **Recommendation:** drop them (they're in the dump).

**Q4 ★ Make `notes.user_id` NOT NULL, with the backfill inside the migration and an abort if any NULLs remain?** **Recommendation: yes.** This is the long-term plan from #145, and the backfill is idempotent.

**Q5 How should the migrations be split?**

- Options:
  - (a) one migration;
  - (b) one for the drops and `NOT NULL` and one for the renames (S5/S6);
  - (c) one per table.
- **Recommendation: (b)**: smaller hand-checked SQL that matches the subtasks. All of them still go to prod in one `migrate deploy`.

**Q6 Rename the `text_notes.message_id` column to `note_id`, and the relation fields `textMessage`→`textNote` and `message`→`note`?** **Recommendation: yes**, as D2 implies.

**Q7 Rename the constraints and indexes to Prisma's default names (§2.2)?** **Recommendation: yes.** Otherwise there's drift (R13).

**Q8 Drop `messages_seen_at_created_at_idx` while you're at it?**

- Context: the feed filters by `user_id`, and `[userId, seenAt]` covers that.
- **Recommendation:** drop it, after `EXPLAIN` shows the feed query doesn't use it. Otherwise rename it.

**Q25 Has `2026102401__messages-user-id.sql` been run on prod?** It doesn't matter if Q4 inlines the backfill, but it tells you how many notes are at risk.

### API and contracts

**Q9 Where should the note endpoints live?**

- Options:
  - (a) stay at `v1/feed/notes/*` in the feed module;
  - (b) a new `notes` module at `v1/notes/*`, with the feed keeping only `GET v1/feed`.
- **Recommendation: (a)** for #157. The refactor is about deletion, and (b) can be its own issue.

**Q10 Rename `FeedItemEntity` (e.g. to `NoteEntity`)?** **Recommendation:** no. Only drop `chatId` and `chatTitle`; it's the feed's view model.

**Q11 What shape should the stats endpoint have?**

- Options:
  - (a) keep `GET v1/stats/notes/totals` and return `NotesTotals = { total }`;
  - (b) a new path.
- **Recommendation: (a)**, counting with `prisma.note.count({ where: { userId } })`. You plan to extend it later, so keep the object shape.

**Q15 ★ How far does "no message wording" go?**

- Context: the `{ message, data }` envelope (`BaseSuccessResponse.message`), Nest's error `message`, class-validator's `{ message }` option, and `useDisplayErrorToast`.
- **Recommendation:** out of scope. These are HTTP or library concepts, not the domain. Write that down in the requirements.

### Web and UX

**Q12 Which page is the landing page?**

- Options:
  - (a) keep `/` = Home with the single count;
  - (b) make `/feed` the landing page and keep Home as a secondary item.
- **Recommendation: (a)** for #157 (smallest change), but it's a product call.

**Q13 What happens to `/inbox`?**

- Options:
  - (a) remove it, so it goes to the 404 page;
  - (b) redirect it to `/feed`, which keeps the word in the code.
- **Recommendation: (a).** Optionally add a "Go home" link to the 404 page.

**Q14 What does the empty feed say?**

- Context: without resolutions, an empty feed means "no notes at all".
- **Recommendation:** "No notes yet" plus a hint to use the input above. No button.

**Q-minor: where does `TextWithLinks` go?**

- Options: `features/feed/components/` (its only user) or `shared/components/`.
- **Recommendation:** feed, with `URL_REGEX` in `features/feed/const/feed.constants.ts`.

**Q-minor: what does the single Home card look like?** **Recommendation:** keep `NotesStatsCard` (label, value, icon), drop `details`, use one skeleton and a narrow grid.

### Cleanup scope

**Q16 Also remove code that was dead before this refactor?**

- Web: `formatRelativeTime`, `numbers.utils.ts`, `isMoreThanOneDayApart` + `date.const.ts`, `AppDispatch`, `src/assets/*`.
- API: `pg`, the undeclared `dotenv`, the unread `ENABLE_SQL_LOGGING` env key.
- **Recommendation:** yes for the web items, since D8 asks to check unused code. Leave the API dependency and env items for another issue (runtime and config risk).

**Q17 `RootState` will only be used by inbox. Delete it or keep it as the standard RTK export?** **Recommendation:** keep `RootState` and delete `AppDispatch`.

**Q18 What happens to the load-test seed `sql/seeds/2026091401__seed.sql`?**

- Options: (a) rewrite it for `users`, `notes` (with `user_id`) and `text_notes`; (b) delete it.
- **Recommendation: (a).** It's small, and `CLAUDE.md` refers to it for SQL performance work.

**Q19 What happens to `sql/backfills/2026102401__messages-user-id.sql`?** **Recommendation:** delete it once its logic is inlined in the migration (git keeps the history).

**Q20 Delete `scripts/transform-{chats,messages}-to-user-actions.js`?** **Recommendation:** yes.

**Q21 What happens to the Mongo `user_actions` collection?** **Recommendation:** drop it by hand (local and prod) after the deploy, as a documented ops step. Keep Mongo itself (R11).

**Q22 Keep `sql/performance/*.md` and the old brainstorm folders as history?** **Recommendation:** yes, untouched.

**Q23 Delete the unused shadcn components, or keep them for later?** **Recommendation:** delete them; they can be re-added (R12).

**Q24 Update `CLAUDE.md` in this issue? Also start a `CONTEXT.md` glossary (Note, Feed, rating, seen) with the domain-modeling skill?** **Recommendation:** update `CLAUDE.md`, yes. `CONTEXT.md` is optional; it's a good moment for it, but it isn't required.

### Process

**Q26 How do you want to release it?** Is a short downtime window acceptable, given single-user use and the manual migration and Docker steps? **Recommendation:** one window: dump → `db:migrate:prod` → build and run the new API image → deploy the web → hard-refresh.

**Q27 What about the broken boilerplate specs (no `moduleNameMapper`)?** **Recommendation:** out of scope. Delete the specs that belong to deleted folders and leave the rest.

**Q28 One branch and PR with several commits, or one PR per subtask?**

- Context: the PR rules say squash-merge, named after the branch.
- **Recommendation:** one branch (`157-refactor-messages-to-notes`) with one commit per subtask, squash-merged once. That avoids deploying half-done states (R7, R8).

---

## 7. Checks

**Pre-flight queries, to answer Q1, Q4 and Q25.** Run them on prod (read-only):

```sql
SELECT count(*) AS notes, count(*) FILTER (WHERE user_id IS NULL) AS no_owner,
       count(*) FILTER (WHERE chat_id IS NULL) AS chatless
FROM messages;

SELECT count(*) AS resolved,
       count(*) FILTER (WHERE m.seen_at IS NULL) AS resolved_never_seen
FROM message_resolutions r JOIN messages m ON m.id = r.message_id;

SELECT count(*) AS chats FROM chats;
```

**After each subtask:**

- Run `pnpm --filter api exec prisma generate`, then `pnpm build` and `pnpm lint`.
  - `pnpm check-types` does nothing: no package defines that script.
- Hit `GET v1/feed`, `POST/PUT/DELETE v1/feed/notes…` and `GET v1/stats/notes/totals` by hand, because raw SQL can break at runtime (R6).

**Migration:**

- Restore a prod dump locally and run the migration.
  - Compare row counts: `notes` = old `messages` minus whatever Q1 deletes, and `text_notes` = `notes`.
  - `user_id IS NULL` = 0.
- Run `pnpm db:migrate:local` again. It must not create a new migration (no drift).

**Naming sweep:**

- `rg -i "message|chat|resol|inbox" apps packages --glob '!**/migrations/**' --glob '!**/node_modules/**'`
- The only hits left should be the exclusions agreed in Q15 and the history in Q22.

**In the browser:**

- The sidebar shows only Home and Feed. `/inbox` → 404.
- Feed: load, scroll, create, rate and delete notes. Card headers show the time only.
- Home shows one card, and its count equals the feed `total`.
- Swagger (`/api/docs`) lists only health, auth, feed and stats routes.

**Mongo:** `performance_events` still receives events.

---

## 8. Inventory

### Delete

**API** (22 tracked files in the three folders):

- `apps/api/src/messages/*`: module, controller, service, dto, types, utils, constants, 2 specs
- `apps/api/src/chats/*`: module, controller, service, dto, types, utils, 2 specs
- `apps/api/src/user-actions/*`: module, schema, service, types, spec
- `apps/api/src/shared/utils/prisma.utils.ts`
- `apps/api/src/stats/stats.const.ts` and `apps/api/src/stats/stats.dto.ts` (burndown and periods only)
- `apps/api/sql/backfills/2026102401__messages-user-id.sql` (Q19)
- `scripts/transform-chats-to-user-actions.js`, `scripts/transform-messages-to-user-actions.js` (Q20)

**Types:**

- `packages/types/src/chats.ts`, `packages/types/src/messages.ts`

**Web:**

- `apps/web/src/features/inbox/**` (52 tracked files)
- `apps/web/src/features/home/components/NotesBurndown/{NotesBurndownChart,NotesBurndownContainer}.tsx`
- `apps/web/src/features/home/components/NotesStats/{NotesStatsCardChip,NotesStatsCardChipBlock}.tsx`
- `apps/web/src/features/home/utils/stats.utils.ts`, `apps/web/src/features/home/types/stats.types.ts`
- `apps/web/src/shared/components/ui/{combobox,input-group,context-menu,toggle-group,toggle,chart}.tsx`
- `apps/web/src/shared/components/ConditionalWrapper.tsx`
- `apps/web/src/shared/hooks/useDebouncedValue.ts`
- `apps/web/src/shared/types/api.ts`
- Pre-existing dead code (Q16): `apps/web/src/shared/utils/numbers.utils.ts`, `apps/web/src/shared/const/date.const.ts`, `apps/web/src/assets/*`

### Change

**API:**

- `apps/api/src/app.module.ts`: drop 3 imports.
- `apps/api/prisma/schema.prisma`, plus new hand-edited migration(s) under `apps/api/prisma/migrations/`.
- `apps/api/src/feed/{feed.controller,feed.service,feed.types,feed.utils}.ts`
- `apps/api/src/stats/{stats.controller,stats.service,stats.types}.ts`
- `apps/api/sql/seeds/2026091401__seed.sql` (Q18)

**Types:**

- `packages/types/src/{index,shared,stats,feed}.ts`

**Web:**

- `apps/web/src/App.tsx`, `apps/web/src/store.ts`, `apps/web/src/widgets/AppSidebar.tsx`
- Feed:
  - `apps/web/src/features/feed/components/{FeedItem,FeedEmpty,FeedNoteInput,DeleteFeedNoteDialog}.tsx`
  - `apps/web/src/features/feed/{api/feed.api,types/feed.types,utils/feed.utils,hooks/useBatchedRating,const/feed.constants}.ts`
  - new: `apps/web/src/features/feed/components/TextWithLinks.tsx`
- Home:
  - `apps/web/src/features/home/{pages/Home.page,components/NotesStats/NotesStatsContainer,components/NotesStats/NotesStatsCard}.tsx`
  - `apps/web/src/features/home/api/stats.api.ts`
- Shared and config:
  - `apps/web/src/shared/utils/date.util.ts`
  - `apps/web/eslint.config.js`
  - `apps/web/package.json` (`recharts`, `@base-ui/react`), and `pnpm-lock.yaml`
  - `apps/web/src/index.css` (optional chart tokens)

**Docs:**

- `CLAUDE.md`, and an optional `CONTEXT.md`

### Keep unchanged (checked)

- **API:**
  - `auth/*`, `users/*`, `prisma/*` (including `DEV__prisma.service.ts`);
  - `mongo/*`, `performance-analytics/*`, `shared/interceptors/*`, `main.ts`;
  - `docker-compose.yaml`, `Dockerfile.prod`.
- **Web:**
  - `features/auth/*`, `widgets/AppLayout.tsx`, `shared/api/api.ts`;
  - `vercel.json`, `index.html`, `components.json`, `vite.config.ts`.
- **Repo:** `.github/workflows/ci.yaml`, `turbo.json`, root `package.json`.
