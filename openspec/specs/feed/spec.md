# feed Specification

## Purpose

Serves a user's own notes stalest first, adjusted by each note's tier, going through them once per visit, and lets the user re-tier a note straight from its feed card.

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

A progress bar SHALL fill the "Feed" title row's space between the title and the count, and its filled part SHALL be scrolled ÷ total of its length. The bar SHALL be hidden from screen readers.

#### Scenario: Bar on phone

- **WHEN** the feed is open on a 375 px wide screen, with 12 notes scrolled out of 300
- **THEN** a progress bar runs from just after "Feed" to the count, with its first 4% filled

#### Scenario: Bar on desktop

- **WHEN** the feed is open on a 1280 px wide screen, with 12 notes scrolled out of 300
- **THEN** a progress bar runs from just after "Feed" to the count in the feed column's title row, with its first 4% filled

#### Scenario: Bar and screen readers

- **WHEN** a screen reader reaches the counter showing `12/300`
- **THEN** it reads nothing for the bar

### Requirement: The scrolled count follows the scroll position

The scrolled count SHALL be the number of loaded cards times the share of their total height that lies above the bottom of the feed's scroll area, rounded to the nearest whole number. With cards of equal height, a card counts once its upper half is above that bottom. It SHALL be computed in real time as the user scrolls in either direction, and when cards are added, removed or change height. Loaded cards below the scroll area SHALL NOT count.

#### Scenario: First page

- **WHEN** the first page of 10 cards of equal height loads and the bottom of the scroll area is a third of the way down the 4th card
- **THEN** the counter shows `3/<total>`

#### Scenario: Scrolling down

- **WHEN** the counter shows `3/300` over cards of equal height and the user scrolls until the upper half of the 4th card is above the bottom of the scroll area
- **THEN** the counter shows `4/300`

#### Scenario: Scrolling back up

- **WHEN** the counter shows `7/300` over cards of equal height and the user scrolls up by the height of two cards
- **THEN** the counter shows `5/300`

#### Scenario: The next page loads

- **WHEN** the bottom of the scroll area reaches the end of the 10th card, so the counter shows `10/300`, and page 2 loads below it
- **THEN** the counter still shows `10/300`

#### Scenario: Next page loaded but not in view

- **WHEN** the next page of 10 notes has loaded below the scroll area and none of its cards is in view yet
- **THEN** the counter doesn't change

#### Scenario: A tall card

- **WHEN** the loaded cards are 9 one-line notes and one note as tall as the other 9 together, and the user scrolls through the tall card
- **THEN** the counter moves by about 5 while that card passes the bottom of the scroll area, and by about 1 for every two one-line cards

#### Scenario: Cards under the sticky header

- **WHEN** the user has scrolled so that cards are hidden under the sticky header
- **THEN** those cards count, because they are above the bottom of the scroll area

### Requirement: Resizing the note input changes no count

The sticky header growing or shrinking while the cards stay where they are on screen, as the note input gains or loses lines, SHALL NOT by itself change the scrolled count.

#### Scenario: Note input grows and shrinks at N/N

- **WHEN** the counter shows `15/15`, the user types a multi-line note until the header covers a card, and then clears the note without scrolling
- **THEN** the counter still shows `15/15`

#### Scenario: Scrolling after the note input shrinks

- **WHEN** the counter shows `12/300`, the user types a 7-line note and clears it without scrolling, and then scrolls down by the height of one card of equal height
- **THEN** the counter shows `12/300` until the scroll, and `13/300` after it

### Requirement: The counter starts over when the feed restarts

The counter SHALL keep its numbers only for the current visit to the Feed page. A reload, or leaving the Feed page and coming back, SHALL start it again from the notes of the new first page, with that page's `total` as the new visit total.

#### Scenario: Reload

- **WHEN** the counter shows `300/300` at "That's all for now", and the user reloads the page
- **THEN** once the first page loads, the scrolled count follows the scroll position over that page's cards
- **AND** the feed loads further pages again as the user scrolls

#### Scenario: Visiting the dashboard

- **WHEN** the counter shows `40/300`, the user opens the Dashboard and then goes back to the Feed
- **THEN** once the feed's first page loads, the counter counts from that page's cards again

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

Counting scrolled notes, creating a note and deleting a note SHALL NOT request, refetch or invalidate the feed, so the counter never marks notes as seen. Only the feed's own infinite scroll SHALL request pages.

#### Scenario: Creating a note in a short feed

- **WHEN** a user with 8 notes, at the end of the feed with `8/8`, creates a note
- **THEN** the counter still shows `8/8`
- **AND** no `GET /api/v1/feed` request is made because of the create

#### Scenario: Scrolling

- **WHEN** the user scrolls cards that are already loaded into view
- **THEN** the counter changes and no request is made for it

### Requirement: A Feed visit ends once every note was fetched

The web app SHALL stop requesting feed pages once the current visit to the Feed page has fetched as many notes as the visit total. It SHALL then show "That's all for now" below the last card and SHALL NOT request the feed again during that visit, however the user scrolls and whatever notes they create.

#### Scenario: Fifteen notes

- **WHEN** a user with 15 notes opens the Feed page and scrolls to the very bottom, then to the very bottom again
- **THEN** exactly two `GET /api/v1/feed` requests are made during the visit
- **AND** the feed shows 15 cards, each note once, followed by "That's all for now"

#### Scenario: Exactly one page

