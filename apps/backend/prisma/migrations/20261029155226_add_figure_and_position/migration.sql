-- CreateTable
CREATE TABLE "figure" (
    "id" TEXT NOT NULL,
    "danceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT,

    CONSTRAINT "figure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position" (
    "figureId" TEXT NOT NULL,
    "castMemberId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "position_pkey" PRIMARY KEY ("figureId","castMemberId")
);

-- CreateIndex
CREATE UNIQUE INDEX "figure_danceId_order_key" ON "figure"("danceId", "order");

-- AddForeignKey
ALTER TABLE "figure" ADD CONSTRAINT "figure_danceId_fkey" FOREIGN KEY ("danceId") REFERENCES "dance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position" ADD CONSTRAINT "position_figureId_fkey" FOREIGN KEY ("figureId") REFERENCES "figure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position" ADD CONSTRAINT "position_castMemberId_fkey" FOREIGN KEY ("castMemberId") REFERENCES "cast_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every dance has a first figure, and everyone already cast waits in the left
-- wing of it, down its length in casting order (as nextWingSpot does).
INSERT INTO "figure" ("id", "danceId", "order")
SELECT gen_random_uuid()::text, "id", 0 FROM "dance";

INSERT INTO "position" ("figureId", "castMemberId", "x", "y")
SELECT f."id", c."id", -0.0625,
  (((row_number() OVER (PARTITION BY c."danceId" ORDER BY c."createdAt") - 1) % 10) + 0.5) / 10.0
FROM "cast_member" c
JOIN "figure" f ON f."danceId" = c."danceId" AND f."order" = 0;
