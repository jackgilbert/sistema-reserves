# Service Fixes Required

## Summary

The services were written for a different schema version. Here are the corrected field mappings:

## Field Mapping Table

| Service | Old Code | New Code (Schema) |
|---------|----------|-------------------|
| **Hold** | `hold.slot` | `hold.slotStart` |
| **Hold** | `hold.variantId` | ❌ Remove (no variants) |
| **Hold** | `hold.bookingId` | ❌ Remove (not in schema) |
| **Booking** | `booking.email` | `booking.customerEmail` |
| **Booking** | `booking.name` | `booking.customerName` |
| **Booking** | `booking.phone` | `booking.customerPhone` |
| **InventoryBucket** | `bucket.held` | `bucket.heldCapacity` |
| **InventoryBucket** | `bucket.sold` | `bucket.soldCapacity` |
| **InventoryBucket** | `slot` (field) | `slotStart` (field) |
| **Unique Constraint** | `tenantId_id` | Use separate `{ tenantId, id }` |
| **Unique Constraint** | `tenantId_offeringId_slot` | `tenantId_offeringId_slotStart` |
| **BookingItem** | Include `offering` | ❌ No relation exists |
| **BookingItem** | `item.offeringId` | ❌ Not in model |
| **BookingItem** | `item.slot` | ❌ Not in model |

## Quick Fix Steps

1. **Run pnpm install** to get @nestjs/schedule
2. **Regenerate Prisma** client: `cd packages/db && pnpm exec prisma generate`
3. **Apply service fixes** (see corrected files below or use sed script)
4. **Test** each endpoint

## Automated Fix (sed commands)

```bash
cd /workspaces/sistema-reserves/apps/api/src

# Fix Hold.slot → Hold.slotStart
find . -type f -name "*.ts" -exec sed -i 's/hold\.slot/hold.slotStart/g' {} +

# Fix Booking fields
find . -type f -name "*.ts" -exec sed -i 's/booking\.email/booking.customerEmail/g' {} +
find . -type f -name "*.ts" -exec sed -i 's/booking\.name/booking.customerName/g' {} +
find . -type f -name "*.ts" -exec sed -i 's/booking\.phone/booking.customerPhone/g' {} +

# Fix InventoryBucket fields
find . -type f -name "*.ts" -exec sed -i 's/bucket\.held/bucket.heldCapacity/g' {} +
find . -type f -name "*.ts" -exec sed -i 's/bucket\.sold/bucket.soldCapacity/g' {} +
```

⚠️ **Warning**: Automated fixes won't handle all cases (variants, relations, unique constraints). Manual review required.

## Recommendation

Since there are 88 errors, I recommend:

1. **Temporarily disable** broken modules in app.module.ts
2. **Get auth working** first (only 3 type errors, now fixed)
3. **Rebuild services** one by one to match actual schema
4. **Or update schema** to match the services (requires migration)

Which approach would you prefer?
