-- Hand-written: renames only, no data is touched.
-- Prisma generates DROP/CREATE for renamed models, never use the generated SQL here.

-- enum
ALTER TYPE "message_type" RENAME TO "note_type";

-- messages -> notes
ALTER TABLE "messages" RENAME TO "notes";
ALTER TABLE "notes" RENAME CONSTRAINT "messages_pkey" TO "notes_pkey";
ALTER TABLE "notes" RENAME CONSTRAINT "messages_user_id_fkey" TO "notes_user_id_fkey";
ALTER INDEX "messages_seen_at_created_at_idx" RENAME TO "notes_seen_at_created_at_idx";
ALTER INDEX "messages_user_id_seen_at_idx" RENAME TO "notes_user_id_seen_at_idx";

-- text_messages -> text_notes
ALTER TABLE "text_messages" RENAME TO "text_notes";
ALTER TABLE "text_notes" RENAME CONSTRAINT "text_messages_pkey" TO "text_notes_pkey";
ALTER TABLE "text_notes" RENAME COLUMN "message_id" TO "note_id";
ALTER INDEX "text_messages_message_id_key" RENAME TO "text_notes_note_id_key";
ALTER TABLE "text_notes" RENAME CONSTRAINT "text_messages_message_id_fkey" TO "text_notes_note_id_fkey";
