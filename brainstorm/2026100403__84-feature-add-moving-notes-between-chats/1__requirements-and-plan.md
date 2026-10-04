## Requirements (agreed)

### Single note move

- `WithMessageContextMenu` gets a **Move** item right under **Copy**.
- Available in regular chats (resolved and unresolved notes) and in the **Resolved notes** view. There, the note's own chat is `m.chat.id`.
- Opens a modal: a React Hook Form + zod form with a single required field, `targetChatId`, rendered as a shadcn **Combobox** (Popover + Command).
  - Search is server-side: the input is debounced and sent as `?search=`, with `shouldFilter={false}`. The list scrolls infinitely.
  - The note's current chat is excluded via `?excludeId=`.
- Submitting waits for the request: the Move button shows a loading state and nothing is optimistic. The modal closes on success.
- No success toast. On failure, the existing error toast is shown.
- The user stays in the current chat.

### Move all (chat list)

- `ChatListContainer` items get a new context menu with a **Move** item.
- It opens the same modal with:
  - title: "Move all notes"
  - description: "All resolved and unresolved notes from '<chat>' will be moved."
  - no count
- Every note in the chat moves, resolved or not. The source chat stays (empty), and the user stays on it.

### Behavior

- Only `chat_id` changes. `createdAt` and the resolution are kept, so the note lands in the target chat at its original date.
- No `user_actions` tracking.

### API

- `GET v1/chats` gets two optional params, applied to both the list and `totalSize`:
  - `search`: case-insensitive `ILIKE` on the title, with `%` and `_` escaped.
  - `excludeId`: leaves that chat out.
- `PUT v1/chats/:chatId/messages/:messageId/move` with body `{ targetChatId }`.
- `PUT v1/chats/:chatId/messages/move` with body `{ targetChatId }`; does a single `updateMany`.
- Both move endpoints:
  - 403 if the user doesn't own the source or the target chat;
  - 400 if `targetChatId === chatId`;
  - 404 if the message isn't in the source chat (single move only).

## Implementation plan

1. `packages/types`:
   - Add `MoveMessageRequestBody`, `MoveMessageSuccessResponse`, `MoveChatMessagesRequestBody` and `MoveChatMessagesSuccessResponse`.
   - Add `search?` and `excludeId?` to the chats list params.
2. `apps/api/src/chats/`:
   - `ListChatsDto`: add `search` (optional string, trimmed, with a max length) and `excludeId` (optional).
   - `listChats`: add the conditional `WHERE` conditions to the raw SQL, and make the count query match them.
3. `apps/api/src/messages/`:
   - Add `MoveMessageDto` and `MoveChatMessagesDto` (`targetChatId`).
   - Add two `PUT` routes in `MessagesController`.
   - Add `moveMessage` and `moveChatMessages` to `MessagesService`. They check ownership of both chats with `checkChatAccess`, reject a target equal to the source, and use `update` (where `{ id, chatId }`) or `updateMany`.
4. Web shared UI: run `shadcn add popover command`.
5. Web API slices:
   - The `chats` infinite query accepts `search` and `excludeId`. They are part of its cache key, so the modal gets its own cache entry.
   - Add `moveMessage` and `moveChatMessages` mutations to `messages.api`. Both invalidate `Messages`; once fulfilled, they also invalidate `Chats` and the resolved-messages cache.
6. Web components (`features/inbox`):
   - `ChatCombobox`: the RHF field, with a debounced server search, infinite scroll and the selected chat's title in the trigger.
   - `MoveToChatDialog`: reused for both flows. Props: `sourceChatId`, `title`, `description`, `onSubmit(targetChatId)`.
   - Add the Move item to `WithMessageContextMenu` and wire it in `MessageListContainer` and `ResolvedNotesListContainer`.
   - Add a new `WithChatContextMenu` around `ChatItem` in `ChatListContainer`.
7. Verify:
   - Run tsc and lint for api, web and types.
   - curl both move endpoints, including the 400, 403 and 404 cases, and `GET v1/chats` with `search` and `excludeId`.
   - Run both flows in the browser: a resolved note, an unresolved note, the Resolved notes view, and move all.
