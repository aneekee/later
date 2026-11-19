# Design

## Context

For motivation, see `proposal.md` (Why); for the observable behavior, see `specs/feed`. Here is the current state this design builds on:

- **API:** `GET v1/feed` already returns `{ items, total }`. `FeedService.getNextPage` counts the user's notes in the same transaction that marks the page as seen. No API, `@later/types` or Prisma change is needed, and no raw SQL changes.
- **Feed cache** (`features/feed/api/feed.api.ts`):
  - It's an RTK Query infinite query with `keepUnusedDataFor: 0`. `FeedContainer` is its only subscriber, so leaving the Feed page drops the cache, and coming back loads a fresh first page.
  - `getNextPageParam` reads `lastPage.total > lastPage.items.length`. So a feed with 10 or fewer notes ends, and a longer one never ends.
  - The cache is never refetched or invalidated (each request marks notes as seen); the note mutations patch it.
- **Rendering** (`FeedContainer`):
  - `dedupeKeepLast` flattens the pages. A note served again in a later page keeps its React key, so its card moves to the newest position.
  - The scroll container is the `scrollRef` div. Inside it, the sticky `<header>` holds the "Feed" `h1` row (48 px) and `FeedNoteInput`, whose textarea grows up to `max-h-48`. So the header height changes while the user types.
  - The header is in the normal flow, so when it grows or shrinks while the feed is scrolled, the browser's scroll anchoring moves `scrollTop` by the same amount. The cards stay where they are on screen, the header covers or uncovers them, and a `scroll` event fires (measured: a 7-line draft moved `scrollTop` 400 → 544 → 400, and a card's top stayed at 207 px).
  - `FeedSentinel` already uses an `IntersectionObserver` with `root: scrollRef.current`.
- **Delete** (`notesApi.deleteNote`): on success, `removeFeedItem` drops the note from every page and lowers each page's `total` by 1.
- **Create** (`notesApi.createNote`): it doesn't touch the feed cache. The note is created as seen and comes back later at the end of the rotation.
- **Glossary:** `CONTEXT.md` already defines **Scrolled** and **Round**. Seen keeps its server meaning.
- **UI reference:** `mockup.md` and `mockup/*.png` in this change folder, variant A with progress bar F.
- **shadcn:** the web app uses the `radix-nova` style (`components.json`) and the `radix-ui` package. There's no `progress.tsx` in `shared/components/ui` yet.

## Goals / Non-Goals

**Goals:**

- Count what the user actually looked at, in real time, using only the data the feed already has.
- Keep the feed cache rule intact: nothing in this change requests, refetches or invalidates the feed.
- Keep the counting rules in one pure function and the browser plumbing in one hook, so the rules can be read and changed in one place.

**Non-Goals:**

- Sharing the counter with any other page, or storing it.
- Changing the feed's paging, dedupe, the sentinel or the end-of-feed logic.
- Automated tests: `apps/web` has no test runner. The checks are manual (Decision 11).

## Decisions

### 1. Count cards as they come into view, not fetched pages

Each card that comes into view adds 1. This is the "ideal" behavior from the ask, and it reflects real progress.

- _Rejected: count per fetched page (10, 20, 30…)._ It's trivial to build, but it runs ahead of the user, because the sentinel loads the next page before the user reaches it, and it jumps by 10.

### 2. Half visible below the sticky header, no dwell

- **The rule:** a card counts once at least 50% of it is visible in the scroll container below the sticky header.
- **Tall cards:** a card taller than that area counts once it covers half of it, so a long note (up to 1000 characters on a phone) can count at all.
- **No dwell:** a fast fling counts.

Rejected alternatives:

- _Any pixel visible._ The count runs one card ahead of what was read.
- _Fully visible._ A tall card could never count without a special case.
- _Half visible for about 300 ms._ It ignores flings, but it's more state and hard to check by hand.

### 3. A new term, Scrolled, separate from Seen

Seen is the server's "the feed served it" (`seenAt`, set for the whole page). The counter counts something else, so it gets its own term, **Scrolled**, and the next pass gets **Round**. Both are in `CONTEXT.md`.

