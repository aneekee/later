-- CreateTable
CREATE TABLE "message_resolutions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_resolutions_message_id_key" ON "message_resolutions"("message_id");

-- AddForeignKey
ALTER TABLE "message_resolutions" ADD CONSTRAINT "message_resolutions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
