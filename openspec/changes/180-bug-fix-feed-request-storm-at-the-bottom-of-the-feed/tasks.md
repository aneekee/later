# Tasks

Groups 1, 2 and 3 touch different files and can run in parallel, each in its own git worktree. They are small, so running them one after another in this order is the default.

Browser checks use the local stack (`docker compose up -d`, `pnpm dev`) and a local user with the stated number of notes, all in one tier, e.g. `t179_u15` for 15. Create notes for other counts as needed. Watch `GET /api/v1/feed` in the network tab.

## 1. The feed visit ends after one round

- [x] 1.1 In `apps/web/src/features/feed/api/feed.api.ts`, make the page param the requested page size (design D2): set `initialPageParam: FEED_PAGE_SIZE`, have `query` send `pageSize: pageParam`, and have `getNextPageParam` return `min(queryArg.pageSize, min(allPages[0] total, lastPage total) - fetched)` while that is above 0, else `undefined`. Rewrite the "page param is a counter" comment to describe the one-round visit. Verify `pnpm check-types` passes.
  - Note: `pnpm check-types` runs no task (no package defines `check-types`), so the type checks in this change use `pnpm --filter web exec tsc -b` instead.
- [x] 1.2 Browser, 15 notes at 1280×640 (issue #180's repro): scroll to the very bottom twice, then scroll up and down to the bottom several times. Verify exactly two requests, `pageSize=10` then `pageSize=5`, 15 distinct cards, "That's all for now", and no further request or spinner flicker (scenarios: Fifteen notes, Request sizes for 15 notes, Staying at the end). Repeat once at 375×812.
- [x] 1.3 Browser, 10 notes: verify one request and "That's all for now" under the 10th card. With 25 notes, verify `pageSize` 10, 10, 5 (scenarios: Exactly one page, Request sizes for 25 notes). Check the API side with curl or the network tab: the `pageSize=5` response for 15 notes holds the 5 notes not in page 1, with `total` 15 (scenario: The API serves the notes left).
- [x] 1.4 Browser, 15 notes: delete one card from page 1 before page 2 loads, then scroll down. Verify the next request is `pageSize=5`, the feed ends with 14 cards, and no further request is made (scenario: A loaded note is deleted before the last page). This also checks design D3: `hasNextPage` follows the cache patch from `removeFeedItem`. If it doesn't, stop and ask.
- [x] 1.5 Browser, 15 notes at "That's all for now": create a note. Verify no request is made and the note isn't added to the feed. Then reload and verify the first page is requested again (scenarios: Creating a note at the end, A new visit continues the rotation).
- [x] 1.6 Gate: `pnpm --filter api exec prisma generate`, `pnpm build`, `pnpm lint`.

## 2. The counter uses the visit total and has no rounds

- [x] 2.1 In `apps/web/src/features/feed/hooks/useFeedScrollCounter.ts`, take `scrollRef` and `total` only, and return `{ scrolled: seen, total, cardsRef }`. Delete the `created` state, `noteCreated` and the `toFeedRound` call (design D4). Verify `pnpm check-types` flags each caller that needs updating.
- [x] 2.2 In `apps/web/src/features/feed/components/FeedContainer.tsx`, pass `total` from `data.pages[0].data.total` (the visit total, design D3), and drop `served`, `pageCount` and `latestPage` where they are no longer used, along with `onCreated` on `FeedNoteInput`. Keep `dedupeKeepLast` (design D5). Verify `pnpm check-types` passes.
- [x] 2.3 In `apps/web/src/features/feed/components/FeedScrollCounter.tsx`, remove the `round` prop and the `Round <n>` pill. In `apps/web/src/features/feed/components/FeedNoteInput.tsx`, remove the `onCreated` prop. In `apps/web/src/features/feed/utils/feed.utils.ts`, delete `toFeedRound` and keep `dedupeKeepLast` and `removeFeedItem`. Verify `pnpm check-types` and `pnpm lint` pass, and that `grep -rn "toFeedRound\|noteCreated\|onCreated\|round" apps/web/src/features/feed` finds no leftover (except `rounded` class names).
- [x] 2.4 Browser, 300-note-style check with any user over 20 notes: verify the counter's scroll scenarios still hold (First page, Scrolling down, Scrolling back up, The next page loads, Next page loaded but not in view, Cards under the sticky header), and that the count reaches `N/N` with a full bar and no pill at the end (scenario: Every note scrolled).
  - Note: checked on a 30-note user. The Browser pane was hidden, which throttles `requestAnimationFrame`, so a reading taken right after a scroll can lag one step. Each check was read again once the frame ran.
- [x] 2.5 Browser: create a note mid-visit and verify the counter's total doesn't change, even after the next page loads (scenarios: Creating a note, A later page after a create). With 8 notes, at `8/8`, create a note and verify `8/8` stays and no request is made (scenario: Creating a note in a short feed).
- [x] 2.6 Browser: delete a card above the bottom of the scroll area (count and total both drop by 1), and one below it (only the total drops) (scenarios: Deleting a scrolled note, Deleting a note that never counted).
- [x] 2.7 Browser: at `15/15`, type a multi-line note until the header covers a card and clear it without scrolling. Verify `15/15` stays. Then reload at the end, and also go to the Dashboard and back, and verify the counter restarts from the new first page (scenarios: Note input grows and shrinks at N/N, Scrolling after the note input shrinks, Reload, Visiting the dashboard). Check that a tall card moves the count by several (scenario: A tall card).
  - Note: on the first try, focusing the input with a mouse click and typing 7 lines at `15/15` didn't scroll-anchor on grow (the cards moved down 170 px, `14/15`), and clearing kept `14/15`. Two retries at the bottom (one with real keys, one through the input event) anchored both ways and kept `15/15`. The measuring code isn't changed by this change, so this looks like a browser scroll-anchoring quirk, not a regression.
- [x] 2.8 Gate: `pnpm --filter api exec prisma generate`, `pnpm build`, `pnpm lint`.

## 3. Docs

- [ ] 3.1 With the `domain-modeling` skill, update `CONTEXT.md`: **Feed** stays a rotation on the API, but one visit goes through the notes once and then ends. **Scrolled** no longer refers to rounds. Move **Round** to "Retired terms" as "Removed in #180". Verify `grep -n "endless\|Round" CONTEXT.md` shows only the retired entry.
- [ ] 3.2 In `openspec/specs/feed/spec.md`, edit the Purpose line only, so it no longer says "endless queue" (for example: "Serves a user's own notes stalest first, adjusted by each note's tier, one round per visit, and lets the user re-tier a note straight from its feed card"). Verify `openspec validate 180-bug-fix-feed-request-storm-at-the-bottom-of-the-feed --strict` passes.
- [ ] 3.3 Gate: `pnpm build`, `pnpm lint`.

## Workflow follow-up

- Run `/opsx:verify`, then `/opsx:archive` as the PR's last commit.
- Squash-merge the PR as `180-bug-fix-feed-request-storm-at-the-bottom-of-the-feed`. Nothing runs on prod: there is no migration or backfill.