- _Rejected: reusing Seen._ It blurs the meaning the rotation depends on.
- _Rejected: other names._ "Viewed" and "read" are on Seen's Avoid list, and "progress" names the display, not the concept.

### 4. The total is the latest page's `total` plus the creates since that page

The total is `data.pages.at(-1).data.total` plus a local count of notes created since that page landed. The local count goes back to 0 whenever a new page arrives, because that page's `total` already includes those notes. Delete needs nothing extra here: `removeFeedItem` already lowers every page's `total`.

- _Rejected: patching the cache's `total` on create._ `getNextPageParam` compares `total` with the last page's item count. With 10 or fewer notes, `+1` would flip `hasNextPage`, show the sentinel and fetch a page, which marks notes as seen. That breaks the feed cache rule.
- _Rejected: ignoring creates._ The total would read low (`10/300` instead of `10/302`) until the next page.
- _Rejected: `v1/stats/notes/totals`._ It's an extra request, it's just as stale on create unless the stats API is invalidated too, and it duplicates a number the feed already sends.

### 5. Delete: Scrolled means counted notes that still exist

The scrolled count is the number of the round's counted note ids that are still among the loaded feed items. Deleting a counted note therefore lowers it by 1 (`12/300` → `11/299`). Deleting a note that never counted lowers only the total (`12/300` → `12/299`); the owner confirmed this edge case.

The delete flow needs no wiring: `removeFeedItem` drops the id from the items, and the hook prunes ids that left the items from the counted set. The counted set therefore only ever holds loaded notes, so its size is the scrolled count (Decision 15), and a note that comes back can't be miscounted.

- _Rejected: keeping the scrolled count on delete._ Scrolled could overtake the total, and the round could never end exactly at `N/N`.
- _Rejected: always lowering both numbers._ Removing a note that never counted would lower the count of notes that did count.

### 6. The counter lives as long as the loaded feed

The state lives in a hook used by `FeedContainer`, as plain React state. It starts over exactly when the feed cache does: on a reload, and when the user leaves the Feed page and comes back. So it always matches the cards on screen.

- _Rejected: resetting only on reload, with app-level state (a Redux slice)._ The returning feed loads a new first page with different notes, so the counter would no longer match the cards on screen.

### 7. Rounds are in scope, and a round flips on the next repeated card

When the counted set covers the total, the counter holds at `N/N`. The next card that newly qualifies and is already in the set starts the next round: the set becomes `{ that id }`, so the count is 1, and the round goes up by 1. Cards that stay in view across the flip don't count again until they leave and come back. A short feed (10 or fewer notes) never serves a repeat, so it stays at `N/N` until the user scrolls back to a card that already counted; that card starts the next round, as in any feed.

The note input growing or shrinking doesn't count as a card coming back. At `N/N`, a counted card that a long draft covers and that clearing the draft uncovers, with no scrolling in between, starts no round (owner, 2026-11-18, PR #177 review finding 3). This replaces the rule kept during apply, where the uncover flipped the round. Scrolling back to a counted card still starts the next round.

- _Rejected: keeping the uncover flip._ It came only from rebuilding the observer on each header resize (Decision 14), and the user did nothing in the feed to start a round.
- _Rejected: leaving rounds out and capping at `N/N`._ With about 15 notes the cap is reached after two pages, so small accounts would sit at `N/N` for most of their visit.
- _Rejected: flipping to round 2 at once, at `0/N`._ It would happen while the user is still looking at round 1's last card, and `N/N` would never show.

### 8. The counter shows only while notes are loaded

It shows when the feed has at least one loaded page and the total is above 0. So it's hidden while the first page loads, when the first page fails and in the empty state. It stays visible while a next page loads, after a next page fails, and at the feed's end.

- _Rejected: always reserving its spot, with a placeholder (`–/–` or a skeleton)._ The header wouldn't shift, but there'd be an extra state to design and nothing useful to show.

### 9. No special handling for screen readers

