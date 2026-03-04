-- AlterTable
ALTER TABLE "instances" ADD COLUMN     "primaryFont" TEXT,
ADD COLUMN     "secondaryFont" TEXT;

-- AlterTable
ALTER TABLE "offerings" ADD COLUMN     "images" JSONB NOT NULL DEFAULT '[]';
