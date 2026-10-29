-- CreateEnum
CREATE TYPE "label_mode" AS ENUM ('name', 'role', 'both');

-- AlterTable
ALTER TABLE "dance" ADD COLUMN     "labelMode" "label_mode" NOT NULL DEFAULT 'name';
