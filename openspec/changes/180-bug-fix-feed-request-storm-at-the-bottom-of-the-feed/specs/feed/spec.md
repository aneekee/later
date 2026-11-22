# Spec Delta

## ADDED Requirements

### Requirement: A Feed visit ends after one round

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

Each feed page request from the web app SHALL send `pageSize` equal to the smaller of 10 and the visit total minus the number of notes the visit has fetched so far. Notes deleted during the visit SHALL count neither in the visit total nor in the fetched notes.

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
- **AND** no round pill shows

## MODIFIED Requirements

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

### Requirement: The counter never requests the feed

Counting scrolled notes, creating a note and deleting a note SHALL NOT request, refetch or invalidate the feed, so the counter never marks notes as seen. Only the feed's own infinite scroll SHALL request pages.

#### Scenario: Creating a note in a short feed

- **WHEN** a user with 8 notes, at the end of the feed with `8/8`, creates a note
- **THEN** the counter still shows `8/8`
- **AND** no `GET /api/v1/feed` request is made because of the create

#### Scenario: Scrolling

- **WHEN** the user scrolls cards that are already loaded into view
- **THEN** the counter changes and no request is made for it

## REMOVED Requirements

### Requirement: The counter starts a new round after every note was scrolled

**Reason**: A Feed visit now ends after one round (issue #180), so the scrolled count never goes past the total, and no `Round <n>` pill is shown.

**Migration**: None for users: reload the page or come back to the Feed page to go through the notes again. See "A Feed visit ends after one round".

### Requirement: The counter's total follows created and deleted notes

**Reason**: Notes created during a visit no longer change the counter's total, because the visit doesn't fetch them (issue #180).

**Migration**: Replaced by "The counter's total is the visit total". A created note shows up on the next visit.
