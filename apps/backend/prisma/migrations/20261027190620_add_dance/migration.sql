-- CreateTable
CREATE TABLE "dance" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dance_schoolId_idx" ON "dance"("schoolId");

-- AddForeignKey
ALTER TABLE "dance" ADD CONSTRAINT "dance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;
