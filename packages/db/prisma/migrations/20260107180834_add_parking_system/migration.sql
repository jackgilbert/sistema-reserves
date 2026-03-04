-- AlterTable
ALTER TABLE "checkin_events" ADD COLUMN     "ticketId" TEXT;

-- AlterTable
ALTER TABLE "instances" ADD COLUMN     "contactAddress" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "siteDescription" TEXT,
ADD COLUMN     "siteTitle" TEXT,
ADD COLUMN     "usefulInfo" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "inventory_buckets" ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "booking_invoices" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legalName" TEXT NOT NULL,
    "taxId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,

    CONSTRAINT "booking_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "usedBy" TEXT,
    "usedLocation" TEXT,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "entryAt" TIMESTAMP(3) NOT NULL,
    "exitAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "pricePerMinute" INTEGER NOT NULL,
    "amountDue" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "parking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parkingSessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'API',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "gate_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_invoices_bookingId_key" ON "booking_invoices"("bookingId");

-- CreateIndex
CREATE INDEX "booking_invoices_bookingId_idx" ON "booking_invoices"("bookingId");

-- CreateIndex
CREATE INDEX "tickets_bookingId_idx" ON "tickets"("bookingId");

-- CreateIndex
CREATE INDEX "tickets_tenantId_bookingId_idx" ON "tickets"("tenantId", "bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_tenantId_code_key" ON "tickets"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "parking_sessions_bookingId_key" ON "parking_sessions"("bookingId");

-- CreateIndex
CREATE INDEX "parking_sessions_tenantId_status_idx" ON "parking_sessions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "parking_sessions_tenantId_plate_idx" ON "parking_sessions"("tenantId", "plate");

-- CreateIndex
CREATE INDEX "parking_sessions_entryAt_idx" ON "parking_sessions"("entryAt");

-- CreateIndex
CREATE UNIQUE INDEX "parking_sessions_tenantId_bookingId_key" ON "parking_sessions"("tenantId", "bookingId");

-- CreateIndex
CREATE INDEX "gate_events_tenantId_parkingSessionId_idx" ON "gate_events"("tenantId", "parkingSessionId");

-- CreateIndex
CREATE INDEX "gate_events_tenantId_type_idx" ON "gate_events"("tenantId", "type");

-- CreateIndex
CREATE INDEX "gate_events_createdAt_idx" ON "gate_events"("createdAt");

-- CreateIndex
CREATE INDEX "checkin_events_tenantId_ticketId_idx" ON "checkin_events"("tenantId", "ticketId");

-- AddForeignKey
ALTER TABLE "booking_invoices" ADD CONSTRAINT "booking_invoices_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_events" ADD CONSTRAINT "checkin_events_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_sessions" ADD CONSTRAINT "parking_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_sessions" ADD CONSTRAINT "parking_sessions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_events" ADD CONSTRAINT "gate_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_events" ADD CONSTRAINT "gate_events_parkingSessionId_fkey" FOREIGN KEY ("parkingSessionId") REFERENCES "parking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
