-- AlterTable
ALTER TABLE "dance" ADD COLUMN     "audioId" TEXT;

-- CreateTable
CREATE TABLE "audio_track" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_track_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audio_track_storageKey_key" ON "audio_track"("storageKey");

-- CreateIndex
CREATE INDEX "audio_track_schoolId_idx" ON "audio_track"("schoolId");

-- CreateIndex
CREATE INDEX "dance_audioId_idx" ON "dance"("audioId");

-- AddForeignKey
ALTER TABLE "dance" ADD CONSTRAINT "dance_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "audio_track"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_track" ADD CONSTRAINT "audio_track_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;
