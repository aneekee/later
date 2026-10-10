## Requirements (agreed)

### Context menu

- `WithChatContextMenu` gets a separator under **Move**, then a destructive **Delete** item (`variant="destructive"`, `Trash2Icon`).
- It gets a new `onDeleteClick` prop, wired in `ChatListContainer` the same way as `onMoveClick` (a `deletingChat` state).

### Confirmation modal (`DeleteChatDialog`)

- Title: "Delete chat".
- When it opens, it fetches `GET v1/chats/:id/stats`.
  - **Loading**: a spinner in the body, and Delete is disabled.
  - **Error**: "Failed to load chat info" with a Retry button. Delete stays disabled, so the user never deletes without seeing the warning.
- **Chat with 0 notes**: "Delete chat '<title>'? This can't be undone." No picker.
- **Chat with notes**: "'<title>' has N notes (M resolved and K unresolved). These notes will be deleted with the chat unless you move them to another chat." The counts are pluralized ("1 note").
  - Below the text is an optional chat picker labelled "Move notes to (optional)". It reuses `ChatCombobox` directly, with the deleted chat excluded via `excludeChatId`.
  - `ChatCombobox` gets a clear (×) button so a pick can be undone.
- Its own RHF + zod form, with `targetChatId` optional. `MoveToChatDialog` and `MoveToChatForm` stay untouched.
- Confirm button:
  - destructive variant;
  - reads "Delete" with no target and "Move & delete" once a chat is picked;
  - shows a spinner while submitting.
- Submitting waits for the request, with nothing optimistic. The modal closes on success.
- No success toast. On failure, the existing `displayErrorToast` runs with "Delete chat failed".

### After deletion

- If the deleted chat was the active one, always clear it: reset the active chat in the slice and remove `?chatId`. This applies even when the notes were moved.
- If the active chat was the move target, its messages refresh through the `Messages` invalidation.

### Behavior

- **Delete without a target**: the chat and all its messages are deleted. Text messages and resolutions go through the DB cascade.
- **Delete with a target**: in one transaction, all messages (resolved and unresolved) move to the target first, then the chat is deleted. Only `chat_id` changes, so `createdAt` and the resolution are kept, exactly as in move-all.
- No `user_actions` tracking. Remove the `DELETE_CHAT` TODO; MongoDB is going away.

### API

- `GET v1/chats/:id/stats` returns `{ total, resolved, unresolved }`.
  - It lives in `ChatsController`, backed by `ChatsService.getChatStats`. The dashboard `stats` module is not touched.
  - 403 if the user doesn't own the chat.
- `DELETE v1/chats/:id?targetChatId=<uuid>` is one route. The controller dispatches to one of two service methods:
  - no `targetChatId`: `ChatsService.deleteChat`;
  - with `targetChatId`: `ChatsService.deleteChatAndMoveMessages`.
- Errors:
  - 403 if the user doesn't own the source or the target chat;
  - 400 if `targetChatId === id`;
  - 400 if `targetChatId` isn't a valid UUID;
  - 404 if the chat doesn't exist.

### Database

- `Message.chat` gets `onDelete: Cascade`, with a Prisma migration. Deleting a chat then removes its messages, and through them `text_messages` and `message_resolutions`, which already cascade.

## Implementation plan

1. **Prisma**
   - In `apps/api/prisma/schema.prisma`, add `onDelete: Cascade` to `Message.chat`.
   - Run `prisma migrate dev --name cascade-delete-chat-messages` and regenerate the client.
2. **`packages/types/src/chats.ts`**
   - Add `DeleteChatQueryParams { targetChatId?: string }`.
   - Add `ChatStatsEntity { total; resolved; unresolved }` and `GetChatStatsSuccessResponse`.
3. **`apps/api/src/chats/`**
   - `chats.dto.ts`: add `DeleteChatDto implements DeleteChatQueryParams`, with `targetChatId` as `@IsUUID() @IsOptional()` and `@ApiProperty({ required: false })`.
   - `chats.types.ts`: add `DeleteChatAndMoveMessagesServiceDto` (`chatId`, `targetChatId`, `userId`) and `GetChatStatsServiceDto`.
   - `chats.service.ts`:
     - `getChatStats(dto)`: run `checkChatAccess`, then one raw query: `COUNT(m.id)` plus `COUNT(mr.id)`, from `messages m LEFT JOIN message_resolutions mr`, `WHERE m.chat_id = ...`. `unresolved = total - resolved`.
     - `deleteChat(dto)`: keep it as is (access check, then `chat.delete` with the not-found mapping). Drop both TODOs, since the cascade now handles the messages.
     - `deleteChatAndMoveMessages(dto)`:
       - reject `targetChatId === chatId` with 400;
       - run `checkChatAccess` on both chats;
       - run `prismaService.$transaction([message.updateMany({ where: { chatId }, data: { chatId: targetChatId } }), chat.delete({ where: { id: chatId } })])`;
       - map not-found to 404.
   - `chats.controller.ts`:
     - `@Get(':id/stats')` returns `getChatStats`. This route goes in the chats controller, not in `apps/api/src/stats/`.
     - `@Delete(':id')` takes `@Query() deleteChatDto: DeleteChatDto` and calls one of the two service methods, depending on `targetChatId`.
4. **Web API**
   - `chats.api.ts`:
     - Add a `getChatStats` query (`v1/chats/:id/stats`).
     - Change `deleteChat` to take `{ chatId, targetChatId? }` and pass `params: { targetChatId }`.
     - On success, invalidate `Chats`, plus `Messages` and `ResolvedMessages` via `onQueryStarted` (the same set as `moveChatMessages`). The dashboard stats are not invalidated.
   - Add a `DeleteChatParams` type in `features/inbox/types/chats.types.ts` and a `DeleteChatFormValues` zod schema (optional `targetChatId`).
5. **Web components (`features/inbox`)**
   - `ChatCombobox`: add an optional clear button (`showClear`, or a `ComboboxClear` if the base-ui combobox has one) that calls `onChange('')`.
   - New `components/DeleteChat/DeleteChatDialog.tsx`. Props: `chat`, `open`, `onOpenChange`, `onDeleted`. It handles the stats loading, error and retry, the copy with plurals, the optional picker, and the button label and variant.
   - `WithChatContextMenu`: add the separator and the destructive Delete item, plus the `onDeleteClick` prop.
   - `ChatListContainer`:
     - Add `deletingChat` state and render `DeleteChatDialog`.
     - In `onDeleted`, if `activeChat?.id === deletingChat.id`, dispatch `setActiveChat({ chat: null })` (add or reuse a reset action) and clear `?chatId`.
6. **Verify** (no new automated tests)
   - Run `tsc` and lint for `api`, `web` and `types`.
   - curl the API:
     - `GET :id/stats`, including a 403;
     - `DELETE` without a target, then check that the messages, text messages and resolutions are gone;
     - `DELETE ?targetChatId=`, then check that the notes are in the target with `createdAt` and resolutions intact;
     - the 400 (same chat, bad UUID), 403 (foreign target) and 404 cases.
   - In the browser:
     - an empty chat;
     - a chat with mixed notes and no target;
     - a chat with a target, including clearing the picked target;
     - deleting the active chat, which clears the selection;
     - the stats error state.
