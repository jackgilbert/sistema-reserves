/*
  Warnings:

  - You are about to drop the column `discountCodeId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `slotVariantKey` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `slotVariantKey` on the `holds` table. All the data in the column will be lost.
  - You are about to drop the column `availableLanguages` on the `instances` table. All the data in the column will be lost.
  - You are about to drop the column `defaultLanguage` on the `instances` table. All the data in the column will be lost.
  - You are about to drop the column `extendedSettings` on the `instances` table. All the data in the column will be lost.
  - You are about to drop the column `siteTranslations` on the `instances` table. All the data in the column will be lost.
  - You are about to drop the column `variantKey` on the `inventory_buckets` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `offerings` table. All the data in the column will be lost.
  - You are about to drop the column `translations` on the `offerings` table. All the data in the column will be lost.
  - You are about to drop the `discount_codes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_discountCodeId_fkey";

-- DropForeignKey
ALTER TABLE "discount_codes" DROP CONSTRAINT "discount_codes_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "discount_codes" DROP CONSTRAINT "discount_codes_tenantId_offeringId_fkey";

-- DropIndex
DROP INDEX "bookings_tenantId_discountCodeId_idx";

-- DropIndex
DROP INDEX "bookings_tenantId_slotStart_status_idx";

-- DropIndex
DROP INDEX "holds_tenantId_expiresAt_released_idx";

-- DropIndex
DROP INDEX "inventory_buckets_tenantId_offeringId_slotStart_variantKey_idx";

-- IMPORTANT: this is a UNIQUE constraint (owns the backing index). Drop constraint, not index.
ALTER TABLE "inventory_buckets"
  DROP CONSTRAINT IF EXISTS "inventory_buckets_tenantId_offeringId_slotStart_variantKey_key";

-- DropIndex
DROP INDEX "users_tenantId_active_role_idx";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "discountCodeId",
DROP COLUMN "slotVariantKey";

-- AlterTable
ALTER TABLE "holds" DROP COLUMN "slotVariantKey";

-- AlterTable
ALTER TABLE "instances" DROP COLUMN "availableLanguages",
DROP COLUMN "defaultLanguage",
DROP COLUMN "extendedSettings",
DROP COLUMN "siteTranslations";

-- AlterTable
ALTER TABLE "inventory_buckets" DROP COLUMN "variantKey";

-- AlterTable
ALTER TABLE "offerings" DROP COLUMN "imageUrl",
DROP COLUMN "translations";

-- DropTable
DROP TABLE "discount_codes";
