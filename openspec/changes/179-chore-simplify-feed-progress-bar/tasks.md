# Tasks

The two groups run in order, one commit each, and can't run in parallel: group 2 rewrites the count that group 1 derives. Both touch only `apps/web/src/features/feed`, and group 2 also touches `CONTEXT.md`.

Group 1 is the owner's checkpoint (design.md Decision 2). Its commit counts by page while the spec already describes the scroll ratio. Start group 2 only after the owner has tried group 1 and chosen to go on. If they settle on group 1, run `/opsx:update` instead, to switch the feed spec to the page rule and drop group 2.

**Setup**

- **Gate:** from the repo root, run `pnpm --filter api exec prisma generate && pnpm build && pnpm lint`.
- **Servers:** for the browser checks, start the `api` and `web` servers from `.claude/launch.json` (ports 3000 and 5175), with local Postgres running (`docker compose up -d` in `apps/api`).
- **Screen sizes:** use the browser pane's `mobile` preset (375 px) and desktop (1280 px).
- **Test users:** local test users, made through the app's sign-up, never a real account:
  - **U15** with 15 one-line notes (`Test note <n>`), so the cards are of equal height. Page 2 holds notes 11–15 and the 5 stalest again, so rounds come quickly.
  - **U8** with 8 notes: a short feed that ends.
  - **U0** with no notes.

  Create notes with curl: `POST /api/v1/notes` with `{"content":"Test note <n>"}` and the user's `access_token` cookie. If #165's test users are still in the local database, reuse them.

## 1. Revert per-card counting, count by page (checkpoint)

- [x] 1.1 Remove #165's per-card plumbing (design.md Decisions 4 and 9). Verify with `pnpm --filter web exec tsc -b`.
  - `components/FeedItem.tsx`: drop the `ref` prop and `data-note-id`, keep `memo`.
  - `components/FeedContainer.tsx`: drop `observeCard` and `headerRef`.
  - `utils/feed.utils.ts`: drop `isHalfVisible` and `countScrolledCard`.
  - `types/feed.types.ts`: drop `FeedScrollState`.
  - `const/feed.constants.ts`: drop `FEED_SCROLL_OBSERVER_THRESHOLDS`.
- [x] 1.2 Add `toFeedRound(count, total)` to `utils/feed.utils.ts` (design.md Decision 7). It returns `{ round, scrolled }`, where:
  - `round = max(1, ceil(count / total))` and `scrolled = count - (round - 1) x total`;
  - for `total` 0 it returns round 1 and `scrolled` 0.

  Add a doc comment naming **Round** from `CONTEXT.md`. Verify with `pnpm --filter web exec tsc -b`.

