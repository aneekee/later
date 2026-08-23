/*
  Warnings:

  - You are about to drop the `message_burndown_snapshots` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "message_burndown_snapshots" DROP CONSTRAINT "message_burndown_snapshots_user_id_fkey";

-- DropTable
DROP TABLE "message_burndown_snapshots";
