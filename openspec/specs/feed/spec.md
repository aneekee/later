# feed Specification

## Purpose

Serves a user's own notes as an endless queue, stalest first adjusted by each note's tier, and lets the user re-tier a note straight from its feed card.

## Requirements

### Requirement: The rotation boosts notes by tier

The feed SHALL order notes by never-seen first, then by effective staleness, stalest first. Effective staleness is the time since the note was last seen, multiplied by its tier's factor: S ×16, A ×8, B ×4, C ×2, D ×1. A note the feed has just served SHALL have no staleness, whatever its tier, so it goes behind every note seen earlier. Every note SHALL stay in the rotation whatever its tier.

#### Scenario: A higher tier comes back sooner

- **WHEN** note X (tier D) was last seen 3 days ago and note Y (tier C) was last seen 2 days ago
- **THEN** `GET /api/v1/feed` returns Y before X, because Y counts as 4 days stale

#### Scenario: Staleness still wins over tier

- **WHEN** note X (tier D) was last seen 20 weeks ago and note Y (tier S) was last seen 1 week ago
- **THEN** the feed returns X before Y, because Y counts as 16 weeks stale

#### Scenario: A served note does not come back on the next page

- **WHEN** a feed page has just served notes of tier S, and note X (tier D) was last seen 1 day ago
- **THEN** the next `GET /api/v1/feed` returns X before any of those S notes

#### Scenario: Never-seen notes come first

- **WHEN** note X has never been served and note Y (tier S) was last seen 1 year ago
- **THEN** the feed returns X before Y

#### Scenario: Equal effective staleness

- **WHEN** notes P (tier A) and Q (tier D) have both never been served
- **THEN** the feed returns P before Q
- **AND** notes still tied after tier are ordered by older creation time first

### Requirement: A note without a tier ranks as D

A note that has no stored tier SHALL get the D factor (×1) in the rotation.

#### Scenario: Untiered note

- **WHEN** note X has no stored tier and was last seen 2 days ago, and note Y (tier D) was last seen 1 day ago
- **THEN** the feed returns X before Y

### Requirement: The feed card shows a tier slider

Each feed card SHALL show, in its footer, a stepped slider with one stop per tier: D, C, B, A, S from left to right, each labeled. The note's current tier SHALL be marked by the thumb and a bold label. The track SHALL fill from D up to the thumb in the current tier's color: D purple, C blue, B green, A yellow, S orange. The upvote and downvote buttons and the numeric rating SHALL NOT be shown.

#### Scenario: Card for a B note

- **WHEN** the feed shows a note with tier B
- **THEN** its card footer shows a slider with stops labeled D C B A S, left to right
- **AND** the thumb sits on the B stop, the B label is bold and the filled track is green
- **AND** no upvote, downvote or rating number is shown

#### Scenario: Card for an S note

- **WHEN** the feed shows a note with tier S
- **THEN** the thumb sits on the rightmost stop, the whole track is filled orange and has a soft glow

#### Scenario: Card for a new note

- **WHEN** the feed shows a note the user just created
- **THEN** the thumb sits on the leftmost stop, D

### Requirement: The tier can be changed from the card by pointer and keyboard

The slider SHALL snap only to tier stops. Clicking or tapping a stop, or dragging the thumb, SHALL move the note to that tier. When the thumb has keyboard focus, the arrow keys SHALL move it one tier and Home/End to D/S. The card SHALL show the new tier at once.

#### Scenario: Tap a stop

- **WHEN** the user taps the A stop on a D note's card
- **THEN** the thumb jumps to A and the filled track turns yellow immediately

#### Scenario: Keyboard

- **WHEN** the slider thumb has focus on a C note and the user presses Right Arrow
- **THEN** the thumb moves to B
- **AND** pressing End moves it to S, and pressing Home moves it to D

#### Scenario: Assistive technology

- **WHEN** a screen reader focuses the slider on an A note
- **THEN** it announces a slider whose current value is "A"

### Requirement: Tier changes are saved once, after a pause

