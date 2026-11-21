# Design

## Context

For the motivation, see `proposal.md` (Why). For the behavior, see `specs/feed`. This design builds on the following state, left by #165 (archived in `openspec/changes/archive/2026-11-19-165-feature-add-feed-scroll-indicator`):

- **Counter state:** `useFeedScrollCounter` (175 lines) owns it all:
  - one `IntersectionObserver` with thresholds `[0, 0.5]`, plus a `scroll` listener that re-checks the cards in view with `isHalfVisible`;
  - a `counted` set of note ids and a `round`, advanced by `countScrolledCard`;
  - pruning of deleted ids against the rendered items;
  - the "created since the latest page" total offset (`noteCreated`, fed by `FeedNoteInput`'s `onCreated`).
- **Cards:** every `FeedItem` gets `ref={observeCard}` and `data-note-id`, and is wrapped in `memo` so the stable ref doesn't re-render it.
- **Rendering:**
  - `FeedContainer` renders `dedupeKeepLast(pages)` straight into the content column, followed by the spinner, the load-more error, `FeedEnd` and `FeedSentinel`.
  - The sticky header (the title row plus `FeedNoteInput`, which grows up to `max-h-48`) sits inside the same scroll container, `scrollRef`.
- **Paging:**
  - `getNextPageParam` pages while `lastPage.total > lastPage.items.length`, so a feed of 10 or fewer notes ends, and a longer one never ends.
  - Once every note is served, the next page holds the stalest ones again, and `dedupeKeepLast` moves their cards to the bottom. So there are never more rendered cards than `total`.
- **Delete:** `removeFeedItem` drops the note from every cached page and lowers each page's `total`.
- **Scroll anchoring** (measured in #165, Chromium): when the header grows while the feed is scrolled, `scrollTop` moves by the same amount and the cards stay where they are on screen.

## Goals / Non-Goals

**Goals:**

- No per-card refs, observers or id sets: the counter reads one wrapper element and numbers the feed cache already has.
- Keep the counter's interface to `FeedScrollCounter` (`scrolled`, `total`, `round`) and its total logic unchanged.
- Leave the code at a build-green checkpoint after step 1, so the owner can try the page-based counter before step 2.

**Non-Goals:**

- Exact counting with cards of uneven height (proposal, Out of scope).
- Changing the feed cache, paging, dedupe, `FeedSentinel` or `FeedScrollCounter`'s markup.

## Decisions

### 1. A `chore` branch with a feed spec delta

The branch and the change keep the name `179-chore-simplify-feed-progress-bar`. Because the counting rule is observable, the change does not set `skip_specs`: it removes the half-visible requirement, adds the scroll-position one, and rewords the round, delete, resize and restart requirements.

- _Rejected: `skip_specs: true`._ The feed spec would still describe half-visible counting after the merge.
- _Rejected: renaming to `179-feature-…`._ That renames the branch and the change folder for no change in content.

### 2. Both steps in one change, step 1 as a checkpoint group

Group 1 ships the page-based counter (Decision 3), and the owner tries it in the browser. Group 2 replaces it with the scroll ratio, which is what the spec describes.

- **If the owner stops after group 1:** run `/opsx:update` to switch the spec to the page rule and drop group 2 before verify.
- **The one exception to the workflow rule:** group 1's commit is the only commit after the plan where the code and the spec disagree, and it is deliberate.

Rejected alternatives:

- _Step 1 only, with step 2 as a follow-up change._ Two full planning loops for one small counter.
- _Skipping step 1._ The owner wants to judge the coarse counter first.

### 3. Step 1 counts the notes served before the latest page

`served` is the sum of the loaded pages' `items.length`, not deduped. While there is a next page, the count is `served - latestPage.items.length`. Once the feed has ended, it is `served`.

- This gives `0/300` on the first page, `10/300` once page 2 loads, and `8/8` on a short feed.
- The sentinel loads a page just before the user reaches the end of the loaded cards, so "served before the latest page" is roughly the cards the user has scrolled past.

Rejected alternatives:

- _`served` itself._ It runs a page ahead of the user, which is the reason #165's Decision 1 rejected page counting.
- _`pageCount x FEED_PAGE_SIZE`._ It's wrong for a short last page and after deletes.

### 4. Step 2 uses a scroll ratio over the loaded cards

- **The ratio:** `ratio = clamp((scrollArea.bottom - wrapper.top) / wrapper.height, 0, 1)`, where `scrollArea` is `scrollRef`'s rect and `wrapper` is a new `div` around the mapped `FeedItem`s.
- **The count:** `seen = round(wrapper.children.length x ratio)`, and `count = (served - rendered) + seen`, where `rendered` is the number of rendered items.
- **What `served - rendered` means:** the notes served in earlier rounds whose cards `dedupeKeepLast` has moved further down, so they're no longer above the line.

Rejected alternatives:

- _The card at a reading line (`elementFromPoint` plus `data-note-id`)._ It's exact for any card height and about as short, but the owner prefers the plain ratio.
- _Distance to `FeedSentinel` within the latest page._ It needs a ref on a page boundary and has the same drift.
- _Keeping the per-card `IntersectionObserver`._ It's the complexity this change removes.

### 5. Measure against a cards wrapper, from the bottom of the scroll area

- **Why a wrapper:** the wrapper holds only the cards, so the header, the spinner, the load-more error and `FeedEnd` can't skew the ratio.
- **Why the bottom line:** measuring from the bottom of the scroll area makes the first page show the cards in view, and makes the end of the loaded cards show exactly `rendered`. So appending a page keeps the count steady: the ratio halves while `rendered` doubles. A short feed also reaches `N/N` at its end.

Rejected alternatives:

- _`(scrollTop + clientHeight) / scrollHeight` of the whole container, with no ref._ The header height and the end block count as cards.
- _The top of the scroll area._ The first page would start at `0`, but a short feed could never reach `N/N` without a special case.

### 6. Round to the nearest whole number

`seen` is rounded to the nearest whole number, so with cards of equal height a card counts once its upper half is above the line.

- _Rejected: rounding down._ The `gap-3` between cards makes `rendered x ratio` fall just under a whole number at the end of the loaded cards. The count would drop by 1 every time a page is appended.

### 7. Rounds come from the count, not from a set of note ids

Given `count` and `total`:

- `round = max(1, ceil(count / total))`;
- `scrolled = count - (round - 1) x total`;
- when `total` is 0 the counter is hidden anyway, so return round 1 and `scrolled` 0.

Exactly `total` shows `N/N` in round 1, and the next note shows `Round 2`, `1/N`. Scrolling back lowers the count, and the round with it. Step 1 uses the same arithmetic on its own count.

- _Rejected: dropping rounds._ With no more rendered cards than `total`, the counter would sit at `N/N` forever once the feed wraps.
- _Rejected: #165's rule, where a counted card coming back starts round 2._ It needs the per-note set.

### 8. Store the seen cards, derive everything else in render

- **The state:** the hook keeps one piece of state, `seen`, a number. It recomputes it on the scroll container's `scroll` event (passive, throttled to one `requestAnimationFrame`) and from a `ResizeObserver` on the wrapper. The observer fires when a page is appended, a card is deleted or a card changes height. `setState` only runs when the number changes.
- **The render:** `served` and `rendered` come from the props on every render. So in the frame between appending a page and the next measurement, `served - rendered` and the stale `seen` still add up to the old count, and nothing flashes. A delete shows the old count for that frame, then the new one.
- **Typing a long note:** the header's growth triggers neither event. With scroll anchoring the cards don't move on screen, and without it (browsers that lack anchoring) no event fires until the user scrolls. Either way the spec's resize requirement holds.
- _Rejected: storing the ratio._ After a page append, the stale ratio times the new `rendered` would flash a count a page too high.

### 9. What stays from #165

The following stay unchanged:

- `FeedScrollCounter`;
- `shared/components/ui/progress.tsx` and its eslint override;
- the `total` and `noteCreated` logic in the hook;
- `FeedNoteInput`'s `onCreated`;
- `memo` on `FeedItem`.

`memo` stays because the counter now re-renders `FeedContainer` on each step of the count, and without it every card would re-render too. `FeedItem` loses only its `ref` prop and `data-note-id`.

## Risks / Trade-offs

- [A tall note moves the count by several notes; short notes move it by less than 1 each] → Accepted by the owner; spec scenario "A tall card" pins it.
- [The count re-renders `FeedContainer` on every scroll step] → `seen` changes only on whole-number steps, and `FeedItem` stays `memo`.
- [`ResizeObserver` on a wrapper of up to `total` cards] → It observes one element, the wrapper, not each card.
- [Group 1's commit disagrees with the spec] → Decision 2. The owner either goes on to group 2 or runs `/opsx:update` before verify.
