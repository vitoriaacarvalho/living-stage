-- CreateTable
CREATE TABLE "show" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT,
    "venue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "show_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT,

    CONSTRAINT "act_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_item" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "actId" TEXT NOT NULL,
    "danceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "act_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "show_schoolId_idx" ON "show"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "act_showId_order_key" ON "act"("showId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "act_item_actId_order_key" ON "act_item"("actId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "act_item_showId_danceId_key" ON "act_item"("showId", "danceId");

-- AddForeignKey
ALTER TABLE "show" ADD CONSTRAINT "show_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act" ADD CONSTRAINT "act_showId_fkey" FOREIGN KEY ("showId") REFERENCES "show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_item" ADD CONSTRAINT "act_item_showId_fkey" FOREIGN KEY ("showId") REFERENCES "show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_item" ADD CONSTRAINT "act_item_actId_fkey" FOREIGN KEY ("actId") REFERENCES "act"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_item" ADD CONSTRAINT "act_item_danceId_fkey" FOREIGN KEY ("danceId") REFERENCES "dance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
