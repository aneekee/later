# Tasks

The groups run in order, one commit each. None can run in parallel: group 3 needs the types from group 2, and group 4 removes what group 3 stops using. To keep every commit green, the API first adds `tier` next to `rating` (group 2), and the numeric rating is removed only after the web has switched over (group 4).

The gate is `pnpm --filter api exec prisma generate && pnpm build && pnpm lint`, run from the repo root. For local checks, start the `api` and `web` servers from `.claude/launch.json` (ports 3000 and 5175). For curl, use the `access_token` cookie from a local test user's login. For psql, use the local DB from `apps/api/.env`.

## 1. Data model: the tier enum and column

- [x] 1.1 In `apps/api/prisma/schema.prisma`, add `enum NoteTier { S A B C D }` with `@@map("note_tier")`, and `tier NoteTier?` on `Note` with no default. Leave `rating` as it is, with a comment saying it's unused since #151. Verify that `pnpm --filter api exec prisma generate` succeeds.
- [x] 1.2 Create the migration with `pnpm --filter api db:migrate:local --name add_note_tier`. Verify that the new `apps/api/prisma/migrations/*_add_note_tier/migration.sql` contains only `CREATE TYPE "note_tier" AS ENUM ('S', 'A', 'B', 'C', 'D');` and `ALTER TABLE "notes" ADD COLUMN "tier" "note_tier";`: no DEFAULT, no NOT NULL, and no change to `rating`.
- [x] 1.3 Gate: prisma generate, `pnpm build`, `pnpm lint`.

## 2. API: tiers in the notes module and the feed order

- [ ] 2.1 In `packages/types/src/notes.ts`, add `type NoteTier = 'S' | 'A' | 'B' | 'C' | 'D'`, `tier: NoteTier` on `NoteEntity` (keep `rating` for now), and `SetNoteTierRequestBody`, `NoteTierEntity` and `SetNoteTierSuccessResponse`. Verify that `pnpm check-types` passes.
- [ ] 2.2 Read `tier` everywhere a note is read:
  - `apps/api/src/notes/notes.utils.ts`: `NOTE_SELECT` selects `tier`, and `mapToNoteEntity` returns `tier: note.tier ?? 'D'`.
  - `apps/api/src/notes/notes.types.ts`: `DbNote.tier` is `NoteTier | null`.
  - `apps/api/src/notes/notes.service.ts`: `createNote` writes `tier: 'D'`.

  Verify with curl: `POST /api/v1/notes` with `{"content":"Book a dentist check-up"}` returns 201 with `data.tier` `"D"`. With `{"content":"x","tier":"S"}` it returns 400 with `"property tier should not exist"`.

- [ ] 2.3 Add the tier endpoint:
  - `notes.dto.ts`: `SetNoteTierDto` with `@IsEnum(NoteTier)` (the generated Prisma enum) and `@ApiProperty({ enum: NoteTier, example: 'A' })`.
  - `notes.types.ts`: `SetNoteTierServiceDto`.
  - `notes.service.ts`: `setNoteTier`, which runs `checkNoteAccess` first, then `update` with `select { id, tier }`, and returns the tier coalesced.
  - `notes.controller.ts`: `@Put(':noteId/tier')` returning `{ message: 'Note tier update successful', data }`.

  Verify with curl against your own note: `{"tier":"A"}` returns 200 with exactly that body, and `{"tier":"D"}` afterwards returns 200 with `"D"`. Then check the errors:
  - `{"tier":"E"}` and `{}`: 400 with `"tier must be one of the following values: S, A, B, C, D"`.
  - `{"tier":"A","rating":5}`: 400 with `"property rating should not exist"`.
  - another user's note, and the id `does-not-exist`: 403 with `"You don't have access to this note"`.
  - no cookie: 401.

  Check that Swagger at `/api/docs` shows the enum.

- [ ] 2.4 Switch the feed order:
  - `apps/api/src/feed/feed.constants.ts`: replace `FEED_RATING_STEP_HOURS` with `FEED_TIER_BOOST_WEEKS: Record<NoteTier, number> = { S: 8, A: 4, B: 2, C: 1, D: 0 }`, plus a compile-time check that the Prisma `NoteTier` and the `@later/types` `NoteTier` are the same set.
  - `apps/api/src/feed/feed.utils.ts`: rewrite `buildFeedOrderSql` to `seen_at - make_interval(weeks => <boost>) ASC NULLS FIRST, <boost> DESC, created_at ASC, id ASC`. `<boost>` is `CASE COALESCE(n.tier::text, 'D') WHEN … THEN …::int … ELSE 0 END`, built with `Prisma.join` from the map. Update the doc comment.

  Verify that the build fails if one tier is removed from the map (then restore it).

