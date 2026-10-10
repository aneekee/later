I want to implement deleting a chat.
It should delete all it's messages.
Add a item to the chat context menu /Users/akava/Documents/work/later/apps/web/src/features/inbox/components/chats/WithChatContextMenu.tsx
The should be a confirmation modal

If the current chat has notes (both resolved and non-resolved) the confirmation modal should show "The current chat has N notes (M resolved and K unresolved). These notes will be removed with the chat, if not movoed to another chat".
There should also be a chat picker similar to /Users/akava/Documents/work/later/apps/web/src/features/inbox/components/MoveToChat/MoveToChatForm.tsx (reuse if possible) with non-required chat input.
If the user picks a chat, it'll move the notes first, then delete the chat in a transaction

There should be a single route on the BE /Users/akava/Documents/work/later/apps/api/src/chats/chats.controller.ts for deleting chat and deleting with moving, but two separate services.

Don't do anything with the user actions, I'm going to remove the mongo db later.
