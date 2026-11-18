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

Because the count is derived from the loaded items, the delete flow needs no wiring: `removeFeedItem` drops the id, and the count follows. Ids that left the items are also pruned from the counted set, so a note that comes back can't be miscounted.

- _Rejected: keeping the scrolled count on delete._ Scrolled could overtake the total, and the round could never end exactly at `N/N`.
- _Rejected: always lowering both numbers._ Removing a note that never counted would lower the count of notes that did count.

### 6. The counter lives as long as the loaded feed

The state lives in a hook used by `FeedContainer`, as plain React state. It starts over exactly when the feed cache does: on a reload, and when the user leaves the Feed page and comes back. So it always matches the cards on screen.

- _Rejected: resetting only on reload, with app-level state (a Redux slice)._ The returning feed loads a new first page with different notes, so the counter would no longer match the cards on screen.

### 7. Rounds are in scope, and a round flips on the next repeated card

When the counted set covers the total, the counter holds at `N/N`. The next card that newly qualifies and is already in the set starts the next round: the set becomes `{ that id }`, so the count is 1, and the round goes up by 1. Cards that stay in view across the flip don't count again until they leave and come back. A short feed (10 or fewer notes) never serves a repeat, so it stays at `N/N`.

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

### 14. One IntersectionObserver, owned by a hook in `FeedContainer`

`useFeedScrollCounter` (in `features/feed/hooks`) holds the state and one `IntersectionObserver` for all cards:

- **Root:** `scrollRef`.
- **`rootMargin`:** `-<header height>px 0px 0px 0px`, so the area under the sticky header doesn't count. A `ResizeObserver` on the header tracks its height, which changes as the textarea grows, and the observer is rebuilt when it changes.
- **`threshold`:** a dense list (every 0.02 from 0 to 1), so the callback fires as visibility changes.
- **The test in the callback:** a card qualifies when `intersectionRatio >= 0.5`, or when `intersectionRect.height >= rootBounds.height / 2` (a tall card).

A card counts only when it goes from not qualifying to qualifying. The hook keeps the set of qualifying ids across observer rebuilds. Without that, rebuilding at `N/N` would report every card in view as new and start a round by mistake.

The hook returns a stable ref callback. Each card registers through it: `FeedItem` takes a `ref` (a React 19 ref prop) and passes it to the `Card` root, along with `data-note-id`. The callback observes the element, and its cleanup unobserves it. A card that dedupe moves keeps its DOM node, so it stays observed.

- _Rejected: one observer per card, in `FeedItem`._ It means as many observers as cards, and the round logic would still need a shared owner.
- _Rejected: a scroll listener with `getBoundingClientRect`._ It means layout reads on every scroll event, and the hidden-under-header math done by hand.

### 15. The counting rules are one pure function in `feed.utils.ts`

`countScrolledCard(state, noteId, total)` takes `{ counted: Set<string>, round: number }` and returns the next state:

- a new id is added;
- a known id when `counted.size >= total` starts the next round with only that id;
- any other known id changes nothing.

The hook calls it on each newly qualifying card. The scrolled count shown is the number of `counted` ids still in `items`, capped at the total (Decision 5).

- _Rejected: putting the rules inline in the hook's observer callback._ They'd be mixed with the browser plumbing and harder to read and check.

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

## Risks / Trade-offs

- [A create that finishes while the next page's request is in flight can be counted twice, or not at all, until the following page.] → Accepted: it's off by 1 for one page, and the next page's `total` corrects it.
- [Notes deleted in another tab or device stay in the loaded items, so the counted set can be larger than a later page's `total`.] → The shown count is capped at the total, and a round ends at `counted.size >= total`.
- [A very fast fling can skip a card that is never painted at least half visible in any frame.] → Accepted: the spec only asks to count cards that were half visible "for a moment".
- [Rebuilding the observer when the header resizes re-reports every card.] → The qualifying set survives rebuilds (Decision 14), so nothing counts twice and no round flips by mistake.
- [Dense thresholds on every card.] → The feed holds at most a few hundred cards, and the callbacks only compare numbers.
- [In light mode the bar's empty track (`bg-muted` on the white header) is barely visible, so early in a round the bar is a short dark dash on its own.] → Accepted: it's the plain component's look, and dark mode shows the whole track.
- [At 1–2% the fill is a sliver (`1/300` is under 1 px), and 99% looks full.] → Accepted: the count next to it gives the exact value.

## Migration Plan

Web only, with no data or API change. It ships with the normal Vercel deploy of `apps/web`, and reverting the merge rolls it back. There are no owner steps on prod.
