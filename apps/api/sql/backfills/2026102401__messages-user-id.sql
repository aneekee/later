-- Sets messages.user_id from the message chat owner.
-- Run by hand right after the 20261024175341_add_message_user_id migration is deployed,
-- the feed reads notes by user_id only, so notes without it are missing from the feed.
-- Idempotent: only the messages without user_id are updated, safe to re-run.
BEGIN;

UPDATE messages m
SET user_id = c.user_id
FROM chats c
WHERE c.id = m.chat_id
  AND m.user_id IS NULL;

COMMIT;
