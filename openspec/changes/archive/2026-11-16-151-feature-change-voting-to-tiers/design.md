# Design

## Context

For motivation, see `proposal.md` (Why); for the observable behavior, see `specs/notes` and `specs/feed`. Here is the current state this design replaces:

- `notes.rating INT NOT NULL DEFAULT 0` (0..10000), set through `PUT v1/notes/:noteId/rating` (`SetNoteRatingDto`, `NotesService.setNoteRating`).
- The feed order is raw SQL in `apps/api/src/feed/feed.utils.ts` (`buildFeedOrderSql`): `seen_at - rating hours ASC NULLS FIRST, rating DESC, created_at ASC, id ASC`. So the rating is a staleness offset, not a sort key.
- Web:
  - `FeedItem` renders `FeedRating`: up/down buttons with press-and-hold repeat (`useHoldRepeat`).
  - `useBatchedRating` sends one debounced (600 ms), latest-value, non-overlapping request; it reverts and toasts on failure, flushes on unmount, and `cancel()` is called before delete.
  - `notesApi.setNoteRating` patches the `feed` infinite-query cache; it never refetches.
- `@later/types` holds types only. It's built with `--emitDeclarationOnly`, and the API (`nest build`, CJS) imports it only through erased type imports. So a runtime constant exported from it would compile but fail at runtime in the API.
- Design reference: Claude Design canvas "Later tier slider", https://claude.ai/artifact/9YPz1AoNAx7e4nTBL1aJC6. The artboards show the desktop feed, the mobile dark feed, the states sheet and the FeedCard component. A sticky note there holds the implementation notes. The canvas still has exploration tweaks (palette, fill, thickness); only the look chosen in Decision 12 is in scope.

## Goals / Non-Goals

**Goals:**

- One place per app that owns the tier list, so that adding F or SSS later is an enum migration plus edits the compiler forces.
- Keep the existing save behavior (debounce, latest value, no overlap, revert, cancel on delete, cache patch, no refetch), with the input changed from a delta to an absolute tier.
- Keep the shadcn Slider; change only its styling, plus a thumb-props passthrough.

**Non-Goals:**

- Changing the feed's paging, seen-marking or where filter.
- Indexing the order expression. It's already an expression today, and the data is small.
- Jest tests. The API and web changes are verified by the build gate plus curl and browser checks, the same as today; tests don't run in CI.

## Decisions

### 1. The tier is a staleness boost, not a strict sort key

The order becomes `(now() - seen_at) * factor(tier) DESC NULLS FIRST`. Every note keeps rotating, and higher tiers come back sooner. A just served note has no staleness to multiply, so it goes to the back whatever its tier.

