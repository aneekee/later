# Proposal

## Why

Issue #151: a note's rating is a number from 0 to 10000, changed by pressing and holding upvote/downvote buttons on the feed card. It's slow and fiddly on both mobile and desktop. A small fixed set of tiers (S, A, B, C, D), picked with one stepped slider, is quicker to use and easier to reason about.

## What Changes

- **BREAKING (API):** a note carries a **tier** instead of a numeric rating. `NoteEntity` loses `rating: number` and gains `tier: 'S' | 'A' | 'B' | 'C' | 'D'`.
- **BREAKING (API):** `PUT /api/v1/notes/:noteId/rating` is removed. `PUT /api/v1/notes/:noteId/tier` with `{ tier }` replaces it and returns `{ id, tier }`.
- New notes are created at tier D. Creating a note still takes only `{ content }`.
- The feed rotation multiplies the time since a note was last seen by its tier factor: S ×16, A ×8, B ×4, C ×2, D ×1. Every note keeps rotating; higher tiers come back sooner, and a just served note goes to the back. This replaces the "1 hour sooner per rating point" rule.
- A note with no tier yet (existing notes, until the owner's prod backfill) is ranked and returned as D.
- The feed card's upvote/downvote control is replaced by a chunky stepped tier slider in the card footer: D C B A S from left to right, each tier in its own color on a cold-to-hot scale (D purple, C blue, B green, A yellow, S orange). Changes are optimistic and saved once, 600 ms after the last change (a drag counts on release); a failed save reverts and shows an error toast.
- The old rating implementation is removed from the web app (`FeedRating`, the press-and-hold hook, the batched rating hook, rating limits and constants).
- The tier set is designed to grow (for example F below D, SSS above S): adding a tier takes one enum migration plus the edits the compiler points to.
- The glossary replaces **Rating** with **Tier** and retires Rating, Upvote and Downvote.
- The old numeric `rating` column stays in the database, unused, for the owner's backfill.

**Out of scope**

- Picking a tier while creating a note. It's planned for later; for now a new note is always D.
- The prod backfill that maps old numeric ratings to tiers. The owner writes and runs it by hand; this change ships no script for it.
- The follow-up PR that makes `tier` NOT NULL and drops the old `rating` column. Because the new field is named `tier` for good, that PR doesn't rename anything, which departs from the ask's "rename to `rating`" plan.
- The F and SSS tiers themselves; only the room for them.
- A custom slider control: the shadcn Slider is used, restyled.
- Ordering the feed strictly by tier (all S notes before any A note). It was rejected because it would starve the lower tiers.

## Capabilities

### New Capabilities

- `notes`: a note's tier: its allowed values, the default at creation, and setting it through `PUT v1/notes/:noteId/tier`, including validation and ownership errors.
- `feed`: the rotation order, including the tier boost, and the feed card's tier slider (look, interaction, saving, errors).

### Modified Capabilities

<!-- none: no spec exists yet under openspec/specs/ -->

## Impact

- **prisma/schema.prisma** (`apps/api`): new `NoteTier` enum (`note_tier`) and a nullable `Note.tier` column with default D for new rows, in two migrations. The `rating` column stays.
- **apps/api**:
  - `notes` module: the tier DTO, service and route replace the rating ones; create sets D; `NOTE_SELECT` and `mapToNoteEntity` change.
  - `feed` module: the raw-SQL order expression `buildFeedOrderSql` and its constants.
- **@later/types**: the `NoteTier` type and `NoteEntity.tier`; `SetNoteTierRequestBody`, `NoteTierEntity` and `SetNoteTierSuccessResponse` replace the rating types.
- **apps/web**:
  - `features/feed`: a new tier slider component and batched tier hook; old rating files removed; constants and utils trimmed.
  - `features/notes/api`: a `setNoteTier` mutation that patches the feed cache.
  - `shared/components/ui`: a new shadcn `slider`.
- **Docs**: `CONTEXT.md` (Tier replaces Rating) and `CLAUDE.md` wording.
- **Prod (owner)**: run the migration before deploying, then backfill tiers by hand.
- **Design reference**: Claude Design canvas "Later tier slider", https://claude.ai/artifact/9YPz1AoNAx7e4nTBL1aJC6.