The counter is plain text, with no live region and no extra label. The progress bar gets `aria-hidden`: Radix Progress renders `role="progressbar"` with a percentage, which would repeat the text in another form.

- _Rejected: a full label ("12 of 300 notes scrolled"), still not announced._ The owner preferred plain text.
- _Rejected: announcing only round changes._ It adds a live region for a rare event.
- _Rejected: exposing the bar as a progressbar._ A screen reader would read `12/300` and then "4%", the same fact twice.

### 10. The spec pins the existing `total`

`specs/feed` gains an API requirement for `data.total`, because the counter now depends on it. The API code doesn't change.

- _Rejected: web scenarios only._ A later API change could drop `total` without any spec saying the web app relies on it.

### 11. Manual verification on a test account with about 15 notes

The checks run in the browser at phone width (the 375 px `mobile` preset; mock A is 390 px, the bar sheet F 375 px) and at desktop width. The test user has about 15 notes, so there are two pages and round 2 can be reached. Separate users cover 8 notes (a short feed) and 0 notes. The build gate runs at the end of each group.

- _Rejected: adding Vitest to `apps/web` to unit-test the counting function._ It brings a new tool into the repo, which is a chore of its own.

### 12. Placement: the "Feed" title row, with the bar filling it (mock variant A with bar F)

The counter sits in the existing 48 px title row of the sticky header, in the same place on every screen width. The header's height stays the same. The counter group takes the rest of the row after the title: the round pill (from round 2), the progress bar, then the count. The look is in `mockup.md`:

- **Group:** `flex min-w-0 flex-1 items-center gap-2 ml-2`. With the row's `gap-3`, the bar starts 20 px after "Feed", so it reads as part of the counter, not as a rule under the title.
- **Bar:** `<Progress className="min-w-12 flex-1" />` (Decision 17). It's about 225 px wide on a 375 px phone (about 155 px with the pill) and about 450 px in the 600 px desktop column.
- **Count:** `shrink-0 text-sm font-medium text-muted-foreground tabular-nums`.
- **Round pill:** `shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium`, with its text in `neutral-700` / `dark:neutral-300`. The theme's `muted-foreground` is too low in contrast on `bg-muted`, so it isn't used for the pill.

The ask's 2026-11-18 update asked for a bar after the counter's look was settled, so the bar was added to A rather than reopening the placement.

Rejected alternatives:

- _B: a pill next to the title with a 2 px progress line along the header's bottom edge._ The line is apart from the count, across the whole header, and reads like a loading indicator.
- _C: the app top bar (`AppLayout`)._ That bar is shared by every page, so the feed would need a portal or a layout context to fill it. That's more wiring for no gain.
- _D: a 64 px bar before the count, and E: an 80 px bar under the count._ At `12/300` their fill is 2–3 px, a dot. F's bar shows about 9 px on a phone and 18 px on desktop.
- _A ring next to the count, or a pill whose fill is the progress._ Neither is the plain shadcn Progress the ask names.

### 13. No animation on the text; the bar keeps the component's slide

The text just changes. `tabular-nums` keeps the width steady while digits change. The bar keeps the plain Progress's `transition-all`, so its fill slides for about 150 ms on each change, and back to nearly empty when a round starts.

- _Rejected: fading in the round pill (about 150 ms)._ A small effect for a rare event, plus a reduced-motion branch.
- _Rejected: animating the digits._ It flickers on every card during a fast scroll.
- _Rejected: removing `transition-all` from the generated `progress.tsx`._ The owner chose the component exactly as `shadcn add` writes it.

### 14. One check of the cards in view, found by their position in the list

