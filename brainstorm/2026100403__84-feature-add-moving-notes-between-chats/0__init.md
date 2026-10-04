I want to implement be able to move notes in the chat to another chat

The /Users/akava/Documents/work/later/apps/web/src/features/inbox/components/messages/WithMessageContextMenu.tsx should include an item "Move" under the "Copy"
It should open a modal with a search-input with current user chats (without the current one)
It's required to select a chat to submit the modal.
On modal submit it should move the note to the selected chat.
It should allow changing note chats for both resolved and unresolved notes.

There also should be a context menu for the chats list items /Users/akava/Documents/work/later/apps/web/src/features/inbox/components/chats/ChatListContainer.tsx
There also should be a "Move" option, and it should work the same, but it should make another BE request that moves EVERY, resolved and unresolved item of the chat to the new picked chat
