---
title: Add Resolved Notes Section
created_at: 2026-05-23
created_by: Aliaksandr Kavalenka
---

## Overview

I want to add a dedicated section for resolved notes.

In `ChatListContainer` (`apps/web/src/features/inbox/components/chats/ChatListContainer.tsx`) there should be one additional chat list item for resolved notes only — always pinned at the top and visually separated from the regular chat list.

When clicking this resolved notes item it should render a messages view like in `MessagesContainer` (`apps/web/src/features/inbox/components/messages/MessagesContainer.tsx`), but using new dedicated components for the messages list and the header.

I also need a separate API endpoint in `apps/api/src/messages/messages.controller.ts` for fetching resolved messages across all of the user's chats.

In the resolved notes section, each message component should differ from those in `MessageListContainer` (`apps/web/src/features/inbox/components/messages/MessageListContainer.tsx`) in the following ways:

- The context menu must always contain exactly three items: **Copy**, **Delete**, and **Unresolve** — nothing else;
- A chat name must be displayed per message, so the resolved messages response must include each message's parent chat data;
- `WithMessageItemResolution` must never wrap messages in the resolved notes section;
- The search panel should be rendered but empty (no resolution filter controls) in the resolved notes section;
- Empty, loading, and fetching states must be present, consistent with `MessageListContainer`;
- The message input must not be rendered in the resolved notes section;

## To Do

### Types

- [x] Add `ResolvedMessageEntity` to `packages/types/src/messages.ts` — extends `MessageEntity` with `chat: { id: string; title: string }`; add `ListResolvedMessagesSuccessResponse` using it

### Backend

- [x] Add `ListResolvedMessagesDto` to `apps/api/src/messages/messages.dto.ts` — `page` and `pageSize` only (no `chatId`, no `resolution`); add corresponding `ListResolvedMessagesServiceDto` to `messages.types.ts`
- [x] Add `listResolvedMessages({ userId, page, pageSize })` method to `apps/api/src/messages/messages.service.ts` — query resolved messages across all of the user's chats (filter by `chat.userId === userId`), include the `chat` relation in the result, order by `createdAt desc`
- [x] Add `GET /v1/resolved-messages` endpoint in `apps/api/src/messages/messages.controller.ts` — new `@Controller('v1/resolved-messages')` class `ResolvedMessagesController` registered in `MessagesModule`

### Frontend

- [x] Add `ResolvedMessages` to `messagesApi.tagTypes` in `apps/web/src/features/inbox/api/messages.api.ts`; add `useResolvedMessagesInfiniteQuery` hook — hits `GET /v1/resolved-messages`, infinite pagination, tagged `ResolvedMessages`; ensure resolve/unresolve mutations also invalidate `ResolvedMessages`; Create a new resolvedMessages.api.ts file for the resolved messages specific queries and mutations, it should be very similar to the `/apps/web/src/features/inbox/api/messages.api.ts` though
- [x] Create `apps/web/src/features/inbox/components/chats/ResolvedNotesItem.tsx` — visually distinct chat list item (`CheckSquare` icon), `isActive` styling consistent with `ChatItem`
- [x] Update `apps/web/src/features/inbox/components/chats/ChatListContainer.tsx`:
  - Render `<ResolvedNotesItem>` always at the top with a visual separator between it and the regular chats list
  - On click: `setSearchParams({ chatId: RESOLVED_NOTES_CHAT.id })` + `dispatch(setActiveChat({ chat: RESOLVED_NOTES_CHAT }))`
  - Fix the URL-restore `useEffect` to handle `chatId === RESOLVED_NOTES_CHAT.id` (not present in the chats list — dispatch `setActiveChat({ chat: RESOLVED_NOTES_CHAT })` directly instead of searching the list)
- [x] Create `apps/web/src/features/inbox/components/messages/ResolvedNotesHeader.tsx` — fixed "Resolved Notes" title with a search toggle button; no chat-specific actions
- [x] Create `apps/web/src/features/inbox/components/messages/ResolvedNotesListContainer.tsx` — uses `useResolvedMessagesInfiniteQuery`; renders chat name per message; context menu shows only Copy + Delete + Unresolve; never wraps in `WithMessageItemResolution`; infinite scroll consistent with `MessageListContainer`; empty/loading/fetching states consistent with `MessageListContainer`
- [x] Update `apps/web/src/features/inbox/components/messages/MessagesContainer.tsx` — in the `RESOLVED_NOTES_CHAT` branch: replace `MessagesHeader` with `ResolvedNotesHeader`, replace `ChatSearchPanel` with an empty `<div>` (search panel placeholder), replace `MessageListContainer` with `ResolvedNotesListContainer`; remove the `resolution` state from that branch
