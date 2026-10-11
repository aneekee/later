## Requirements (agreed)

### Trash button

- Each feed card gets a trash button on the right side of `CardFooter`. The footer becomes `justify-between`, with the rating on the left and the trash button on the right.
- Style: `variant="ghost" size="icon-sm"`, `Trash2Icon`, `text-destructive`, and a red-tinted hover (`hover:bg-destructive/10 hover:text-destructive`).
- `aria-label="Delete note"`, `title="Delete note"`.

### Confirmation modal (`DeleteFeedNoteDialog`)

- Feed-specific: `features/feed/components/DeleteFeedNoteDialog.tsx`, built from the shared `Dialog` primitives, the same way as `DeleteChatDialog`. There's no generic confirm dialog.
- Title: "Delete note".
- Body: "Delete this note? This can't be undone."
- Buttons:
  - Cancel (`outline`);
  - Delete (`destructive`).
- It's rendered only while open, by the card that owns it.

### Submit flow (pessimistic)

- While the request is pending:
  - the Delete button shows a spinner;
  - both buttons are disabled;
  - the modal can't be dismissed (Esc, overlay click and × are ignored).
- On success, the note is removed from the feed cache. The card unmounts, and its dialog goes with it. No success toast.
- On failure:
  - the modal stays open;
  - `displayErrorToast(e, 'Note delete failed')` runs.

### Pending rating

- A debounced rating change that hasn't been sent yet is dropped when the delete is confirmed. No PUT goes out to a deleted note.
- `useBatchedRating` exposes `cancel()`. It:
  - clears the debounce;
  - resets the local value to the last confirmed one;
  - marks the hook as cancelled, so the unmount flush sends nothing and an in-flight request's error gets no toast.
- The card calls `cancel()` right before sending the delete. If the delete then fails, the unsent rating change is lost and the card shows the last confirmed rating. This is accepted.

### Feed cache

- The feed is never refetched (that would mark more notes as seen), so the cache is patched manually.
- On success, the note is removed from every loaded page, since the same note can appear more than once. Each page's `total` is decremented by 1 (min 0).
- Empty edge case: `FeedEmpty` shows only when there are no items **and** no next page. If every loaded card is deleted but more notes exist, the sentinel stays rendered and the next page loads automatically.

### API

- The existing route is reused: `DELETE v1/chats/:chatId/messages/:messageId` (`MessagesController.deleteMessage`). No BE changes.

## Implementation plan

1. **`features/feed/types/feed.types.ts`**
   - Add `DeleteFeedNoteParams { chatId: string; messageId: string }`.
2. **`features/feed/utils/feed.utils.ts`**
   - Add `removeFeedItem(pages, messageId)`. It mutates an immer draft:
     - filter `page.data.items` on every page;
     - decrement `page.data.total` by 1, clamped at 0.
3. **`features/feed/api/feed.api.ts`**
   - Add a `deleteFeedNote` mutation (`DeleteMessageSuccessResponse`, `DeleteFeedNoteParams`) that sends `DELETE v1/chats/:chatId/messages/:messageId`.
   - No tags.
   - In `onQueryStarted`, after `queryFulfilled`, call `updateQueryData('feed', { pageSize: FEED_PAGE_SIZE }, (draft) => removeFeedItem(draft.pages, messageId))`. The caller handles errors.
   - Export `useDeleteFeedNoteMutation`.
4. **`features/feed/hooks/useBatchedRating.ts`**
   - Add a `cancelledRef` and a `cancel()` callback that:
     - clears the debounce;
     - sets `ratingRef` back to `confirmedRef`;
     - sets `cancelledRef = true`.
   - The `send` loop exits early when cancelled and skips the revert and toast in `catch`.
   - The unmount flush is skipped when cancelled.
   - Return `{ rating, change, cancel }`.
5. **`features/feed/components/FeedRating.tsx`**
   - Takes `rating` and `change` as props instead of calling `useBatchedRating` itself.
6. **`features/feed/components/DeleteFeedNoteDialog.tsx`** (new)
   - Props: `item`, `open`, `onOpenChange`, `onBeforeDelete`.
   - Uses `useDeleteFeedNoteMutation`. The pending state comes from the mutation's `isLoading`.
   - `handleOpenChange` ignores close while pending.
   - On confirm, it calls `onBeforeDelete()`, then `deleteFeedNote({ chatId: item.chatId, messageId: item.id }).unwrap()`. A failure gets `console.error` and `displayErrorToast(e, 'Note delete failed')`.
7. **`features/feed/components/FeedItem.tsx`**
   - Calls `useBatchedRating(item)` and passes `rating` and `change` to `FeedRating`.
   - Holds the `isDeleteOpen` state.
   - Footer: `justify-between`, with `FeedRating` on the left and the trash `Button` on the right.
   - Renders `{isDeleteOpen && <DeleteFeedNoteDialog ... onBeforeDelete={cancel} />}`.
8. **`features/feed/components/FeedContainer.tsx`**
   - The empty-state condition becomes `!items.length && !hasNextPage`.
   - The list branch keeps rendering the spinner and sentinel when items are empty but a next page exists.
9. **Verify** (no new automated tests)
   - Run `tsc` and lint for web.
   - In the browser:
     - delete a card;
     - delete a note that appears twice in the loaded pages;
     - cancel the modal (Cancel, Esc, overlay);
     - delete while offline: the modal stays open and the toast shows;
     - rate, then delete within 600ms: no rating PUT is sent and no error toast shows;
     - delete all loaded cards while more notes exist: the next page loads.
