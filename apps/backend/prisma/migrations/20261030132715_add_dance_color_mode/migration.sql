-- CreateEnum
CREATE TYPE "color_mode" AS ENUM ('dancer', 'role');

-- AlterTable
ALTER TABLE "dance" ADD COLUMN     "colorMode" "color_mode" NOT NULL DEFAULT 'dancer';