The web app SHALL save a tier change optimistically with one `PUT /api/v1/notes/:noteId/tier` carrying the latest tier, sent 600 ms after the last change. A change by dragging SHALL count only when the thumb is released: holding the thumb on a stop SHALL NOT save it. Changes within that pause SHALL be merged into that one request, requests for a note SHALL NOT overlap, and no request SHALL be sent when the latest tier equals the last saved one.

#### Scenario: Quick consecutive changes

- **WHEN** the user moves a D note to C, then B, then A within 600 ms
- **THEN** exactly one request is sent, 600 ms after the last change, with `{ "tier": "A" }`

#### Scenario: Holding the thumb mid-drag

- **WHEN** the user drags a D note's thumb to B and holds it there for more than 600 ms before releasing it on A
- **THEN** no request is sent while the thumb is held
- **AND** exactly one request is sent, 600 ms after the release, with `{ "tier": "A" }`

#### Scenario: Back to the saved tier

- **WHEN** the user moves a B note to A and back to B within 600 ms
- **THEN** no request is sent

#### Scenario: Leaving the page with a pending change

- **WHEN** the user changes a tier and the card unmounts before 600 ms have passed
- **THEN** the pending change is still sent

### Requirement: A failed tier save reverts

When the tier request fails, the card SHALL go back to the last saved tier and show an error toast with the server's message, or `"Error of setting a note tier"` when there is none.

#### Scenario: Server rejects the change

- **WHEN** the user moves a C note to S and the request fails with 403 `"You don't have access to this note"`
- **THEN** the thumb returns to C
- **AND** an error toast shows `"You don't have access to this note"`

#### Scenario: Network failure

- **WHEN** the user moves a C note to S and the request fails without a server message
- **THEN** the thumb returns to C
- **AND** an error toast shows `"Error of setting a note tier"`

### Requirement: Deleting a note drops its pending tier change

Confirming a note's deletion SHALL cancel its pending tier change and ignore the result of an in-flight one.

#### Scenario: Delete right after a change

- **WHEN** the user moves a note to S and confirms its deletion within 600 ms
- **THEN** no tier request is sent for that note
- **AND** no tier error toast is shown

### Requirement: A tier change never refetches the feed

Saving a tier SHALL NOT refetch or invalidate the feed. The saved tier SHALL be written into the already loaded feed, so a card that renders the note again shows the saved tier.

#### Scenario: Note shown again

- **WHEN** the user saves tier A on a note and a later feed page returns the same note, so its card renders again
- **THEN** that card shows tier A
- **AND** no extra `GET /api/v1/feed` request was made because of the tier change

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

The Feed page SHALL show the counter as `<scrolled>/<total>`, with no spaces and no other words, at the right end of the "Feed" title row in the sticky header, on every screen width. Showing the counter SHALL NOT change the header's height. The count text SHALL change without animation and SHALL NOT be announced by a live region.

#### Scenario: Phone

- **WHEN** the feed is open on a 375 px wide screen, with 12 notes scrolled out of 300
- **THEN** the "Feed" title row shows `12/300` at its right end
- **AND** the note input below it is where it was before this change

#### Scenario: Desktop

- **WHEN** the feed is open on a 1280 px wide screen, with 12 notes scrolled out of 300
- **THEN** the title row of the feed column shows `12/300` at its right end

#### Scenario: Screen reader

- **WHEN** a screen reader reaches the counter showing `12/300`
- **THEN** it reads the text `12/300`
- **AND** scrolling more cards into view announces nothing

### Requirement: The scroll counter has a progress bar

A progress bar SHALL fill the "Feed" title row's space between the title (or the round pill) and the count, and its filled part SHALL be scrolled ÷ total of its length. The bar SHALL be hidden from screen readers.

#### Scenario: Bar on phone

- **WHEN** the feed is open on a 375 px wide screen, with 12 notes scrolled out of 300
- **THEN** a progress bar runs from just after "Feed" to the count, with its first 4% filled

#### Scenario: Bar on desktop