`useFeedScrollCounter` (in `features/feed/hooks`) holds the state. It finds the cards in the DOM, so no card registers with it (revised after the owner's review of PR #177: no observer per card and no `ref` on each card). It takes three refs: `scrollRef`, `headerRef` and `listRef`, the wrapper whose direct children are the cards.

- **Which cards are in view:** the cards are the list's direct children with `data-note-id`, stacked top to bottom in DOM order. A binary search on the children's rects finds the first child whose bottom is below the scroll container's top. From there the check walks forward until a child starts below the container's bottom. That's about 9 rect reads for 300 cards, plus the handful in view. The list's other children (skeleton, spinner, errors, end and sentinel) sit in the same stack, and the `data-note-id` test skips them. The geometry is a pure function in `feed.utils.ts`.
- **Whether a card qualifies:** the check reads the card's rect, the scroll container's rect and the header's bottom edge, and works out the visible height below the header. A card qualifies when that height is at least half of the smaller of the card's height and the area's height (Decision 2: half the card, or half the area for a tall card). This is `isHalfVisible` in `feed.utils.ts`.
- **When the check runs:** on the scroll container's passive `scroll` event, at most once per animation frame, and on one `ResizeObserver` of the list, the header and the scroll container. The `ResizeObserver` covers the layout changes that come without a scroll: a page loading, a delete pulling the next card up, the note input growing or shrinking, and the window resizing. It also fires once when it starts, which runs the first check. When the cards are shorter than the scroll container, `flex-1` stretches the list, so a delete doesn't resize it; but then every card is already fully in view and has counted.
- **Header resizes change nothing by themselves (Decision 7).** The check skips a card whose top, relative to the scroll container, is the same as at its last check. Scroll anchoring keeps the cards still on screen when the header resizes (Context), so the check that the resize and its `scroll` event run re-checks nothing. Scrolling or a layout change moves the cards, so they're checked against the header's height at that moment, and no card can get stuck: a card the header uncovered counts on the next scroll that moves it.
- **Leaving:** a card that's no longer among the cards in view, because it scrolled out or was deleted, loses its last top and stops qualifying.

A card counts only when it goes from not qualifying to qualifying. `FeedItem` takes only `item`, and puts `data-note-id` on its `Card` root.

- _Rejected: one `IntersectionObserver` over every card, registered through a stable ref callback passed to each `FeedItem` (group 4)._ Every card needed a `ref` prop, and the hook kept the observer, a set of mounted cards and a map of the cards in view in refs, plus a guard for entries delivered after a card unmounted, only to learn which cards are on screen. The layout already says that, and a `0.5` threshold was needed just to catch a delete pulling a card up.
- _Rejected: measuring every card on each check._ Its layout reads grow with the loaded cards, up to a few hundred. The binary search keeps them to about `log2(cards)` plus the cards in view.
- _Rejected: rebuilding an observer with `rootMargin: -<header height>px` on each header resize (the first build)._ Every typed line re-observed every card and re-rendered the feed. It also needed the qualifying set to survive rebuilds, and it started a round when clearing a draft uncovered a counted card.
- _Rejected: an observer with a dense threshold list (every 0.02)._ About 50 callbacks per card per pass, for every card. It still missed very tall cards: on a 10 000 px card, 2% is 200 px, so the check ran too rarely (QA's M1: it counted at 425 px instead of 331 px, and never on a 568×320 screen).
- _Rejected: one observer per card, in `FeedItem`._ It means as many observers as cards, and the round logic would still need a shared owner.

### 15. The counting rules are one pure function in `feed.utils.ts`

`countScrolledCard(state, noteId, total)` takes `{ counted: Set<string>, round: number }` and returns the next state:

- a new id is added;
- a known id when `counted.size >= total` starts the next round with only that id;
- any other known id changes nothing.

The hook calls it on each newly qualifying card. The scrolled count shown is `counted.size`, capped at the total. This is the same number the round check reads, so the count can't show less than `N/N` when a round flips. The prune (Decision 5) keeps `counted` to loaded notes, and the hook counts only ids of cards in the DOM (Decision 14).

- _Rejected: putting the rules inline in the hook's check._ They'd be mixed with the browser plumbing and harder to read and check.
- _Rejected: showing the counted ids still in `items`, filtered on each render (the first build)._ The shown count and the round check could disagree. For example, with one stale id the counter would show `299/300` while the round check saw 300 and flipped (PR #177 review, finding 2).

### 16. Creates reach the counter through a callback

`FeedNoteInput` takes an optional `onCreated()` and calls it after `createNote(...).unwrap()` succeeds. `FeedContainer` passes in the hook's `noteCreated`. The hook stores the created count together with the page count at the time. When a new page arrives, the stored page count no longer matches, so the created count reads as 0 again (Decision 4). This is derived during render, with no reset effect.

- _Rejected: a listener in the store on `createNote` fulfilled, plus a slice._ It's app-level state for a value that lives only as long as the page.
- _Rejected: patching the cache (Decision 4)._

### 17. The bar is the plain shadcn Progress

`pnpm --filter web exec shadcn add progress` writes `shared/components/ui/progress.tsx` in the project's `radix-nova` style: a 4 px (`h-1`) `rounded-full` track in `bg-muted` and a `bg-primary` fill, moved with `translateX`. It's kept as generated, except for the bogus `cn` import the CLI writes (CLAUDE.md), which points to `@/shared/lib/utils`.

`FeedScrollCounter` passes `value={(scrolled / total) * 100}` and `aria-hidden`. The component computes the fill from a 0–100 value and ignores `max`, so the percentage is worked out by the caller. The counter only shows when `total > 0` (Decision 8), so there's no division by 0.

- _Rejected: the base-ui Progress the ask links to._ The project is set up for radix (`components.json`), so `shadcn add` writes the radix version, and it looks the same.
- _Rejected: a hand-made bar (`div`s)._ The ask names the plain shadcn component.
- _Rejected: `max={total}` with `value={scrolled}`._ The generated component's fill ignores `max`.

### 18. A count re-renders the header only, not the cards

The counter's state lives in the hook in `FeedContainer` (Decision 6), so each count re-renders `FeedContainer`. `FeedItem` is wrapped in `memo`. Its only prop, `item`, doesn't change when the count does: it keeps its reference through the cache's structural sharing and `dedupeKeepLast`'s `filter`. No ref is passed to the cards (Decision 14). So a count skips every card. A tier change still re-renders its own card, because the cache patch gives that `item` a new reference.

- _Rejected: moving the counter state into a store that only `FeedScrollCounter` subscribes to (`useSyncExternalStore`)._ `FeedContainer` wouldn't re-render at all, but it's more machinery than one `memo`, and the remaining re-render is the header and a list of skipped cards.

## Risks / Trade-offs

- [A create that finishes while the next page's request is in flight can be counted twice, or not at all, until the following page.] → Accepted: it's off by 1 for one page, and the next page's `total` corrects it.
- [Notes deleted in another tab or device stay in the loaded items, so the counted set can be larger than a later page's `total`.] → The shown count is capped at the total, and a round ends at `counted.size >= total`.
- [A very fast fling can skip a card that is never painted at least half visible in any frame.] → Accepted: the spec only asks to count cards that were half visible "for a moment".
- [The check reads layout on each scroll frame.] → At most once per frame, for about `log2(cards)` children in the binary search plus the cards in view, the scroll container and the header, while the scroll has just left layout clean.
- [A card the grown header covers is still marked qualifying until something moves it.] → If the user scrolls while it's covered, it stops qualifying. Clearing the draft and scrolling again then counts it as coming back, and at `N/N` that starts a round. Accepted: the user scrolled it back into view.
- [A layout change that resizes none of the list, the header and the scroll container doesn't run the check.] → None is known: a card's own size change resizes the list. Accepted: the next scroll frame checks the cards.
- [In light mode the bar's empty track (`bg-muted` on the white header) is barely visible, so early in a round the bar is a short dark dash on its own.] → Accepted: it's the plain component's look, and dark mode shows the whole track.
- [At 1–2% the fill is a sliver (`1/300` is under 1 px), and 99% looks full.] → Accepted: the count next to it gives the exact value.

## Migration Plan

Web only, with no data or API change. It ships with the normal Vercel deploy of `apps/web`, and reverting the merge rolls it back. There are no owner steps on prod.
