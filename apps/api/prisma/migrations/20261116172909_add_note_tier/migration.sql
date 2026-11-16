-- CreateEnum
CREATE TYPE "note_tier" AS ENUM ('S', 'A', 'B', 'C', 'D');

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "tier" "note_tier";
