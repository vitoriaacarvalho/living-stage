-- AlterTable
ALTER TABLE "dance" ADD COLUMN     "durationMs" INTEGER;

-- AlterTable
ALTER TABLE "show" ADD COLUMN     "intervalMs" INTEGER NOT NULL DEFAULT 0;
