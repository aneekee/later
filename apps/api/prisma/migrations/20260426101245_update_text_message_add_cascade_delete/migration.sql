-- DropForeignKey
ALTER TABLE "text_messages" DROP CONSTRAINT "text_messages_message_id_fkey";

-- AddForeignKey
ALTER TABLE "text_messages" ADD CONSTRAINT "text_messages_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
