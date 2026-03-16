# Booking Engine Roadmap

Date: 2026-03-10

This roadmap turns the gap audit into an implementation sequence that improves operator usability first, then customer conversion, then platform breadth.

## Phase 1: Close Existing Backend/UI Gaps

Goal: expose workflows that already exist in the backend so the product surface matches platform capability.

### Deliverables

- Admin instances page for super admins
- Admin booking detail page with operator actions
- Settings advanced operations UI:
  - template apply/compare
  - validation
  - import/export
- Parking operations UI:
  - session monitor
  - manual gate override
- Check-in history UI

### Outcome

- The product stops advertising dead ends.
- Back-office users can complete core admin work without raw API calls.

## Phase 2: Conversion And Checkout Reliability

Goal: remove avoidable checkout friction and ambiguity.

### Deliverables

- Real hold countdown with expiry handling
- Failed payment page and recovery messaging
- Promo code redemption in checkout
- Clear pending-payment state and retry strategy
- Better checkout validation and required fields by offering type

### Outcome

- Lower abandonment caused by uncertainty.
- Fewer support cases around payment status.

## Phase 3: Booking Operations Workspace

Goal: make bookings manageable after purchase.

### Deliverables

- Admin booking actions:
  - cancel
  - resend confirmation
  - internal notes
  - refund visibility
- Self-service and admin reschedule flow
- Booking search, filters, and export
- Operator-friendly manifest views

### Outcome

- Staff can work from the product instead of spreadsheets and inboxes.

## Phase 4: Commercial Expansion

Goal: increase average order value and support more business models.

### Deliverables

- Add-ons and upsells
- Bundles and packages
- Gift cards and vouchers
- Memberships or passes
- Billing and invoice capture

### Outcome

- Higher revenue per booking.
- Better support for B2B and group customers.

## Phase 5: Reporting And Distribution

Goal: make the product operationally complete for established operators.

### Deliverables

- Sales and utilization dashboard
- Refund and cancellation reporting
- End-of-day reporting
- Channel and reseller strategy
- External calendar sync where relevant

### Outcome

- Clear operational visibility.
- Stronger fit for attractions, tours, and multi-channel operators.

## Immediate Build Order

1. Instances page
2. Admin booking detail and cancel action
3. Failed payment page
4. Live hold countdown
5. Settings import/export/templates UI
6. Parking dashboard
7. Promo code backend completion and checkout UI
8. Reschedule flow