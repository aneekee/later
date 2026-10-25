I want to reorganize the app and get rid of the obsolette logic and data
Long story short, I want to go from the Chat-like notes to Feed-like notes.
The delete plan is below, but I could miss some connections between modules or some other stuff to delete
Also, I could miss that deleting something may make the app unusable

I want to create a detailed plan of deleting, and create multiple subtasks so I'll run it in a separate agent session

Use different subagents for the research and write the final implementation plan with tasks and their dependencies in a seprarate md file -- if possible, make the subtasks implementable via subagents, but running them one by one manually also works for me

## Rename Messages to Notes

I don't want to use the Message wording, only Notes
Stuff that I see in and create from the feed are Notes, not Messages
Rename the prisma model Message to Note (messages table to notes), TextMessage to TextNote (text_messages to text_notes), MessageType to NoteType (message_type to note_type)
Don't use "message" or "chats" naming anywhere, only notes

### Remove Messages related logic

Delete the model Chat and its table; remove the chatId from the current Message model
I'm fine with deleting `apps/api/src/messages`, `apps/api/src/chats`, and `apps/web/src/features/inbox`

### Adjust the dashboard

Keep only the current number of notes in the apps/api/src/stats and apps/web/src/features/home
I'll extend it later

## Remove Resolved Messages

Remove the MessageResolution model and its table; also remove the message resolution logic from the app code, I don't need it anymore

## Remove user actions

Remove the apps/api/src/user-actions module
It's not related to this restructuring, I just don't need it anymore

## Remove related unused code

Remove unsed shared types from the `packages/types` and check what libs and shared components are not used
