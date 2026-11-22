# Proposal

## Why

Issue #180. Scrolling to the bottom of the feed a second time can start a request storm: `GET /api/v1/feed` repeats several times a second, from a dozen to a couple of hundred times, while the user doesn't move. Every request marks 10 notes as seen and writes a `performance_events` row. Three things combine:

- the web feed never ends, so a next page always exists once a user has more than 10 notes;
- after the first wrap, every new page reorders cards higher up but leaves the bottom of the list as it was;
- the spinner pushes the sentinel out of view while a page loads, and the sentinel comes back into view when the spinner goes.

The owner wants a simple fix that makes the code smaller, not one that adds guards, and accepts that notes created during a visit don't show up until the next visit.

## What Changes

- **A Feed visit ends once every note was fetched.** Once the visit has fetched as many notes as the visit total, the web app requests no more pages and shows "That's all for now". A reload, or leaving the Feed page and coming back, starts a new visit, which continues the rotation on the API. Without a next page, the sentinel has nothing to fetch, so the storm can't start.
- **The last page asks only for the notes left.** Each request's `pageSize` is the smaller of 10 and the visit total minus the notes fetched so far. So 15 notes load as 10 + 5, and the visit shows each note once.
- **The visit total comes from the first page.** It is the first page's `data.total`, lowered by notes deleted during the visit. Notes created during the visit don't change it, and they aren't fetched until the next visit.
- **The counter follows the visit total.** It no longer adds created notes: at `8/8`, creating a note keeps `8/8`. It counts only the cards shown above the bottom of the scroll area.
- **Rounds are removed.** There is no `Round <n>` pill, and the count never goes past the total. **BREAKING** for the feed spec: the endless queue and the round requirement go.
- **The dedupe stays as a safety net.** A note served twice in one visit, which can happen when another tab or device moves the rotation, is still rendered once, at its latest position.
- **`CONTEXT.md`:** **Feed** is no longer an endless queue within a visit, and **Round** is retired.

**Out of scope**

- The spinner moving the sentinel out of view and back in. After this change it only happens while a page adds new cards, so it can't loop, and the markup stays as it is.
- Any API change: the rotation order, the tie-break by tier and creation time, `pageSize` limits (1 to 50) and `data.total` stay as they are.
- Fetching notes created during the visit (the ask allows ignoring them).
- Notes created, deleted or served by another tab or device during a visit. The dedupe keeps the list valid, and the counter may be off until the next visit.
- The counter's place, look and progress bar, other than the removed round pill.
- Unit tests for `apps/web`. The change is checked by hand in the browser.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `feed`:
  - A new requirement says a Feed visit ends once every note was fetched, and that its last page asks only for the notes left.
  - The counter's total follows deleted notes only, and the scrolled count no longer adds notes from earlier rounds.
  - The round requirement is removed, and the progress bar, restart and never-requests requirements lose their round and created-note wording.

## Impact

- **apps/web** (`features/feed`):
  - `feed.api.ts`: the page param becomes the requested page size, and `getNextPageParam` stops once the visit total has been fetched;
  - `FeedContainer`: the counter takes the first page's total, and `served` and `onCreated` go;
  - `useFeedScrollCounter`: the created-notes state, `noteCreated` and the rounds go;
  - `FeedScrollCounter`: the round pill goes;
  - `FeedNoteInput`: the `onCreated` prop goes;
  - `feed.utils.ts`: `toFeedRound` goes, `dedupeKeepLast` and `removeFeedItem` stay.
  - `notes.api.ts` doesn't change.
- **apps/api**: no change.
- **@later/types**: no change.
- **prisma/schema.prisma**: no change.
- **Docs**: `CONTEXT.md` (**Feed**, **Round**).
