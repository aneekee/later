I want to allow creating notes from the feed itself, not only from the inbox

There should be an input above the feed, note sending should work on either send or enter
The note input should be expandable
The note input should be very similar to the apps/web/src/features/inbox/components/messages/MessageInput.tsx but don't reuse it -- create a copy of it
Expand the max length for the message input to 1000; also add a limit to message controllers apps/api/src/messages/messages.controller.ts

The messages table require having a chatId -- make it optional, so I can create messages outside of chats
