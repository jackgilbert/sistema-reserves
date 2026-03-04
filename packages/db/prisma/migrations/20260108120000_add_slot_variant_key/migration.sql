-- Add slot variant dimension (e.g. language) to inventory/holds/bookings

-- AlterTable
ALTER TABLE "inventory_buckets" ADD COLUMN     "variantKey" TEXT NOT NULL DEFAULT '';

-- Existing unique constraint from Prisma is typically:
-- "inventory_buckets_tenantId_offeringId_slotStart_key"
ALTER TABLE "inventory_buckets" DROP CONSTRAINT IF EXISTS "inventory_buckets_tenantId_offeringId_slotStart_key";

-- New unique constraint includes variantKey
ALTER TABLE "inventory_buckets" ADD CONSTRAINT "inventory_buckets_tenantId_offeringId_slotStart_variantKey_key" UNIQUE ("tenantId", "offeringId", "slotStart", "variantKey");

-- AlterTable
ALTER TABLE "holds" ADD COLUMN     "slotVariantKey" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "slotVariantKey" TEXT NOT NULL DEFAULT '';