- [x] 1.3 Rewrite `hooks/useFeedScrollCounter.ts` for the page rule (design.md Decision 3). Verify with `pnpm --filter web exec tsc -b`.
  - **Inputs:** `served` (the sum of the loaded pages' `items.length`), the latest page's `items.length`, `hasNextPage`, `pageCount` and the latest page's `total`.
  - **Count:** `served - latestPageItems` while `hasNextPage`, `served` otherwise, then passed through `toFeedRound`.
  - **Keep:** the `noteCreated` / created-since-latest-page total logic unchanged.
  - **Returns:** `{ scrolled, total, round, noteCreated }`.
  - **In `FeedContainer.tsx`:** compute `served` from `data.pages`, and pass these in. `FeedScrollCounter` and its visibility condition stay as they are.
- [x] 1.4 Browser check of the checkpoint, at phone and desktop width:
  - **U15:**
    - `0/15` on the first page;
    - `10/15` once page 2 loads;
    - `Round 2`, `5/15` once page 3 loads;
    - the bar's fill matches each count.
  - **U15, create:** creating a note adds 1 to the total only.
  - **U15, delete:** deleting a note on an earlier page lowers both numbers, and deleting one on the latest page lowers only the total.
  - **U8:** `8/8` with a full bar, no pill and "That's all for now".
  - **U0:** only "Feed", above the empty state.
  - **Requests:** the network panel shows no `GET /api/v1/feed` beyond the sentinel's pages.
- [x] 1.5 Gate: prisma generate, `pnpm build`, `pnpm lint`. Commit, then hand over to the owner for the checkpoint.

## 2. Count by scroll position

- [ ] 2.1 In `components/FeedContainer.tsx`, wrap the mapped `FeedItem`s in one `div` with a `cardsRef`, styled `flex flex-col gap-3`, so the layout and the spacing to the spinner, error and `FeedEnd` are unchanged (design.md Decision 5). Verify with `pnpm --filter web exec tsc -b` and by eye in the browser: no layout shift.
- [ ] 2.2 Rework `hooks/useFeedScrollCounter.ts` for the ratio (design.md Decisions 4, 6 and 8). Verify with `pnpm --filter web exec tsc -b`.
  - **State:** `seen`, a number.
  - **`measure()`:**
    - `ratio = clamp((scrollRef.bottom - cardsRef.top) / cardsRef.height, 0, 1)`, both from `getBoundingClientRect`;
    - `seen = Math.round(cardsRef.children.length x ratio)`;
    - `setState` only when `seen` changes.
  - **When it runs:**
    - on the scroll container's `scroll` event (passive, one `requestAnimationFrame` per frame);
    - from a `ResizeObserver` on the wrapper;
    - once when the wrapper mounts. The wrapper appears only after the first page loads, so key the effect on it being mounted, not only on the refs.
  - **The count:** `count = (served - rendered) + seen`, through `toFeedRound`. `rendered` is `items.length`.
  - **Clean-up:**
    - drop the page-rule inputs that are no longer needed;
    - keep `noteCreated`;
    - clean up the listener, the observer and any pending frame on unmount.
- [ ] 2.3 In `CONTEXT.md`, redefine **Scrolled** as the counter's estimate from the scroll position over the loaded cards, rather than distinct cards that were half visible. Keep its _Avoid_ line. Check that **Round** still reads true, and reword it if not. Verify by reading both entries against `specs/feed`.
- [ ] 2.4 Browser check of the scroll-position rule as U15, at phone and desktop width:
  - **First page:** with the bottom of the scroll area a third of the way into the 4th card, the count is `3/15`.
  - **Scrolling down:** once half of the 4th card is above the bottom, it's `4/15`.
  - **Scrolling back up:** scrolling up two cards lowers it by 2.
  - **The next page loads:** at the end of the 10th card it reads `10/15`, and it still reads `10/15` after page 2 loads.
  - **Loaded but not in view:** cards loaded below the view don't change it.
  - **Under the sticky header:** cards hidden under the header count.
  - **Tall card:** create a 1000-character note as U15 and scroll until it comes around. The count moves by several while it passes the bottom of the scroll area. Delete the note afterwards so U15 has 15 one-line notes again.
  - **Requests:** the network panel shows no `GET /api/v1/feed` beyond the sentinel's pages while scrolling.
- [ ] 2.5 Browser check of rounds, the total, resizing and restarting:
  - **Rounds, U15:**
    - `15/15` with a full bar and no pill at the end of the 15th served card;
    - `Round 2`, `1/15` past the middle of the next card;
    - `Round 3`, `1/15` after another 15;
    - scrolling up one card from `Round 2`, `1/15` shows `15/15` with no pill.
  - **Short feed, U8:** `8/8` at "That's all for now", with no round 2.
  - **Total, U15:**
    - from `n/15`, creating a note shows `n/16`, and the total stays 16 after the next page loads;
    - deleting a card above the bottom of the scroll area shows `(n-1)/15`;
    - deleting a loaded card below it shows `n/15`;
    - the bar matches each.
  - **Resizing, U15:**
    - at `15/15`, typing a multi-line note until the header covers a card, then clearing it without scrolling, keeps `15/15`;
    - mid-feed, typing and clearing a 7-line note keeps the count, and the next one-card scroll adds 1.
  - **Restart:**
    - a reload at `Round 2` starts again in round 1 from the first page's position;
    - going to Dashboard and back does the same.
  - **Visibility:** while the first page loads, on a first-page error and as U0, the title row shows only "Feed". After a next-page error the counter keeps its value.
- [ ] 2.6 Gate: prisma generate, `pnpm build`, `pnpm lint`. Commit.

## Workflow follow-up

- `/opsx:verify` with a manual pass over every scenario in `specs/feed`, then `/opsx:archive` as the PR's last commit.
- No prod steps: no migration, no backfill, no API change.
