-- CreateTable
CREATE TABLE "message_burndown_snapshots" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_notes" INTEGER NOT NULL,
    "resolved_notes" INTEGER NOT NULL,

    CONSTRAINT "message_burndown_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_burndown_snapshots_user_id_day_key" ON "message_burndown_snapshots"("user_id", "day");

-- AddForeignKey
ALTER TABLE "message_burndown_snapshots" ADD CONSTRAINT "message_burndown_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
