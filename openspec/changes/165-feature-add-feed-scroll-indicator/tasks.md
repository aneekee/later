# Tasks

The groups run in order, one commit each, and none can run in parallel:

- group 2 changes how group 1's count is derived;
- group 3 extends group 1's counting function.

Every group touches only `apps/web/src/features/feed`, except that group 1 adds `apps/web/src/shared/components/ui/progress.tsx`. Group 2 also touches `FeedNoteInput`, which lives in `features/feed` too.

**Setup**

- **Gate:** from the repo root, run `pnpm --filter api exec prisma generate && pnpm build && pnpm lint`.
- **Servers:** for browser checks, start the `api` and `web` servers from `.claude/launch.json` (ports 3000 and 5175), with local Postgres running (`docker compose up -d` in `apps/api`).
- **Screen sizes:** use the browser pane's `mobile` preset (375 px) and desktop (1280 px wide), in both light and dark.
- **Test users:** three local test users, made through the app's sign-up:
  - **U15** with 15 notes: two pages, so round 2 can be reached;
  - **U8** with 8 notes: a short feed that ends;
  - **U0** with no notes.

  Create notes with curl: `POST /api/v1/notes` with `{"content":"Test note <n>"}` and the user's `access_token` cookie. Never use a real account.

- **Mock PNGs** are in `openspec/changes/165-feature-add-feed-scroll-indicator/mockup/`.

## 1. Count scrolled cards and show the counter

- [x] 1.1 Check the API side of `specs/feed` with curl (no code change). Call `GET /api/v1/feed?pageSize=10` as each user and confirm:
  - U15: 10 items and `data.total` 15;
  - U8: `data.total` 8, while U15 still has 15 notes;
  - U0: an empty `data.items` and `data.total` 0.

  Note it in the commit message if anything differs.

- [x] 1.2 Add the pure counting function to `apps/web/src/features/feed/utils/feed.utils.ts`:
  - The state type is `FeedScrollState = { counted: Set<string>; round: number }`, in `features/feed/types/feed.types.ts`.
  - `countScrolledCard(state, noteId, total)` returns a new state with `noteId` added, or the same state when the id is already counted (rounds come in group 3).
  - Add a doc comment naming Scrolled from `CONTEXT.md`.

  Verify with `pnpm --filter web exec tsc -b`.

  - _Note (apply):_ `total` is unused until group 3, and `noUnusedParameters` rejects it, so it's named `_total` for now (with an eslint-disable line); 3.1 renames it back.

- [x] 1.3 Create `apps/web/src/features/feed/hooks/useFeedScrollCounter.ts` (design.md Decision 14). It takes `scrollRef`, `headerRef` and `total`, and returns `{ scrolled, round, observeCard }`. It owns:
  - one `IntersectionObserver` with `root: scrollRef.current`, `rootMargin` `-<header height>px 0px 0px 0px`, and thresholds every 0.02 from 0 to 1;
  - a `ResizeObserver` on the header that rebuilds the observer when the height changes;
  - the qualifying test (`intersectionRatio >= 0.5`, or `intersectionRect.height >= rootBounds.height / 2`);
  - a set of qualifying ids that survives rebuilds, so `countScrolledCard` runs only on a not-qualifying → qualifying change;
  - `observeCard`, a stable ref callback that reads `data-note-id`, observes the element and unobserves it on cleanup.

  `scrolled` is `Math.min(counted.size, total)`. All of this is React state inside the hook, with no Redux. Verify with `pnpm --filter web exec tsc -b`.

- [x] 1.4 In `apps/web/src/features/feed/components/FeedItem.tsx`, accept a `ref` prop (React 19) and put it, with `data-note-id={item.id}`, on the `Card` root. Verify with `pnpm --filter web exec tsc -b`.
- [x] 1.5 Add the shadcn Progress (design.md Decision 17): run `pnpm --filter web exec shadcn add progress`, then in `apps/web/src/shared/components/ui/progress.tsx` change the bogus `import { cn } from "cn"` to `@/shared/lib/utils` and check that `package.json` gained no bogus dependency. Keep everything else as generated, `transition-all` included. Verify with `pnpm --filter web exec tsc -b`.
  - _Note (apply):_ the CLI also added a bogus `cn` dependency to `apps/web/package.json`; removed it with `pnpm --filter web remove cn`. The generated `value || 0` and `${number}` template fail the repo's strict lint (`prefer-nullish-coalescing`, `restrict-template-expressions`), so, as for `sidebar.tsx`, `eslint.config.js` downgrades those two rules to warnings for `progress.tsx` instead of editing the generated file.
