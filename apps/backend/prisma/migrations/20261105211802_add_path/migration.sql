-- CreateTable
CREATE TABLE "path" (
    "figureId" TEXT NOT NULL,
    "castMemberId" TEXT NOT NULL,
    "points" JSONB NOT NULL,

    CONSTRAINT "path_pkey" PRIMARY KEY ("figureId","castMemberId")
);

-- AddForeignKey
ALTER TABLE "path" ADD CONSTRAINT "path_figureId_fkey" FOREIGN KEY ("figureId") REFERENCES "figure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "path" ADD CONSTRAINT "path_castMemberId_fkey" FOREIGN KEY ("castMemberId") REFERENCES "cast_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
