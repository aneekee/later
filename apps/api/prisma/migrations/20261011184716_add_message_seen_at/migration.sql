-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "seen_at" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "messages_seen_at_created_at_idx" ON "messages"("seen_at", "created_at");
