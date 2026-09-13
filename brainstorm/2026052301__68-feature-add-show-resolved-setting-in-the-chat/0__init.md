---
title: Add Show Resolved Setting in the Chat
created_at: 2026-05-23
created_by: Aliaksandr Kavalenka
---

## Overview

Now there are resolved and unresolved messages/notes in the chats.

I want to be able to decide what messages I want to view per chat:

- Both resolved and unresolved messages;
- Only unresolved messages;
- Only resolved messages;

I want to add a chat search panel for it -- the chat header would have a Search icon; clicking on this search icon would slide down a panel.
This panel should include the UI for three states above; also I want to add a searchbar and probably something else later.

Changing message state in the chat search panel should affect the messages query.

I also need to tweak the messages list controller in the `apps/api/src/messages/messages.controller.ts`, so it'll allow filtering by message resolution state.

The key files are:

- `apps/api/src/messages/messages.controller.ts`
- `apps/api/src/messages/messages.service.ts`
- `apps/api/prisma/schema.prisma`
- `apps/web/src/features/inbox/components/messages/MessagesContainer.tsx`
- `apps/web/src/features/inbox/api/messages.api.ts`

## To Do

### Backend

- [ ] **Add `resolution` query param to `ListMessagesDto`** (`apps/api/src/messages/messages.dto.ts`)
  - New optional enum field: `"both" | "resolved" | "unresolved"`, default `"unresolved"`
  - Add class-validator decorators (`@IsEnum`, `@IsOptional`)

- [ ] **Propagate the param through `ListMessagesServiceDto`** (`apps/api/src/messages/messages.types.ts`)
  - Add `resolution?: 'both' | 'resolved' | 'unresolved'` to the service DTO type

- [ ] **Filter messages in `messagesService.listMessages()`** (`apps/api/src/messages/messages.service.ts`)
  - `"unresolved"` → `where: { ..., messageResolution: { is: null } }`
  - `"resolved"` → `where: { ..., messageResolution: { isNot: null } }`
  - `"both"` (default) → no extra filter (current behaviour)
  - Apply the same filter to both the `findMany` and the `count` query

- [ ] **Pass the new param from `messagesController.listMessages()`** (`apps/api/src/messages/messages.controller.ts`)
  - Forward `listMessagesDto.resolution` into the service call

---

### Frontend — API / types

- [ ] **Extend `GetMessagesListParams`** (`apps/web/src/features/inbox/types/messages.types.ts`)
  - Add `resolution?: 'both' | 'resolved' | 'unresolved'`

- [ ] **Include `resolution` in the infinite query URL** (`apps/web/src/features/inbox/api/messages.api.ts`)
  - Add it to the `URLSearchParams` in the `messages` infinite query builder (skip if `undefined`/`"both"` to keep URLs clean — or always send it, your call)

---

### Frontend — UI

- [ ] **Add Search icon toggle button to `MessagesHeader`** (`apps/web/src/features/inbox/components/messages/MessagesHeader.tsx`)
  - Render a `Search` icon button (Lucide) on the right side of the header
  - Button receives an `onToggle` callback and an `isOpen` boolean prop for active styling

- [ ] **Create `ChatSearchPanel` component** (new file, e.g. `apps/web/src/features/inbox/components/messages/ChatSearchPanel.tsx`)
  - Slides/animates down below the header when open
  - Contains a 3-state resolution filter control (see design question below) and a stub search bar input (non-functional for now)
  - Accepts `resolution` value + `onResolutionChange` callback as props

- [ ] **Wire state in `MessagesContainer`** (`apps/web/src/features/inbox/components/messages/MessagesContainer.tsx`)
  - Add local state: `isPanelOpen` (boolean) and `resolution` (`'both' | 'resolved' | 'unresolved'`, default `'both'`)
  - Pass toggle/state down to `MessagesHeader` and `ChatSearchPanel`
  - Pass `resolution` down to `MessageListContainer`

- [ ] **Thread `resolution` into `MessageListContainer`** (`apps/web/src/features/inbox/components/messages/MessageListContainer.tsx`)
  - Add `resolution` prop; forward it to `useMessagesInfiniteQuery`

---

### Shared types package (if needed)

- [ ] **Export the resolution filter type from `@later/types`** (`packages/types/src/messages.ts`)
  - Add and export `MessageResolutionFilter = 'both' | 'resolved' | 'unresolved'` so both API and web can share it without duplication

---

## Questions / Clarifications

1. **3-state toggle UI** — what component pattern do you prefer? Options:
   - Segmented control / button group (Bootstrap-style `All | Unresolved | Resolved`)
   - Radio buttons
   - A `<Select>` dropdown

Anwer: Button group would fit the best, I think there is a Toggle Group in ShadcnUI

2. **Panel animation** — slide-down (`max-height` transition), fade, or no animation?

Answer: With animation

3. **Filter persistence** — should the selected resolution filter reset when the user switches to a different chat, or persist? Currently `MessageListContainer` is keyed by `chatId` so it resets naturally — is that the desired behaviour?

Answer: Yes, let it reset; Also, the default value should be the "Unresolved"

4. **Search bar** — should I scaffold the input element as a visible (but inert) placeholder now, or skip it entirely until the search feature is built?

Answer: Don't add it, just save some place to it -- the resolution filters should be in the left side, and the right side should be left empty

5. **Shared type** — should I add `MessageResolutionFilter` to `packages/types`, or is it fine to define it locally in both `apps/api` and `apps/web` for now?

Answer: Add a param field to the GetMessagesListParams. Pass the resolution filter field in the request query params