- [x] 1.6 Create `apps/web/src/features/feed/components/FeedScrollCounter.tsx` (props `scrolled`, `total`, `round`), styled per design.md Decisions 12 and 17 and `mockup.md`. Its root is a `flex min-w-0 flex-1 items-center gap-2 ml-2` group holding, in order:
  - when `round > 1`, a pill `Round {round}` in `shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-300`;
  - `<Progress value={(scrolled / total) * 100} aria-hidden className="min-w-12 flex-1" />`;
  - the count `{scrolled}/{total}` in `shrink-0 text-sm font-medium text-muted-foreground tabular-nums`, with no spaces.

  No animation on the text, no live region and no `aria-label`. Verify with `pnpm --filter web exec tsc -b`.

- [x] 1.7 Wire it up in `apps/web/src/features/feed/components/FeedContainer.tsx`:
  - a `headerRef` on the sticky `<header>`;
  - `total` from the latest page (`data.pages.at(-1)?.data?.total ?? 0`);
  - `useFeedScrollCounter`, and `ref={observeCard}` on each `FeedItem`;
  - the title row becomes `justify-between gap-3`, with `FeedScrollCounter` filling the rest of it after the `h1`, shown only when `hasPages && total > 0` (Decision 8).

  The row stays `h-12`. Nothing in this group may call `refetch`, `fetchNextPage` or invalidate the feed for the counter. Verify with `pnpm --filter web exec tsc -b`.

- [x] 1.8 Browser check, as U15 at phone and desktop width, in light and dark, against `mockup/A · In the Feed title row (chosen).png`, `mockup/Desktop · A.png` and `mockup/F · Track fills the title row.png`:
  - **Placement:** the count sits at the right of the "Feed" row, and the header height and note input are unchanged.
  - **Bar:** the bar runs from just after "Feed" to the count, and its filled part matches `n/15` (e.g. a third at `5/15`), on phone and desktop.
  - **First page:** the count equals the number of cards at least half visible.
  - **Scrolling:** scrolling a card to half visible adds 1; a card with only its top third visible doesn't count; a card half hidden under the sticky header doesn't count from there.
  - **Fling:** a fast fling counts every card that passed.
  - **Loaded, not in view:** after the second page loads below the view, the count doesn't change until its cards are in view.
  - **Tall card:** a 1000-character note made as U15 counts once it covers half of the scroll area.
  - **Requests:** the network panel shows no `GET /api/v1/feed` beyond the sentinel's pages while scrolling.
  - **Screen reader:** the counter's accessibility node is the plain text `n/15`, with no live region, and the bar isn't in the accessibility tree (no `progressbar` node).
  - _Note (apply):_ the app has no theme switch (dark styles only apply under a `.dark` class that nothing sets), so dark was checked by adding `.dark` to `<html>` by hand. The browser pane was hidden (about 2 fps), so a real fling couldn't be judged; a frame-stepped fast scroll (60 px per frame) counted every card it passed. The tall note was 909 characters on 70 lines (1519 px tall against a 662 px area): not counted at 300 px visible, counted at 340 px. The bar has `aria-hidden="true"`; the pane's tree tool is DOM-based and still lists it, so the browser's real accessibility tree wasn't inspected. The only live region on the page is the existing toaster. The generated Progress doesn't pass `value` to the Radix root, so it reports `data-state="indeterminate"`; harmless while it's `aria-hidden`.
- [x] 1.9 Browser check of reset and visibility:
  - **Reload:** after a reload, the counter starts again from the first page's half visible cards.
  - **Dashboard round trip:** after going to Dashboard and back, it starts again.
  - **Loading:** while the first page loads (throttle the network), only "Feed" shows, with no bar.
  - **First page error:** with the API stopped and the page reloaded, only "Feed" shows next to the error.
  - **No notes:** as U0, only "Feed" shows above the empty state.
  - **Next page error:** as U15, the counter and the bar keep their values after the API is stopped and the sentinel's next page fails.
  - _Note (apply):_ with the API stopped before a reload, `auth/me` fails and the app never reaches the feed, so the first page error was reached by opening Dashboard, stopping the API, then opening Feed. Loading was checked by sampling the title row on every DOM change during the Dashboard → Feed trip instead of throttling: "Feed" alone, then the count. For one frame after the first page renders the count reads `0/15`, until the observer's first callback.
- [x] 1.10 Gate: prisma generate, `pnpm build`, `pnpm lint`.

## 2. The total follows created and deleted notes

