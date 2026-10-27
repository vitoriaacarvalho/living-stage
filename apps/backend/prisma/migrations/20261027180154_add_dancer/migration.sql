-- CreateTable
CREATE TABLE "dancer" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dancer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dancer_schoolId_idx" ON "dancer"("schoolId");

-- AddForeignKey
ALTER TABLE "dancer" ADD CONSTRAINT "dancer_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;
