# Proposal

## Why

Issue #165: while working through the feed, a user can't tell how far they've got. The feed is endless and shows no position, so there's no sense of progress through a few hundred notes. A small `scrolled/total` counter (e.g. `12/300`) in the feed header gives that, on phone and desktop alike, without any server state. A progress bar next to it (the ask's 2026-11-18 update) makes the same progress visible at a glance.

## What Changes

- The feed header shows a counter `<scrolled>/<total>` in the "Feed" title row, aligned right, e.g. `12/300`.
- A progress bar is part of the counter: it fills the title row's free space between "Feed" and the count, and its filled part is scrolled ÷ total. It's the plain shadcn Progress component, the same on phone and desktop.
- **Scrolled** (a new glossary term) counts the distinct notes whose card has been at least half visible in the feed's scroll area, below the sticky header, during the current visit to the feed. A card taller than that area counts once it fills half of it. There's no dwell time. It counts in real time as cards come into view, not per fetched page.
- **Total** is the number of the user's notes: the `total` that every `GET /api/v1/feed` page already returns, plus the notes created on the feed since the latest page loaded. It goes down when a note is deleted.
- Deleting a scrolled note lowers both numbers (`12/300` → `11/299`); deleting a note that was never counted lowers only the total.
- The counter lives on the client only. It resets whenever the feed restarts: on a reload, and when the user leaves the Feed page and comes back.
- **Rounds** (a new glossary term): once every note has been scrolled the counter holds at `N/N`. The next card that comes into view and was already counted in this round starts round 2 at `1/N`, a `Round 2` pill appears before the bar, and the bar starts again from nearly empty. Later rounds work the same way. Round 1 has no pill.
- The counter (bar and count) is hidden while the first page loads, when the first page fails, and when the user has no notes. It stays visible on a failed next page and at the end of a short feed (10 or fewer notes, where it reads `N/N` and no round 2 comes).
- The count text doesn't animate; the bar keeps the component's own short slide. Nothing is announced to screen readers: they read the plain text, and the bar is hidden from them.
- The feed spec gains a requirement that pins the `total` already returned by `GET /api/v1/feed`. The API code doesn't change.

**Out of scope**

- Keeping the counter across reloads or visits (the ask says it resets on reload). Leaving the Feed page resets it too, because the feed itself restarts then.
- Any server-side notion of Scrolled, and any change to Seen, `seenAt` or the rotation.
- The dashboard and `v1/stats`: the feed's own `total` is used.
- Putting the counter in the app top bar (mock C), a progress line along the header's bottom edge (mock B), and a shorter bar before or under the count (mock D and E). All were explored in the mock and rejected.
- A bar that isn't the plain shadcn Progress, such as a ring or a pill filled by the progress.
- Unit tests and a test runner for `apps/web`; this change is checked by hand in the browser.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `feed`: the `total` in each feed page, and the feed header's scroll counter and its progress bar: what counts as scrolled, the total, delete and create, rounds, reset, and when the counter shows. Only ADDED requirements; no existing feed requirement changes.

## Impact

- **apps/web** (`features/feed`): the feed container and header, a new counter component, a hook that observes the feed cards and tracks the scrolled notes, the round and the extra total, and small changes so that note create and delete reach it. `shared/components/ui` gains the shadcn `progress.tsx` (`shadcn add progress`); `radix-ui`, already a dependency, provides its primitive. `features/notes/api` stays as it is (create still doesn't patch the feed cache).
- **apps/api**: no change. `GET v1/feed` already returns `total`.
- **@later/types**: no change. `FeedPage.total` already exists.
- **prisma/schema.prisma**: no change.
- **Docs**: `CONTEXT.md` already gained **Scrolled** and **Round** during exploration.
- **Design reference**: Claude Design canvas "Feed scroll counter", https://claude.ai/artifact/K7QipimyQu9XH5C3grYUea. `mockup.md` and `mockup/*.png` in this change folder hold the chosen variant A with progress bar F.
