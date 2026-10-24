-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "user_id" TEXT,
ALTER COLUMN "chat_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "messages_user_id_seen_at_idx" ON "messages"("user_id", "seen_at");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
