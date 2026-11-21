# Proposal

## Why

Issue #179. The feed scroll counter from #165 (PR #177) counts a note once its card is half visible. That costs a 175-line `useFeedScrollCounter` hook, an `IntersectionObserver` with per-card bookkeeping and a ref on every `FeedItem`. The owner wants the same counter and progress bar for much less code, and accepts a less exact count to get it.

The change keeps the `chore` name, but it does change behavior: the counter now follows the scroll position over the loaded cards instead of counting half-visible cards. So it carries a feed spec delta and does not set `skip_specs`.

## What Changes

- **Revert the per-card counting from PR #177:**
  - the observer, the per-note "counted" set and the round bookkeeping in `useFeedScrollCounter`;
  - the `observeCard` ref and `data-note-id` on `FeedItem`;
  - `isHalfVisible`, `countScrolledCard`, `FeedScrollState` and `FEED_SCROLL_OBSERVER_THRESHOLDS`.
- **Step 1, a checkpoint the owner tries in the browser:** the counter counts by page. It counts the notes served before the latest loaded page, or all served notes once the feed has ended. So it shows `0/300` on the first page, `10/300` once page 2 loads, `20/300` once page 3 loads, and `8/8` on a short feed. If the owner settles here, the spec is switched to this rule with `/opsx:update` and step 2 is dropped.
- **Step 2, the behavior this change specifies:** the count moves in steps of 1 with the scroll position. The share of the loaded cards above the bottom of the scroll area is multiplied by the number of loaded cards, and the notes from earlier rounds that are no longer rendered are added. One ref on a wrapper around the cards replaces the per-card refs. Cards of uneven height make the count approximate: a tall note can move it by several, a run of short ones by fewer. The owner accepted that.
- **Rounds stay:** the round and the `Round <n>` pill come from the number of served notes rather than from a per-note set. Exactly `total` shows `N/N` in the current round, and the next note starts the next round at `1/N`.
- **Unchanged:** the total and how it follows created and deleted notes, the counter's place in the title row, the progress bar, when the counter shows, the reset on each visit, and the rule that the counter never requests the feed.
- **`CONTEXT.md`:** **Scrolled** becomes an estimate from the scroll position over the loaded cards, rather than a set of distinct cards.

**Out of scope**

- An exact per-card count, whether by the current half-visible rule or by a "card at a reading line" approach (`elementFromPoint` plus `data-note-id`). Both were weighed while grilling and rejected for this change: the owner prefers the simpler ratio.
- Measuring progress by the distance to `FeedSentinel` (the ask's own idea). It needs a ref on a page boundary and drifts on uneven card heights just like the ratio.
- Any change to the feed API, its paging, `dedupeKeepLast`, `FeedSentinel` or the feed cache rule.
- The counter's look: the round pill, the shadcn Progress bar and the count text stay as #165 left them.
- Unit tests for `apps/web`; the change is checked by hand in the browser.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `feed`:
  - The half-visible counting rule is replaced by a scroll-position rule over the loaded cards.
  - The rules for rounds, deletes, resizing the note input and restarting the counter are reworded for that rule.
  - The header, bar, visibility and never-requests requirements change only where their scenarios name half-visible cards.

## Impact

- **apps/web** (`features/feed`):
  - `useFeedScrollCounter` shrinks to a ratio hook;
  - `FeedContainer` wraps the cards and drops the per-card ref;
  - `FeedItem` loses the ref prop and `data-note-id`, but keeps `memo`;
  - `feed.utils.ts`, `feed.types.ts` and `feed.constants.ts` lose the per-card helpers.
  - `FeedScrollCounter`, `FeedNoteInput`'s `onCreated`, `shared/components/ui/progress.tsx` and its eslint override stay.
- **apps/api**: no change.
- **@later/types**: no change.
- **prisma/schema.prisma**: no change.
- **Docs**: `CONTEXT.md` (**Scrolled**).
