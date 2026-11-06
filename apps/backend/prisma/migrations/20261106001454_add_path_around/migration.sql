-- AlterTable
ALTER TABLE "path" ADD COLUMN     "aroundId" TEXT,
ADD COLUMN     "clockwise" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "turns" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "path" ADD CONSTRAINT "path_aroundId_fkey" FOREIGN KEY ("aroundId") REFERENCES "cast_member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