- [ ] 2.5 Check the rotation locally (the raw SQL is only checked at runtime). With psql, set `tier` and `seen_at` on local notes for each `specs/feed` rotation scenario, then call `GET /api/v1/feed` with curl and confirm the order each time:
  - D seen 3 days ago vs C seen 1 day ago: C first.
  - D seen 10 weeks ago vs S seen 1 day ago: D first.
  - never seen (`seen_at` NULL) vs S seen 1 year ago: never-seen first.
  - A seen at T vs D seen at T minus 4 weeks: A first.
  - `tier` NULL seen 2 days ago vs D seen 1 day ago: NULL first, and it's returned with `"tier":"D"`.

  Every item has a `tier` field.

- [ ] 2.6 Gate: prisma generate, `pnpm build`, `pnpm lint`.

## 3. Web: the tier slider replaces the rating control

- [ ] 3.1 Run `pnpm dlx shadcn@latest add slider` in `apps/web`. Check the generated `apps/web/src/shared/components/ui/slider.tsx` for a bogus `cn` import or dependency and fix it to `@/shared/lib/utils`. Add a `thumbProps` passthrough to each `SliderPrimitive.Thumb`. Verify that `pnpm --filter web run build` passes and that `package.json` gained no stray dependency.
- [ ] 3.2 In `apps/web/src/features/feed/const/feed.constants.ts`, add `FEED_TIER_STYLES: Record<NoteTier, { rank: number; light: string; dark: string; glow?: boolean }>` with the design.md Decision 12 colors (D 0 … S 4, `glow` on S) and `FEED_TIER_DEBOUNCE_MS = 600`. Remove `FEED_RATING_MIN/MAX`, `FEED_RATING_DEBOUNCE_MS` and the `FEED_RATING_HOLD_*` constants. Add a helper in `features/feed/utils/feed.utils.ts` that returns the tiers ordered by `rank`, and remove `clampRating`. Verify with `pnpm check-types`.
- [ ] 3.3 In `apps/web/src/features/notes/api/notes.api.ts` and `features/notes/types/notes.types.ts`, replace `setNoteRating` with `setNoteTier` (`PUT v1/notes/:noteId/tier`, body `{ tier }`). On success it patches `item.tier` in the `feed` cache through `feedApiEndpoints.util.updateQueryData`, with no tags and no refetch. Remove `SetNoteRatingParams` and `useSetNoteRatingMutation`. Verify with `pnpm check-types`.
- [ ] 3.4 Create `apps/web/src/features/feed/hooks/useBatchedTier.ts` from `useBatchedRating.ts`, keeping its loop:
  - `change(tier)` sets the absolute tier and restarts the `FEED_TIER_DEBOUNCE_MS` debounce;
  - one request at a time, latest value, no request when equal to the confirmed tier;
  - revert and `displayErrorToast(e, 'Error of setting a note tier')` on failure;
  - flush on unmount;
  - `cancel()`.

  Delete `useBatchedRating.ts`. Verify with `pnpm check-types`.

