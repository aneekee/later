# Spec Delta

## ADDED Requirements

### Requirement: The scrolled count follows the scroll position

The scrolled count SHALL be the number of served notes no longer shown, plus the number of loaded cards times the share of their total height that lies above the bottom of the feed's scroll area, rounded to the nearest whole number. With cards of equal height, a card counts once its upper half is above that bottom. It SHALL be computed in real time as the user scrolls in either direction, and when cards are added, removed or change height. Loaded cards below the scroll area SHALL NOT count.

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

## MODIFIED Requirements

### Requirement: Resizing the note input changes no count

The sticky header growing or shrinking while the cards stay where they are on screen, as the note input gains or loses lines, SHALL NOT by itself change the scrolled count or the round.

#### Scenario: Note input grows and shrinks at N/N

- **WHEN** the counter shows `15/15`, the user types a multi-line note until the header covers a card, and then clears the note without scrolling
- **THEN** the counter still shows `15/15` with no round pill

#### Scenario: Scrolling after the note input shrinks

- **WHEN** the counter shows `12/300`, the user types a 7-line note and clears it without scrolling, and then scrolls down by the height of one card of equal height
- **THEN** the counter shows `12/300` until the scroll, and `13/300` after it

### Requirement: The counter's total follows created and deleted notes

The total SHALL be the `total` of the latest loaded feed page, plus the notes created on the Feed page since that page loaded. Deleting a note SHALL lower the total by 1. The scrolled count SHALL then follow from the scroll position over the remaining cards: deleting a card above the bottom of the scroll area lowers it by about 1, and deleting a card below leaves it as it is.

#### Scenario: Creating a note

- **WHEN** the counter shows `12/300` and the user creates a note
- **THEN** the counter shows `12/301`

#### Scenario: The next page after a create

- **WHEN** the counter shows `12/301` after a create and the next page loads with `total` 301
- **THEN** the total stays 301

#### Scenario: Deleting a scrolled note

- **WHEN** the counter shows `12/300` over cards of equal height and the user deletes a note whose card is above the bottom of the scroll area
- **THEN** the counter shows `11/299`, and the bar is filled to 11/299 of its length

#### Scenario: Deleting a note that never counted

- **WHEN** the counter shows `12/300` over cards of equal height and the user deletes a loaded note whose card is below the bottom of the scroll area
- **THEN** the counter shows `12/299`

### Requirement: The counter starts over when the feed restarts

The counter SHALL keep its numbers only for the current visit to the Feed page. A reload, or leaving the Feed page and coming back, SHALL start it again at round 1 from the notes of the new first page.

#### Scenario: Reload

- **WHEN** the counter shows `Round 2` and `40/300`, and the user reloads the page
- **THEN** once the first page loads, no round pill shows and the scrolled count follows the scroll position over that page's cards

#### Scenario: Visiting the dashboard

- **WHEN** the counter shows `40/300`, the user opens the Dashboard and then goes back to the Feed
- **THEN** once the feed's first page loads, the counter counts from that page's cards again

### Requirement: The counter starts a new round after every note was scrolled

The round SHALL follow from the scrolled count, which keeps growing past the total as the feed serves notes again. A count of exactly `<total>` SHALL show `<total>/<total>` in the current round, and each note past it SHALL count again from 1 in the next round. From round 2 on, a `Round <n>` pill SHALL show before the bar. Round 1 SHALL show no pill. Scrolling back SHALL lower the count, and the round with it.

#### Scenario: Every note scrolled

- **WHEN** the bottom of the scroll area reaches the end of the 300th served card, out of 300 notes
- **THEN** the counter shows `300/300` with no round pill
- **AND** the bar is full

#### Scenario: Round 2 starts

- **WHEN** the counter shows `300/300` and the bottom of the scroll area passes the middle of the next card, a note served again
- **THEN** the counter shows a `Round 2` pill, then the bar, then `1/300`
- **AND** the bar is filled to 1/300 of its length

#### Scenario: Later rounds

- **WHEN** the counter shows `Round 2` and `300/300`, and the bottom of the scroll area passes the middle of the next card
- **THEN** the counter shows a `Round 3` pill and `1/300`

#### Scenario: Back into the previous round

- **WHEN** the counter shows `Round 2` and `1/300`, and the user scrolls up by the height of one card
- **THEN** the counter shows `300/300` with no round pill

#### Scenario: Short feed

- **WHEN** a user with 8 notes scrolls to the end of the feed, "That's all for now"
- **THEN** the counter shows `8/8` with a full bar and no round pill, and no round 2 follows

## REMOVED Requirements

### Requirement: A note counts as scrolled once its card is half visible

**Reason**: Counting each distinct card once it is half visible needed an observer and a ref on every feed card. The owner traded that exactness for a much simpler count from the scroll position (issue #179).

**Migration**: Replaced by "The scrolled count follows the scroll position". A card now counts once it is above the bottom of the scroll area, approximately when cards differ in height. A note seen again no longer starts a round by itself: rounds follow from the count.