- **WHEN** the feed is open on a 1280 px wide screen, with 12 notes scrolled out of 300
- **THEN** a progress bar runs from just after "Feed" to the count in the feed column's title row, with its first 4% filled

#### Scenario: Bar and screen readers

- **WHEN** a screen reader reaches the counter showing `12/300`
- **THEN** it reads nothing for the bar

### Requirement: A note counts as scrolled once its card is half visible

A note SHALL count as scrolled once at least half of its card is visible in the feed's scroll area below the sticky header. A card taller than that area SHALL count once it covers half of it, whatever its height and the screen's height. Counting SHALL be immediate, with no dwell time, and a note SHALL count at most once per round. Notes that are loaded but not yet in view SHALL NOT count.

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

#### Scenario: Tall card on a short screen

- **WHEN** the feed is open on a 568×320 screen and the user scrolls a note of 500 short lines until it covers half of the scroll area below the header
- **THEN** it counts

#### Scenario: Card coming out from under the sticky header

- **WHEN** the user scrolls back up and a card that was hidden under the sticky header moves down until half of it shows below the header
- **THEN** it counts as half visible, like a card coming in from the bottom

#### Scenario: Fast scroll

- **WHEN** the user flings the feed and several cards pass through view in under a second, each at least half visible for a moment
- **THEN** each of them counts

#### Scenario: Loaded but not in view

- **WHEN** the next page of 10 notes has loaded below the last visible card and none of its cards is in view yet
- **THEN** the counter doesn't change

#### Scenario: Same note again in the same round

- **WHEN** a note that already counted in this round comes into view again, before every note has been scrolled
- **THEN** the counter doesn't change

### Requirement: Resizing the note input changes no count

The sticky header growing or shrinking while the cards stay where they are on screen, as the note input gains or loses lines, SHALL NOT by itself make a card count or start a round. A card that the header uncovered SHALL count by the usual rule once the user scrolls.

#### Scenario: Note input grows and shrinks at N/N

- **WHEN** the counter shows `15/15`, the user types a multi-line note until the header covers a counted card, and then clears the note without scrolling
- **THEN** the counter still shows `15/15` with no round pill

#### Scenario: Scrolling after the note input shrinks

- **WHEN** a long draft covers a card that never counted, the user clears the draft, and then scrolls until half of that card shows below the header
- **THEN** it counts

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
- **THEN** the counter shows `11/299`, and the bar is filled to 11/299 of its length

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

When every note has been scrolled the counter SHALL show `<total>/<total>`, and keep it until a card that already counted in this round becomes half visible. That card SHALL start the next round with a count of 1. From round 2 on, a `Round <n>` pill SHALL show before the bar. Round 1 SHALL show no pill.

#### Scenario: Every note scrolled

- **WHEN** the user scrolls the last note that hadn't counted, out of 300
- **THEN** the counter shows `300/300` with no round pill
- **AND** the bar is full

#### Scenario: Round 2 starts

- **WHEN** the counter shows `300/300` and a card that already counted becomes half visible
- **THEN** the counter shows a `Round 2` pill, then the bar, then `1/300`
- **AND** the bar is filled to 1/300 of its length

#### Scenario: Later rounds

- **WHEN** the counter shows `Round 2` and `300/300`, and a card that already counted in round 2 becomes half visible
- **THEN** the counter shows a `Round 3` pill and `1/300`

#### Scenario: Short feed

- **WHEN** a user with 8 notes scrolls all of them and the feed shows its end, "That's all for now"
- **THEN** the counter shows `8/8` with a full bar and no round pill, and no round 2 follows

### Requirement: The counter shows only while notes are loaded

The counter, its bar included, SHALL be hidden while the first feed page loads, when the first page fails, and when the user has no notes. Otherwise it SHALL be shown, including while a next page loads, after a next page fails, and at the end of the feed.

#### Scenario: Loading

- **WHEN** the Feed page opens and the first page hasn't loaded yet
- **THEN** the title row shows "Feed" and no counter or bar

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
