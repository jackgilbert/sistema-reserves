# Schema Mismatch Issues

The backend services were written for a more complex schema than what exists. Here are the key differences:

## Current Schema (Simplified)

### Hold Model
- Has: `slotStart`, `slotEnd` (separate fields)
- Missing: `slot` (single field), `variantId`, `bookingId`

### Booking Model
- Has: `customerEmail`, `customerName`, `customerPhone` (prefixed)
- Missing: `email`, `name`, `phone` (unprefixed)

### BookingItem Model
- Has: `description`, `quantity`, `unitPrice`, `totalPrice`
- Missing: `offeringId`, `slot`, `variantId`, `offering` relation

### InventoryBucket Model
- Has: `heldCapacity`, `soldCapacity`, `slotStart`, `slotEnd`
- Missing: `held`, `sold`, `slot`
- Unique constraint: `tenantId_offeringId_slotStart` (not `tenantId_offeringId_slot`)

### Offering Model
- Has: `priceVariants` (JSON field)
- Missing: `variants` relation, `OfferingVariant` model

## Required Changes

1. **Holds Service**: Use `slotStart`/`slotEnd`, use `heldCapacity`/`soldCapacity`
2. **Bookings Service**: Use `customer*` fields, simplify BookingItem creation
3. **CheckIn Service**: Remove BookingItem.offering relation lookups
4. **Offerings Service**: Remove variant model references, use JSON field
5. **Auth Guard**: Add explicit parameter types

## Quick Fix Options

### Option 1: Update Schema (More work)
- Add missing fields and relations to match services
- Run migrations

### Option 2: Fix Services (Recommended)
- Update services to match current simplified schema
- May lose some functionality (variants as separate model)

## Decision

**Fix the services to match the existing schema** - this is faster and the schema is already well-designed.
