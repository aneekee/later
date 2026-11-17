# Spec Delta

## ADDED Requirements

### Requirement: Each feed page carries the note total

Every `GET /api/v1/feed` response SHALL include `data.total`: the number of notes the signed-in user owns when the page is served, whatever the page size and however many notes the page holds.

#### Scenario: More notes than one page

- **WHEN** a user who owns 25 notes calls `GET /api/v1/feed?pageSize=10`
- **THEN** `data.items` holds 10 notes
- **AND** `data.total` is 25

#### Scenario: Only the user's own notes count

- **WHEN** a user who owns 3 notes calls `GET /api/v1/feed`, and another user owns 50 notes
- **THEN** `data.total` is 3

#### Scenario: No notes

- **WHEN** a user who owns no notes calls `GET /api/v1/feed`
- **THEN** `data.items` is empty and `data.total` is 0

### Requirement: The feed header shows a scroll counter

The Feed page SHALL show the counter as `<scrolled>/<total>`, with no spaces and no other words, at the right end of the "Feed" title row in the sticky header, on every screen width. Showing it SHALL NOT change the header's height. The text SHALL change without animation and SHALL NOT be announced by a live region.

#### Scenario: Phone

- **WHEN** the feed is open on a 390 px wide screen, with 12 notes scrolled out of 300
- **THEN** the "Feed" title row shows `12/300` at its right end
- **AND** the note input below it is where it was before this change

#### Scenario: Desktop

- **WHEN** the feed is open on a 1280 px wide screen, with 12 notes scrolled out of 300
- **THEN** the title row of the feed column shows `12/300` at its right end

#### Scenario: Screen reader

- **WHEN** a screen reader reaches the counter showing `12/300`
- **THEN** it reads the text `12/300`
- **AND** scrolling more cards into view announces nothing

### Requirement: A note counts as scrolled once its card is half visible

A note SHALL count as scrolled once at least half of its card is visible in the feed's scroll area below the sticky header. A card taller than that area SHALL count once it covers half of it. Counting SHALL be immediate, with no dwell time, and a note SHALL count at most once per round. Notes that are loaded but not yet in view SHALL NOT count.

#### Scenario: First page

- **WHEN** the first page of 10 notes loads and 3 cards are at least half visible
- **THEN** the counter shows `3/<total>`

#### Scenario: Card coming into view

- **WHEN** the counter shows `3/300` and the user scrolls until a 4th card is half visible
- **THEN** the counter shows `4/300`

#### Scenario: Less than half visible

- **WHEN** only the top third of the next card is visible below the last counted card
- **THEN** the counter doesn't change

#### Scenario: Card under the sticky header

- **WHEN** a card is half hidden under the sticky header and only a third of it shows below the header
- **THEN** that card doesn't count from this position

#### Scenario: Tall card

- **WHEN** a card is taller than the feed's scroll area and the user scrolls until it covers half of that area
- **THEN** it counts, even though less than half of the card is visible

#### Scenario: Fast scroll

- **WHEN** the user flings the feed and several cards pass through view in under a second, each at least half visible for a moment
- **THEN** each of them counts

#### Scenario: Loaded but not in view

- **WHEN** the next page of 10 notes has loaded below the last visible card and none of its cards is in view yet
- **THEN** the counter doesn't change

#### Scenario: Same note again in the same round

- **WHEN** a note that already counted in this round comes into view again, before every note has been scrolled
- **THEN** the counter doesn't change

### Requirement: The counter's total follows created and deleted notes

The total SHALL be the `total` of the latest loaded feed page, plus the notes created on the Feed page since that page loaded. Deleting a note SHALL lower the total by 1, and SHALL lower the scrolled count by 1 when that note had counted in the current round.

#### Scenario: Creating a note

- **WHEN** the counter shows `12/300` and the user creates a note
- **THEN** the counter shows `12/301`

#### Scenario: The next page after a create

- **WHEN** the counter shows `12/301` after a create and the next page loads with `total` 301
- **THEN** the total stays 301

#### Scenario: Deleting a scrolled note

- **WHEN** the counter shows `12/300` and the user deletes a note that counted
- **THEN** the counter shows `11/299`

#### Scenario: Deleting a note that never counted

- **WHEN** the counter shows `12/300` and the user deletes a note whose card was never half visible
- **THEN** the counter shows `12/299`

### Requirement: The counter starts over when the feed restarts

The counter SHALL keep its numbers only for the current visit to the Feed page. A reload, or leaving the Feed page and coming back, SHALL start it again at round 1 from the notes of the new first page.

#### Scenario: Reload

- **WHEN** the counter shows `Round 2` and `40/300`, and the user reloads the page
- **THEN** once the first page loads, no round pill shows and the scrolled count is the number of half visible cards

#### Scenario: Visiting the dashboard

- **WHEN** the counter shows `40/300`, the user opens the Dashboard and then goes back to the Feed
- **THEN** once the feed's first page loads, the counter counts from its half visible cards again

### Requirement: The counter starts a new round after every note was scrolled

When every note has been scrolled the counter SHALL show `<total>/<total>`, and keep it until a card that already counted in this round becomes half visible. That card SHALL start the next round with a count of 1. From round 2 on, a `Round <n>` pill SHALL show before the count. Round 1 SHALL show no pill.

#### Scenario: Every note scrolled

- **WHEN** the user scrolls the last note that hadn't counted, out of 300
- **THEN** the counter shows `300/300` with no round pill

#### Scenario: Round 2 starts

- **WHEN** the counter shows `300/300` and a card that already counted becomes half visible
- **THEN** the counter shows a `Round 2` pill and `1/300`

#### Scenario: Later rounds

- **WHEN** the counter shows `Round 2` and `300/300`, and a card that already counted in round 2 becomes half visible
- **THEN** the counter shows a `Round 3` pill and `1/300`

#### Scenario: Short feed

- **WHEN** a user with 8 notes scrolls all of them and the feed shows its end, "That's all for now"
- **THEN** the counter shows `8/8` with no round pill, and no round 2 follows

### Requirement: The counter shows only while notes are loaded

The counter SHALL be hidden while the first feed page loads, when the first page fails, and when the user has no notes. Otherwise it SHALL be shown, including while a next page loads, after a next page fails, and at the end of the feed.

#### Scenario: Loading

- **WHEN** the Feed page opens and the first page hasn't loaded yet
- **THEN** the title row shows "Feed" and no counter

#### Scenario: First page fails

- **WHEN** the first feed page fails and the feed shows its error
- **THEN** no counter shows

#### Scenario: No notes

- **WHEN** a user with no notes opens the Feed page and sees the empty state
- **THEN** no counter shows

#### Scenario: Next page fails

- **WHEN** the counter shows `20/300` and the next page fails
- **THEN** the counter still shows `20/300`

### Requirement: The counter never requests the feed

Counting scrolled notes, creating a note and deleting a note SHALL NOT request, refetch or invalidate the feed, so the counter never marks notes as seen. Only the feed's own infinite scroll SHALL request pages, as before this change.

#### Scenario: Creating a note in a short feed

- **WHEN** a user with 8 notes, at the end of the feed with `8/8`, creates a note
- **THEN** the counter shows `8/9`
- **AND** no `GET /api/v1/feed` request is made because of the create

#### Scenario: Scrolling

- **WHEN** the user scrolls cards that are already loaded into view
- **THEN** the counter changes and no request is made for it