- **WHEN** a user with 10 notes opens the Feed page and scrolls to the very bottom
- **THEN** exactly one `GET /api/v1/feed` request is made during the visit
- **AND** "That's all for now" shows below the 10th card

#### Scenario: Staying at the end

- **WHEN** the feed shows "That's all for now" and the user scrolls up and back down to the very bottom several times
- **THEN** no `GET /api/v1/feed` request is made

#### Scenario: Creating a note at the end

- **WHEN** a user with 15 notes is at "That's all for now" and creates a note
- **THEN** no `GET /api/v1/feed` request is made
- **AND** the new note is not added to the feed during that visit

#### Scenario: A new visit continues the rotation

- **WHEN** the feed shows "That's all for now" and the user reloads the page
- **THEN** the feed requests its first page again, and the API serves the stalest notes as usual

### Requirement: The last page asks only for the notes left

Each feed page request from the web app SHALL send `pageSize` equal to the smallest of 10, the visit total minus the number of notes the visit has fetched so far, and the previous page's `data.left`. Notes deleted during the visit SHALL count neither in the visit total nor in the fetched notes.

#### Scenario: Request sizes for 15 notes

- **WHEN** a user with 15 notes loads the whole feed in one visit
- **THEN** the requests are `GET /api/v1/feed?pageSize=10`, then `GET /api/v1/feed?pageSize=5`

#### Scenario: Request sizes for 25 notes

- **WHEN** a user with 25 notes loads the whole feed in one visit
- **THEN** the requests send `pageSize` 10, 10 and 5, in that order

#### Scenario: A loaded note is deleted before the last page

- **WHEN** a user with 15 notes deletes one of the 10 loaded notes, and then scrolls to the very bottom
- **THEN** the next request is `GET /api/v1/feed?pageSize=5`
- **AND** the feed ends with 14 cards

#### Scenario: The API serves the notes left

- **WHEN** a user with 15 notes has just been served 10 of them and calls `GET /api/v1/feed?pageSize=5`
- **THEN** `data.items` holds the 5 notes that were not just served
- **AND** `data.total` is 15

### Requirement: Each feed page carries the visit's start and the notes left

Every `GET /api/v1/feed` response SHALL include `data.servedAt`, the time (ISO 8601) at which the page's notes were marked seen, and `data.left`, the number of the user's notes not served in the visit yet, after this page. A request with `since` SHALL skip the notes last seen at or after `since`, and `data.left` SHALL count the notes never seen or last seen before it. Without `since`, the page's own `servedAt` is the visit's start.

#### Scenario: The API skips notes served in the visit

- **WHEN** a user with 15 notes was served 10 of them at time T and calls `GET /api/v1/feed?pageSize=10&since=T`
- **THEN** `data.items` holds the 5 other notes
- **AND** `data.left` is 0 and `data.total` is 15

#### Scenario: First page

- **WHEN** a user with 15 notes calls `GET /api/v1/feed?pageSize=10` with no `since`
- **THEN** `data.items` holds 10 notes, `data.left` is 5, and `data.servedAt` is the time they were marked seen

### Requirement: A Feed visit never serves a note twice

After the first page, each feed page request from the web app SHALL send `since` set to the first page's `servedAt`, and the web app SHALL request no more pages once a page has `data.left` 0.

#### Scenario: Mixed tiers

- **WHEN** a user has 10 S notes and 5 D notes, all last seen a minute ago, opens the Feed page, and scrolls to the very bottom 10 seconds later
- **THEN** the first page serves the 10 S notes and the second request is `GET /api/v1/feed?pageSize=5&since=<the first page's servedAt>`
- **AND** the second page holds the 5 D notes, though the S notes now count as more stale
- **AND** the feed shows 15 cards, each note once, the counter reaches `15/15`, and "That's all for now" shows

#### Scenario: Another tab served the rest

- **WHEN** a visit has fetched 10 of 15 notes and another tab or device serves the other 5 before this visit asks for them
- **THEN** the next page comes back empty with `data.left` 0
- **AND** the web app shows "That's all for now" and requests no more pages

### Requirement: The counter's total is the visit total

The counter's total SHALL be the visit total: the `total` of the visit's first feed page, lowered by 1 for each note deleted during the visit. Notes created during the visit and the `total` of later pages SHALL NOT change it. The scrolled count SHALL then follow from the scroll position over the remaining cards: deleting a card above the bottom of the scroll area lowers it by about 1, and deleting a card below leaves it as it is.

#### Scenario: Creating a note

- **WHEN** the counter shows `12/300` and the user creates a note
- **THEN** the counter still shows `12/300`

#### Scenario: A later page after a create

- **WHEN** the visit's first page had `total` 300, the user creates a note, and the next page loads with `total` 301
- **THEN** the counter's total stays 300

#### Scenario: Deleting a scrolled note

- **WHEN** the counter shows `12/300` over cards of equal height and the user deletes a note whose card is above the bottom of the scroll area
- **THEN** the counter shows `11/299`, and the bar is filled to 11/299 of its length

#### Scenario: Deleting a note that never counted

- **WHEN** the counter shows `12/300` over cards of equal height and the user deletes a loaded note whose card is below the bottom of the scroll area
- **THEN** the counter shows `12/299`

#### Scenario: Every note scrolled

- **WHEN** the bottom of the scroll area reaches the end of the last card of a visit, out of 300 notes
- **THEN** the counter shows `300/300` and the bar is full
- **AND** nothing shows between "Feed" and the bar
