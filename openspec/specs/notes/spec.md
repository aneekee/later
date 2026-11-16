# notes Specification

## Purpose

Lets a user keep short notes and grade each one with a tier, which decides how soon the feed brings the note back.

## Requirements

### Requirement: A note has a tier

Every note SHALL have exactly one tier from the fixed, ordered set S, A, B, C, D, where S is the highest and D the lowest. The API SHALL return the tier as `tier` on every note it returns, and SHALL NOT return a numeric `rating`.

#### Scenario: Feed items carry their tier

- **WHEN** a signed-in user calls `GET /api/v1/feed`
- **THEN** every returned item has a `tier` field whose value is one of `"S"`, `"A"`, `"B"`, `"C"`, `"D"`
- **AND** no item has a `rating` field

#### Scenario: A note without a stored tier is returned as D

- **WHEN** a note was created before tiers existed and hasn't been assigned one yet
- **THEN** the API returns it with `tier: "D"`

### Requirement: New notes start at tier D

Creating a note SHALL give it tier D. The create request SHALL accept only the note content and SHALL NOT accept a tier.

#### Scenario: Created note is D

- **WHEN** a signed-in user calls `POST /api/v1/notes` with `{ "content": "Book a dentist check-up" }`
- **THEN** the response status is 201
- **AND** `data.tier` is `"D"`

#### Scenario: A tier in the create request is rejected

- **WHEN** a signed-in user calls `POST /api/v1/notes` with `{ "content": "x", "tier": "S" }`
- **THEN** the response status is 400
- **AND** the response message contains `"property tier should not exist"`
- **AND** no note is created

### Requirement: The owner can set a note's tier

`PUT /api/v1/notes/:noteId/tier` with `{ "tier": <tier> }` SHALL set that note's tier to any value of the set, up or down, and SHALL respond 200 with message `"Note tier update successful"` and `data: { id, tier }` holding the stored values.

#### Scenario: Setting a tier

- **WHEN** the owner of note `n1` calls `PUT /api/v1/notes/n1/tier` with `{ "tier": "A" }`
- **THEN** the response status is 200
- **AND** the body is `{ "message": "Note tier update successful", "data": { "id": "n1", "tier": "A" } }`
- **AND** the next time the feed returns `n1`, its `tier` is `"A"`

#### Scenario: Lowering a tier

- **WHEN** the owner of note `n1` with tier S calls `PUT /api/v1/notes/n1/tier` with `{ "tier": "D" }`
- **THEN** the response status is 200 and `data.tier` is `"D"`

### Requirement: Setting a tier validates the request

The tier endpoint SHALL reject with 400 a request whose `tier` is missing or isn't one of S, A, B, C, D, and one that carries any other field, leaving the note unchanged.

#### Scenario: Unknown tier value

- **WHEN** the owner calls `PUT /api/v1/notes/n1/tier` with `{ "tier": "E" }`
- **THEN** the response status is 400
- **AND** the response message contains `"tier must be one of the following values: S, A, B, C, D"`

#### Scenario: Missing tier

- **WHEN** the owner calls `PUT /api/v1/notes/n1/tier` with `{}`
- **THEN** the response status is 400
- **AND** the response message contains `"tier must be one of the following values: S, A, B, C, D"`

#### Scenario: Old numeric field

- **WHEN** the owner calls `PUT /api/v1/notes/n1/tier` with `{ "tier": "A", "rating": 5 }`
- **THEN** the response status is 400
- **AND** the response message contains `"property rating should not exist"`

### Requirement: Only the owner can set a note's tier

Setting a tier SHALL require a signed-in user who owns the note. A note that doesn't exist and a note of another user SHALL get the same 403 response.

#### Scenario: Another user's note

- **WHEN** a signed-in user calls `PUT /api/v1/notes/n2/tier` with `{ "tier": "S" }` for a note owned by someone else
- **THEN** the response status is 403
- **AND** the response message is `"You don't have access to this note"`
- **AND** the note's tier is unchanged

#### Scenario: Missing note

- **WHEN** a signed-in user calls `PUT /api/v1/notes/does-not-exist/tier` with `{ "tier": "S" }`
- **THEN** the response status is 403
- **AND** the response message is `"You don't have access to this note"`

#### Scenario: Not signed in

- **WHEN** a request without a valid `access_token` cookie calls `PUT /api/v1/notes/n1/tier`
- **THEN** the response status is 401

### Requirement: The numeric rating endpoint no longer exists

The API SHALL NOT expose `PUT /api/v1/notes/:noteId/rating`.

#### Scenario: Old route

- **WHEN** a signed-in user calls `PUT /api/v1/notes/n1/rating` with `{ "rating": 5 }`
- **THEN** the response status is 404
