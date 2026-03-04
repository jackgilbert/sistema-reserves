-- AlterTable
ALTER TABLE "instances" ADD COLUMN     "availableLanguages" JSONB NOT NULL DEFAULT '["es"]',
ADD COLUMN     "defaultLanguage" TEXT NOT NULL DEFAULT 'es',
ADD COLUMN     "siteTranslations" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "offerings" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "translations" JSONB NOT NULL DEFAULT '{}';
