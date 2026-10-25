-- Deletes the resolved notes (messages that have a message_resolutions row).
-- Run by hand on prod BEFORE the drop_chats_and_resolutions migration is deployed,
-- otherwise every resolved note comes back into the feed once message_resolutions is dropped.
-- text_messages and message_resolutions rows are removed by ON DELETE CASCADE.
-- Idempotent: safe to re-run.
BEGIN;

SELECT count(*) AS notes_before FROM messages;
SELECT count(*) AS resolved_to_delete FROM message_resolutions;

DELETE FROM messages m
USING message_resolutions r
WHERE r.message_id = m.id;

SELECT count(*) AS notes_after FROM messages;
SELECT count(*) AS text_messages_orphans
FROM text_messages t LEFT JOIN messages m ON m.id = t.message_id
WHERE m.id IS NULL;

COMMIT;
