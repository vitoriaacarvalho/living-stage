-- CreateTable
CREATE TABLE "cast_member" (
    "id" TEXT NOT NULL,
    "danceId" TEXT NOT NULL,
    "dancerId" TEXT,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cast_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cast_member_danceId_dancerId_key" ON "cast_member"("danceId", "dancerId");

-- AddForeignKey
ALTER TABLE "cast_member" ADD CONSTRAINT "cast_member_danceId_fkey" FOREIGN KEY ("danceId") REFERENCES "dance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cast_member" ADD CONSTRAINT "cast_member_dancerId_fkey" FOREIGN KEY ("dancerId") REFERENCES "dancer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
