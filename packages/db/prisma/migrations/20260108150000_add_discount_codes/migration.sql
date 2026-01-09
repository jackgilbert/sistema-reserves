-- CreateTable
CREATE TABLE "discount_codes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "offeringId" TEXT,
    "percentOff" INTEGER NOT NULL,
    "maxRedemptions" INTEGER,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "batchId" TEXT,

    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "discountCodeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_tenantId_code_key" ON "discount_codes"("tenantId", "code");

-- CreateIndex
CREATE INDEX "discount_codes_tenantId_active_idx" ON "discount_codes"("tenantId", "active");

-- CreateIndex
CREATE INDEX "discount_codes_tenantId_offeringId_idx" ON "discount_codes"("tenantId", "offeringId");

-- CreateIndex
CREATE INDEX "discount_codes_tenantId_batchId_idx" ON "discount_codes"("tenantId", "batchId");

-- CreateIndex
CREATE INDEX "bookings_tenantId_discountCodeId_idx" ON "bookings"("tenantId", "discountCodeId");

-- AddForeignKey
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_tenantId_offeringId_fkey" FOREIGN KEY ("tenantId", "offeringId") REFERENCES "offerings"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "discount_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
