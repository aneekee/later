# Design

## Context

See proposal.md (Why) for the storm and its three causes. The current web code:

- `feed.api.ts`: the `feed` infinite query uses its page param as a counter only. `getNextPageParam` returns a next page whenever `lastPage.data.total > lastPage.data.items.length`, so with more than 10 notes there is always a next page. The query sends `queryArg.pageSize` (always `FEED_PAGE_SIZE` = 10).
- `FeedContainer`: it renders `dedupeKeepLast(pages)` and passes the counter `served` (all items across pages, duplicates included), `rendered`, `pageCount` and the latest page's `total`. `FeedSentinel` calls `fetchNextPage` when it enters view, guarded by `hasNextPage && !isFetching && !isFetchNextPageError`.
- `useFeedScrollCounter`: `total = latestPageTotal + createdSinceLatestPage`, and `toFeedRound(served - rendered + seen, total)` gives the round and the scrolled count.
- `notes.api.ts`: `deleteNote` runs `removeFeedItem`, which drops the note from every loaded page and lowers every page's `total` by 1. `createNote` doesn't touch the feed cache.
- The API already accepts `pageSize` from 1 to 50, and its order (never seen first, then effective staleness) puts the notes not yet served in this visit ahead of the ones just served.

## Goals / Non-Goals

**Goals:**
- Remove the storm by giving the visit an end, not by adding guards.
- Delete the code that only existed for endless rounds and created-note totals.

**Non-Goals:**
- Changing the sentinel, the spinner or `FeedLoadMoreError`.
- Making the multi-tab case exact. It only has to stay valid (no duplicate cards, no request loop).

## Decisions

### D1. A Feed visit ends after one round

`getNextPageParam` returns `undefined` once the notes fetched in the visit reach the visit total, so `hasNextPage` turns false, `FeedEnd` renders, and the sentinel's guard blocks every later call.

- *Rejected:* keep the feed endless and fix only the sentinel loop, for example by rendering the spinner below the sentinel, or by fetching again only after new cards appear. That keeps `toFeedRound`, the round pill and the created-note state, and it adds a guard, which goes against the ask.

### D2. The page param is the requested page size

`initialPageParam` is `FEED_PAGE_SIZE`. `query` sends `pageSize: pageParam`. `getNextPageParam(_last, allPages, _lastParam, _allParams, queryArg)` computes:

```
visitTotal = allPages[0].data.total
fetched    = sum of allPages[i].data.items.length
remaining  = min(visitTotal, lastPage.data.total) - fetched
next       = remaining > 0 ? min(queryArg.pageSize, remaining) : undefined
```

The `min` with the last page's `total` makes the visit always end, even when another device deletes notes during it. The API returns at least one note whenever its `total` is above 0, so each page either raises `fetched` or brings `remaining` to 0 or below. Without it, an API that now holds 0 notes would return empty pages while `remaining` stays above 0. That brings back the original loop, because the spinner moves the sentinel out of view and back with no new cards. A create mid-visit raises only the last page's `total`, so the `min` ignores it.

The query arg `{ pageSize: FEED_PAGE_SIZE }` stays as the maximum page size and as the cache key, so `notes.api.ts`'s `updateQueryData('feed', { pageSize: FEED_PAGE_SIZE }, …)` calls don't change. The 15-note case loads 10 + 5, and the API returns exactly the 5 notes not yet served, so a single-tab visit has no repeats.

- *Rejected:* keep `pageSize` 10 and stop once `fetched >= total`. The last page would repeat just-served notes, mark them seen again on the API, and move them to the bottom of the list.

### D3. The visit total is the first page's total, kept current by deletes

`allPages[0].data.total` is fixed when the first page loads. `removeFeedItem` already lowers every page's `total` and removes the note's items, so a delete keeps `remaining` correct with no new code:
- Deleting a loaded note lowers both `visitTotal` and `fetched`, so `remaining` stays the same.
- An unloaded note can't be deleted from the feed, so that case doesn't arise in this tab.

Creates don't touch the cache, so they never change the visit total. That matters because the API's next page would count the created note in its `total`. Following the latest total would request one more page, and the API would fill it with a note already shown, since a created note is stored as just seen.

`hasNextPage` and `fetchNextPage` read the current cache when they run, so a patch from `removeFeedItem` is picked up. Apply checks this in the browser (task 1.4).

- *Rejected:* the latest page's `total`. A create mid-visit then pulls an extra page of repeats, so the visit would need the dedupe for correctness, not just as a safety net.

### D4. The counter uses the visit total and counts rendered cards only

`useFeedScrollCounter` takes `total` (the visit total) and returns `{ scrolled: seen, total, cardsRef }`. It no longer takes `served`, `rendered`, `pageCount` or `latestPageTotal`, and the `created` state, `noteCreated` and `toFeedRound` are deleted. `FeedScrollCounter` loses its `round` prop and the pill. `FeedNoteInput` loses the optional `onCreated` prop, whose only caller was the counter.

`seen` already caps at the number of rendered cards, which in a single-tab visit equals the visit total, so the count never goes past it.

- *Rejected:* keep `+created` in the total. The counter would show `8/9` at the end of a visit that can never reach 9, and it keeps state whose only purpose was rounds.

### D5. Keep `dedupeKeepLast` as a safety net

When another tab or device serves or deletes notes during the visit, the API can return a note this tab already shows. `dedupeKeepLast` stays, so such a note renders once, with a unique React key. The stop rule counts fetched items, duplicates included, so the visit still ends.

- *Rejected:* delete it. That saves a few lines, but a multi-tab visit could then render a note twice and warn about duplicate keys.

### D6. Docs

`CONTEXT.md` is updated with the `domain-modeling` skill:
- **Feed** is still a rotation on the API, but a visit goes through it once.
- **Round** moves to the retired terms ("Removed in #180").
- The Purpose line of `openspec/specs/feed/spec.md` drops "endless queue".

## Risks / Trade-offs

- [A note created during the visit isn't fetched until the next visit] → the owner accepted this. It is created as seen, so it sits at the end of the rotation anyway.
- [Another tab or device changes notes or the rotation mid-visit] → the dedupe keeps the list valid. The visit may end a page early or late, and the counter may show the wrong number until the next visit.
- [Another device deletes notes during the visit, so pages come back short or empty] → the `min` with the last page's `total` (D2) ends the visit. For an empty page, that `total` is 0. The counter still shows the first page's total and may not reach it in that visit. Accepted.
- [`hasNextPage` might not follow a cache patch] → checked by hand in task 1.4. If it doesn't follow, apply stops and asks, because the fix would change D3.

## Migration Plan

Web only. Ship with the normal Vercel deploy, and roll back by reverting the PR. There is no API, data or migration step.