- [ ] 3.5 Create `apps/web/src/features/feed/components/FeedTierSlider.tsx` (props `tier`, `onChange`):
  - Uses the shared `Slider` with `min 0`, `max n-1`, `step 1`, `value=[rank]`.
  - Keeps a local drag value from `onValueChange`; `onValueCommit` calls `onChange(tier)`.
  - Styling (design.md Decision 12): the track, range and thumb are 24 px and fully rounded, the range is in the tier color through the inline `--tier-light` / `--tier-dark` variables, the thumb is a white disc with a 3 px ring and a focus ring, and S gets the glow.
  - Overlays use `pointer-events: none`, at `calc(12px + i/(n-1) * (100% - 24px))`: 6 px stop dots and 12 px labels (the current one bold `foreground`).
  - The root is tall enough that taps on labels hit it, and it's capped at about 300 px wide.
  - `thumbProps={{ 'aria-label': 'Tier', 'aria-valuetext': tier }}`.

  Match the Claude Design canvas (https://claude.ai/artifact/9YPz1AoNAx7e4nTBL1aJC6). Verify with `pnpm check-types`.

- [ ] 3.6 In `apps/web/src/features/feed/components/FeedItem.tsx`, render `FeedTierSlider` with `useBatchedTier` in the footer in place of `FeedRating`, and keep `onBeforeDelete={cancel}`. Delete `FeedRating.tsx` and `hooks/useHoldRepeat.ts`. Verify that `grep -rn "Rating\|HoldRepeat\|clampRating" apps/web/src` finds nothing.
- [ ] 3.7 Browser check (web + api servers, desktop and 375 px mobile, light and dark):
  - Card scenarios: a B note shows D C B A S with the thumb on B, a bold B label and a green fill. An S note is fully filled in orange with the glow. A newly created note sits on D. No up/down buttons or number are shown.
  - Interaction: tapping A on a D note jumps there in yellow. Dragging snaps to stops. With the thumb focused, Right Arrow steps one tier and Home/End go to D/S. `read_page` shows the thumb as a slider with value text equal to the tier letter.
  - Saving, in the network panel:
    - D → C → B → A within 600 ms sends exactly one `PUT …/tier` with `{"tier":"A"}`.
    - B → A → B sends none.
    - A change followed by a quick navigation to `/dashboard` still sends.
    - No `GET v1/feed` is triggered by a tier change, and after scrolling to the next page that repeats the note, the card shows the saved tier.
  - Failures:
    - Delete a note with curl, then change its tier in the UI: the thumb reverts and the toast says `"You don't have access to this note"`.
    - Stop the API and change a tier: it reverts and the toast says `"Error of setting a note tier"`.
    - Change a tier and confirm deletion within 600 ms: no tier request and no tier toast.
- [ ] 3.8 Gate: prisma generate, `pnpm build`, `pnpm lint`.

## 4. Remove the numeric rating from the API and the docs

- [ ] 4.1 Remove the rating surface:
  - `@Put(':noteId/rating')` and `setNoteRating` in `apps/api/src/notes/notes.controller.ts` and `notes.service.ts`.
  - `SetNoteRatingDto` in `notes.dto.ts`, `SetNoteRatingServiceDto` in `notes.types.ts`, and `NOTE_RATING_MIN/MAX` in `notes.constants.ts`.
  - `rating` from `NOTE_SELECT`, `DbNote` and `mapToNoteEntity`.
  - In `packages/types/src/notes.ts`: `NoteEntity.rating`, `SetNoteRatingRequestBody`, `NoteRatingEntity` and `SetNoteRatingSuccessResponse`.

  Keep the `rating` column in `schema.prisma`. Verify with curl that `PUT /api/v1/notes/<id>/rating` with `{"rating":5}` returns 404 and that `GET /api/v1/feed` items have `tier` and no `rating`. Also verify that `grep -rn "rating" apps/api/src packages/types/src` finds nothing.

- [ ] 4.2 Use the `domain-modeling` skill to update `CONTEXT.md`:
  - Add **Tier** (S, A, B, C, D; new notes are D; a higher tier brings the note back sooner; avoid: rating, score, votes).
  - Rotation becomes "adjusted by tier".
  - Move Rating, Upvote and Downvote to the retired terms, under "removed in #151".

  Verify that `CONTEXT.md` doesn't define Rating as a current term.

- [ ] 4.3 In `CLAUDE.md`, replace "rate" / "rating" wording with tier wording ("create, tier and delete notes"; "note create, tier and delete live in the `notes` module"). Verify that `grep -n -i "rat" CLAUDE.md` shows no stale rating wording.
- [ ] 4.4 Gate: prisma generate, `pnpm build`, `pnpm lint`, plus a final browser pass of the feed (load the feed, change a tier, delete a note).

## Workflow follow-up

- Owner, after merge: run `pnpm --filter api db:migrate:prod` before the new API goes live.
- Owner: deploy the API, then let the web (Vercel) go live.
- Owner: backfill tiers on prod by hand (`UPDATE notes SET tier = … WHERE tier IS NULL`, with your own mapping from the old numeric `rating`).
- Follow-up PR (new issue): make `tier` `NOT NULL DEFAULT 'D'`, drop the `rating` column, and remove the NULL → D coalescing.
- Before merge, `/opsx:verify 151-feature-change-voting-to-tiers`, then `/opsx:archive 151-feature-change-voting-to-tiers` as the PR's last commit.