- _Rejected: a fixed shift, `seen_at - boost(tier) ASC` (today's rule with weeks instead of hours)._ It shipped first and was replaced after review: a just served S note still counts as 8 weeks stale, so it beats every note seen in the last 8 weeks and comes back on the next page. With a page's worth of S notes the feed loops on them.
- _Rejected: a per-session cursor that skips notes served since the feed was opened._ It hides the repeats within one session only.

- _Rejected: strict sort (`ORDER BY tier, seen_at`)._ The feed always serves something, so once there's a page's worth of S notes, A to D would never be served again.
- _Rejected: tier as a revisit frequency_ ("due" when `seen_at + interval < now`). It's a different mental model and needs more design for no gain over the boost.

### 2. Factors are exponential: S ×16, A ×8, B ×4, C ×2, D ×1

Each tier doubles the one below it, so the gaps stay meaningful, and the ends leave room (for example SSS ×32, F ×0.5).

- _Rejected: linear (S ×5 ... D ×1)._ The top tiers feel too alike.
- _Rejected: boosts derived from the prod numeric ranges._ It ties the design to data the owner maps by hand anyway.

### 3. The tier is stored as a Postgres enum through Prisma

`enum NoteTier { S A B C D }` with `@@map("note_tier")` (the same convention as `NoteType`). The DB rejects bad values, and the generated `NoteTier` gives the API its runtime enum for validation and Swagger.

- _Rejected: a text column with validation only in code._ The DB would accept any string.
- _Rejected: a `note_tiers` lookup table (code, boost, order)._ It's the most flexible, but it adds a join, and adding a tier becomes a data change rather than a reviewed migration.

### 4. Transition: a nullable column with DB default D; NULL counts as D

`tier NoteTier? @default(D)`. Postgres `ADD COLUMN … DEFAULT` would fill every existing row, so the column is added without a default and the default is set by a second migration (`ALTER COLUMN … SET DEFAULT 'D'`), which applies only to new rows. Existing notes stay NULL until the owner's backfill can target `WHERE tier IS NULL`, and every new note gets D. The feed ranks NULL as D, and the API returns it as D (Decision 7). The follow-up PR makes the column `NOT NULL`.

- _Rejected: falling back to the old numeric rating (as hours) for NULL rows._ It's extra SQL that the follow-up PR deletes again, for a window of minutes to hours.
- _Rejected: `NOT NULL DEFAULT 'D'` right away._ It's simpler, but it loses the "not backfilled yet" state.

### 5. The field is named `tier` for good

Column, Prisma field, types, API and UI all say `tier`. The old `rating` column stays, unused, until the follow-up PR drops it; nothing gets renamed.

- _Rejected: `rating` now via `@map("rating_tier")`, with the old field renamed `legacyRating`._ It keeps the API word, but the domain word becomes "tier" anyway.
- _Rejected: `tier` now, renamed to `rating` later._ It breaks the API contract twice.

### 6. API: `PUT v1/notes/:noteId/tier`; the rating route and field are removed

The body is `{ tier }`, and the response is `{ message: 'Note tier update successful', data: { id, tier } }`. `NoteEntity.rating` is removed and `NoteEntity.tier` is added. There's one client, shipped together with the API.

- _Rejected: a generic `PATCH v1/notes/:noteId`._ It's a broader surface than this change needs.
- _Rejected: keeping `PUT …/rating` and `rating` until the follow-up._ It guards against web/API deploy skew, which the deploy order covers instead (Migration Plan).

### 7. The API coalesces a NULL tier to `'D'`

`mapToNoteEntity` and the tier response return `tier ?? 'D'`, so `NoteEntity.tier` is `NoteTier`, never null, and the UI has no "unrated" state. This matches how the feed ranks NULL, and nothing needs undoing in the follow-up.

- _Rejected: `tier: NoteTier | null`._ The UI would need a state that disappears a PR later.

### 8. Tier source: a type union in `@later/types`, plus a `Record<NoteTier, …>` in each app

- `@later/types` has `type NoteTier = 'S' | 'A' | 'B' | 'C' | 'D'`.
- The API keeps `FEED_TIER_FACTOR: Record<NoteTier, number>`.
- The web keeps `FEED_TIER_STYLES: Record<NoteTier, { colors… }>`, declared left to right; its key order is the slider order.

Adding a tier means changing the Prisma enum and migration and the union, after which tsc fails until both Records have the new tier. Nothing checks that the Prisma enum and the union stay the same set; keeping them in sync is part of adding a tier.

- _Rejected: a runtime `NOTE_TIERS` array in `@later/types`._ It needs the package to emit JS and to change how both apps resolve it: a tooling change inside a feature PR.
- _Rejected: a server-driven tier list (`GET v1/notes/tiers`)._ It's an extra request and cache for a list that changes about once a year.

### 9. Control: the shadcn Slider, stepped by index and restyled

`value = [index]` (the tier's position in `FEED_TIER_STYLES`), `min 0`, `max n-1`, `step 1`. Radix snaps to stops and gives keyboard support (arrows, Home/End), drag, touch and `role="slider"` for free. Styling uses `data-slot` selectors from the parent's `className`. The only change to the generated `ui/slider.tsx` is a `thumbProps` passthrough, so the thumb can get `aria-label="Tier"` and `aria-valuetext={tier}`.

- _Rejected: a custom segmented picker (toggle group)._ We'd own its a11y, and it doesn't feel like a slider.
- _Rejected: leaving the control to the design jam._ The jam was run with the shadcn Slider in mind.

### 10. Save timing: on commit, with the 600 ms latest-value debounce

`onValueChange` updates only the card's local drag value, so the thumb follows instantly. `onValueCommit` (pointer up, or each key press) calls `change(tier)`, which restarts the 600 ms debounce. The batching loop of `useBatchedRating` is kept as `useBatchedTier`: no overlap, revert and toast on failure, flush on unmount, `cancel()` before delete. The toast fallback is `"Error of setting a note tier"`.

- _Rejected: an immediate PUT per commit._ Keyboard users would fire a request per arrow press, and out-of-order responses would need handling.
- _Rejected: an explicit save button._ It adds a tap per note.

### 11. Layout: card footer, D on the left to S on the right

The slider replaces `FeedRating` in the footer: it grows to fill the space, capped at about 300 px. Labels sit under each stop, and the delete button stays on the right. It's always visible, so a change takes one gesture.

- _Rejected: a tier badge that opens the slider in a popover._ It takes two taps per change.

### 12. Look: chunky, weather palette, solid fill, no badge

Settled in the Claude Design jam:

- **Size:** the track, range and thumb share one height, 24 px, fully rounded.
- **Thumb:** a white disc with a 3 px ring in the tier color, shadow `0 1px 3px rgb(0 0 0 / .25)`, and a 4 px `ring/50` focus ring.
- **Unfilled track:** `#e7e7ea` (light) / `#2e2e30` (dark).
- **Range:** the current tier's color (light / dark, Apple system colors):
  - D `#af52de` / `#bf5af2`
  - C `#007aff` / `#0a84ff`
  - B `#34c759` / `#30d158`
  - A `#ffcc00` / `#ffd60a`
  - S `#ff9500` / `#ff9f0a`
- **S glow:** the S track gets `0 0 0 1px` and `0 2px 12px` shadows in its own color at about 35–40 % alpha.
- **Stop dots:** 6 px dots on the other stops: `rgb(255 255 255 / .6)` on the filled part, `rgb(0 0 0 / .18)` (light) or `rgb(255 255 255 / .22)` (dark) on the unfilled part.
- **Labels:** 12 px `muted-foreground`; the current tier's label is bold `foreground`.
- **Colors per theme:** the per-tier colors come from `FEED_TIER_STYLES` and are set as inline CSS variables (`--tier-light`, `--tier-dark`), with `dark:` picking the second one.
- **Alignment:** Radix keeps the thumb in bounds, so stop `i` is at `calc(12px + i/(n-1) * (100% - 24px))`. The label and dot overlays use the same formula, are absolutely positioned, and have `pointer-events: none`. The slider root is tall enough (about 54 px) to cover the label row, so a tap on a label sets that tier.
- _Rejected:_ the ice-gold and plasma palettes, the mono neutral look, gradient fill (the whole ramp revealed up to the thumb), a thin 4 px track with an 18 px thumb, and a header tier badge.

### 13. Creating a note: always D

`CreateNoteRequestBody` stays `{ content }`, and `createNote` writes `tier: 'D'`. Picking a tier on create is planned for later.

- _Rejected for now: an optional `tier` on create with a picker in the input._

### 14. No backfill script in this change

The owner maps numeric ratings to tiers with ad-hoc SQL on prod.

- _Rejected: `sql/backfills/<date>_backfill_note_tier.sql`, with fixed or placeholder thresholds._

### 15. Glossary: Tier replaces Rating

`CONTEXT.md` gets **Tier** ("one of a fixed, ordered set of grades on a note: S, A, B, C, D; new notes are D; a higher tier brings the note back sooner in the rotation"; avoid: rating, score, votes). Rating, Upvote and Downvote move to the retired terms (#151), and Rotation says "adjusted by tier".

- _Rejected: keeping "Rating" as the concept while the code says `tier`._

### 16. Tie-break: the higher tier first

`COALESCE(tier, 'D') ASC` (the enum is declared highest first) replaces `rating DESC` as the second ORDER BY key, followed by `created_at ASC, id ASC`. It mirrors today's rule.

## Data model and migrations

`apps/api/prisma/schema.prisma`:

```prisma
enum NoteTier {
  S
  A
  B
  C
  D

  @@map("note_tier")
}

model Note {
  // ...
  rating Int       @default(0) // unused since #151, dropped by the follow-up PR
  tier   NoteTier? @default(D) // NULL only on notes from before #151, until the backfill
}
```

- Create the migration with `pnpm db:migrate:local --name add_note_tier`. It isn't a rename, so the generated SQL is used as-is. Check that it's exactly:
  - `CREATE TYPE "note_tier" AS ENUM ('S', 'A', 'B', 'C', 'D');`
  - `ALTER TABLE "notes" ADD COLUMN "tier" "note_tier";`

  It must have no DEFAULT, no NOT NULL and no change to `rating`.

- Then add `@default(D)` and create `add_note_tier_default`: `ALTER TABLE "notes" ALTER COLUMN "tier" SET DEFAULT 'D';`. It leaves existing rows NULL.

- Future tiers: `ALTER TYPE "note_tier" ADD VALUE 'SSS'` (or `'F'`). The enum's declared order doesn't matter, because nothing sorts by it; the rank comes from the boost map.
- No backfill script (Decision 14).

**Raw SQL that names the changed columns** (tsc doesn't check these):

- `apps/api/src/feed/feed.utils.ts` `buildFeedOrderSql`: uses `n.rating` today and must switch to the tier factor. The factor is a `CASE COALESCE(n.tier::text, 'D') WHEN $1 THEN $2::float8 … ELSE 1 END` built with `Prisma.join` from `FEED_TIER_FACTOR`, used as `(now() - n.seen_at) * <factor>` in the first key; the second key is `COALESCE(n.tier, 'D') ASC`. The `::text` cast keeps the bound parameters comparable, because an enum compared with a text parameter fails.
- `apps/api/src/feed/feed.service.ts` `$queryRaw`: selects only `n.id`, with the where and order above; no change itself.
- `buildFeedWhereSql`: names only `user_id`; no change.
- `apps/api/sql/backfills/2026102501__delete-resolved-notes.sql`: historical, doesn't name `rating` or `tier`.

## `@later/types` changes

`packages/types/src/notes.ts`:

- Added: `export type NoteTier = 'S' | 'A' | 'B' | 'C' | 'D'`.
- `NoteEntity`: `rating: number` is replaced by `tier: NoteTier`.
- Added: `SetNoteTierRequestBody { tier: NoteTier }`, `NoteTierEntity { id: string; tier: NoteTier }`, `SetNoteTierSuccessResponse extends BaseSuccessResponse<NoteTierEntity>`.
- Removed: `SetNoteRatingRequestBody`, `NoteRatingEntity`, `SetNoteRatingSuccessResponse`.

## Code shape

- **API, notes:**
  - `SetNoteTierDto` with `@IsEnum(NoteTier)` (the generated Prisma enum) and `@ApiProperty({ enum: NoteTier, example: 'A' })`. `IsEnum`'s message yields the spec's `"tier must be one of the following values: S, A, B, C, D"`.
  - `NotesService.setNoteTier` runs `checkNoteAccess` first, then `update … select { id, tier }`, and returns the tier coalesced.
  - New notes get D from the DB default; `createNote` also writes `tier: 'D'`.
  - `NOTE_SELECT` selects `tier`, not `rating`. `DbNote.tier` is `NoteTier | null`, and `mapToNoteEntity` coalesces it.
  - `NOTE_RATING_MIN/MAX` are removed.
- **API, feed:** `FEED_TIER_FACTOR` replaces `FEED_RATING_STEP_HOURS`.
- **Web:**
  - `shared/components/ui/slider.tsx` comes from `shadcn add slider`. Fix the bogus `cn` import, and add `thumbProps`.
  - `features/feed/components/FeedTierSlider.tsx` (props `tier`, `onChange`) holds the local drag value and the overlays.
  - `features/feed/hooks/useBatchedTier.ts` returns `{ tier, change(tier), cancel }`.
  - `FEED_TIER_STYLES` and `FEED_TIER_DEBOUNCE_MS` (600) live in `feed.constants.ts`.
  - `notesApi.setNoteTier` patches `item.tier` in the `feed` cache.
  - Removed: `FeedRating.tsx`, `useHoldRepeat.ts`, `useBatchedRating.ts`, `clampRating`, and the `FEED_RATING_*` constants.

## Risks / Trade-offs

- **[Risk] The raw SQL CASE is only checked at runtime.** → Call `GET v1/feed` locally after the change (tasks), with notes in several tiers and one NULL.
- **[Trade-off] The Prisma enum and the shared union can drift apart.** A tier added to the union only is rejected by the API with 400. Accepted to keep things simple: tiers change about once a year, together.
- **[Risk] Deploy skew.** A new web against the old API gets 404 on tier saves (revert and toast) and items without `tier`. → Run the migration first, then deploy the API, then let the web go live (Migration Plan). The window is minutes and only affects tier saves.
- **[Risk] Radix's thumb inset and the overlays drift apart** (labels and dots not centered on stops). → Both use the same `12px + i/(n-1) * (100% - 24px)` formula, tied to the 24 px thumb constant. Check it in the browser at phone width.
- **[Trade-off] Until the backfill runs, every existing note ranks as D,** so the rotation briefly ignores the old ratings. This was accepted in Decision 4.
- **[Trade-off] The yellow A range has low contrast against the white thumb.** It's acceptable because the thumb also has a ring and shadow, and the bold label carries the value.

## Migration Plan

1. Merge the PR.
2. The owner runs `pnpm --filter api db:migrate:prod`. This adds the nullable `tier` with default D for new rows; the old API keeps working with the extra column.
3. Deploy the API, then the web (Vercel).
4. The owner backfills tiers by hand: `UPDATE notes SET tier = … WHERE tier IS NULL`, with their own thresholds.
5. Follow-up PR (separate issue): make `tier` `NOT NULL`, drop `rating`, and remove the NULL coalescing.

**Rollback:** revert the PR and redeploy. The `tier` column can stay: it's nullable and unknown to the old code, and the old `rating` values were never touched.
