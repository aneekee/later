-- DropForeignKey
ALTER TABLE "chats" DROP CONSTRAINT "chats_user_id_fkey";

-- DropForeignKey
ALTER TABLE "message_resolutions" DROP CONSTRAINT "message_resolutions_message_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_chat_id_fkey";

-- DropIndex
DROP INDEX "messages_chat_id_created_at_idx";

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "chat_id",
ALTER COLUMN "user_id" SET NOT NULL;

-- DropTable
DROP TABLE "chats";

-- DropTable
DROP TABLE "message_resolutions";

