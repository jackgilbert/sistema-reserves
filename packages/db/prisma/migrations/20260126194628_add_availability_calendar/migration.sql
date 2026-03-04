-- CreateTable
CREATE TABLE "availability_overrides" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "capacityOverride" INTEGER,
    "priceOverride" INTEGER,
    "priceMultiplier" INTEGER,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "availability_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "availability_overrides_tenantId_offeringId_idx" ON "availability_overrides"("tenantId", "offeringId");

-- CreateIndex
CREATE INDEX "availability_overrides_tenantId_offeringId_dateFrom_dateTo_idx" ON "availability_overrides"("tenantId", "offeringId", "dateFrom", "dateTo");

-- CreateIndex
CREATE INDEX "availability_overrides_dateFrom_dateTo_idx" ON "availability_overrides"("dateFrom", "dateTo");

-- CreateIndex
CREATE INDEX "bookings_tenantId_slotStart_status_idx" ON "bookings"("tenantId", "slotStart", "status");

-- CreateIndex
CREATE INDEX "holds_tenantId_expiresAt_released_idx" ON "holds"("tenantId", "expiresAt", "released");

-- CreateIndex
CREATE INDEX "inventory_buckets_tenantId_offeringId_slotStart_variantKey_idx" ON "inventory_buckets"("tenantId", "offeringId", "slotStart", "variantKey");

-- CreateIndex
CREATE INDEX "users_tenantId_active_role_idx" ON "users"("tenantId", "active", "role");

-- AddForeignKey
ALTER TABLE "availability_overrides" ADD CONSTRAINT "availability_overrides_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_overrides" ADD CONSTRAINT "availability_overrides_tenantId_offeringId_fkey" FOREIGN KEY ("tenantId", "offeringId") REFERENCES "offerings"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
