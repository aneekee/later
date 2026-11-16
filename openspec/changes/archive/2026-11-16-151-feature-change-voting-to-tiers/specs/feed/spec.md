# Spec Delta

## Purpose

Serves a user's own notes as an endless queue, stalest first adjusted by each note's tier, and lets the user re-tier a note straight from its feed card.

## ADDED Requirements

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

The web app SHALL save a tier change optimistically with one `PUT /api/v1/notes/:noteId/tier` carrying the latest tier, sent 600 ms after the last change. Changes within that pause SHALL be merged into that one request, requests for a note SHALL NOT overlap, and no request SHALL be sent when the latest tier equals the last saved one.

#### Scenario: Quick consecutive changes

- **WHEN** the user moves a D note to C, then B, then A within 600 ms
- **THEN** exactly one request is sent, 600 ms after the last change, with `{ "tier": "A" }`

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