- [x] 2.1 In `apps/web/src/features/feed/hooks/useFeedScrollCounter.ts`, take the loaded `items` and derive `scrolled` as the number of `counted` ids still among the item ids, capped at `total`. Prune ids that left `items` from `counted` (design.md Decision 5). Add `noteCreated()`, which stores `{ created, pageCount }`. The extra total is `created` while `pageCount` equals `data.pages.length`, and 0 otherwise (Decision 16, derived during render with no reset effect). The hook now takes `pageCount` and the latest page's `total`, and returns the combined total. Verify with `pnpm --filter web exec tsc -b`.
- [x] 2.2 In `apps/web/src/features/feed/components/FeedNoteInput.tsx`, add an optional `onCreated?: () => void` and call it right after `createNote(...).unwrap()` succeeds. In `FeedContainer.tsx`, pass `items` and the page count to the hook, and pass `noteCreated` as `onCreated`. Don't touch `features/notes/api/notes.api.ts`: create still doesn't patch the feed cache. Verify with `pnpm --filter web exec tsc -b`.
- [x] 2.3 Browser check as U15:
  - **Create:** from `n/15`, creating a note shows `n/16` at once.
  - **Next page after a create:** once the next page loads (its `total` is 16), the total stays 16.
  - **Delete a counted note:** deleting a counted note shows `(n-1)/15`.
  - **Delete an uncounted note:** deleting a card that only peeks in at the bottom (never half visible) shows `n/15`, with only the total dropping.
  - **Bar:** after each of these, the bar's fill matches the new count.
  - _Note (apply):_ observed `4/15` → create → `4/16`; page 2 loaded → `10/16`; delete a counted note → `9/15` (bar 60%); after a reload, delete the card at 39% → `4/15` → `4/14` (bar 28.6%). U15 was topped back up to 15 notes by curl afterwards.
- [x] 2.4 Browser check as U8: scroll to the end ("That's all for now") at `8/8`, then create a note. The counter shows `8/9`, and the network panel shows no `GET /api/v1/feed` after the create.
- [x] 2.5 Gate: prisma generate, `pnpm build`, `pnpm lint`.

## 3. Rounds

- [x] 3.1 In `apps/web/src/features/feed/utils/feed.utils.ts`, extend `countScrolledCard` (design.md Decisions 7 and 15):
  - a known id when `counted.size >= total` returns `{ counted: new Set([noteId]), round: round + 1 }`;
  - any other known id returns the state unchanged.

  Update the doc comment to name Round. Verify with `pnpm --filter web exec tsc -b`.

- [x] 3.2 Browser check as U15, against `mockup/Counter states (A).png`, `mockup/F · Track fills the title row.png` and, in dark, `mockup/A · Dark, round 2.png`:
  - **End of round 1:** scrolling the last uncounted note shows `15/15` with a full bar and no pill, and it holds while those cards stay in view.
  - **Round 2:** the first repeated card that becomes half visible shows the `Round 2` pill, then the bar back at 1/15, then `1/15`.
  - **Round 3:** scrolling on through round 2 starts `Round 3` and `1/15` the same way.
  - **Reload:** after a reload, the pill is gone and the count starts again.
  - **Header resize:** at `15/15`, typing a multi-line note (the header grows) doesn't start a round.
  - _Note (apply):_ observed `15/15` (full, no pill) → `Round 2` + `1/15` (6.7%) → … → `Round 2` `15/15` → `Round 3` + `1/15`. Pill colors are neutral-700 on #f5f5f5 and neutral-300 on #262626. Growing the header at `15/15` (102 → 252 px) doesn't start a round. **Open question for the owner:** a header tall enough to cover a counted card, shrinking back (text cleared without sending), re-reveals that card, and at `15/15` that starts `Round 2` with no scrolling. That follows the spec's rule ("a card that already counted becomes half visible"), so the code is unchanged. _Owner decision 2026-11-18: keep the spec rule._ On the way to round 3 the feed stalled at the bottom (a page of only repeats doesn't grow the list, so the sentinel never leaves the view); that's the existing sentinel behavior, outside this change. Scrolling up and back down went on.
- [x] 3.3 Browser check as U8: at the end of the feed the counter stays `8/8` with a full bar and no pill, and no round 2 starts.
  - _Note (apply):_ observed `4/8` → … → `8/8` (full bar, no pill) at "That's all for now", with one feed request. **Open question for the owner:** scrolling back up after `8/8` starts `Round 2` (`1/8`, `2/8`, …), because a counted card becomes half visible again. design.md Decision 7 says a short feed "stays at N/N", assuming only re-served notes repeat. The spec rule allows the scroll-back flip, and the "Short feed" scenario only covers the end of the feed. Code unchanged. _Owner decision 2026-11-18: keep the spec rule; Decision 7's "stays at N/N" holds only while the user doesn't scroll back._
- [x] 3.4 Gate: prisma generate, `pnpm build`, `pnpm lint`.

## Workflow follow-up

- No owner steps on prod: this change has no migration, backfill or API change, and the web app ships with the normal Vercel deploy.
- After apply: `/opsx:verify`, then `/opsx:archive` as the PR's last commit. `CONTEXT.md` already has Scrolled and Round.
