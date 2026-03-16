# Booking Engine Gap Audit

Date: 2026-03-10

## Scope

This audit compares the implemented app surface with:

- The current public and admin workflows in this repository
- Backend capabilities that already exist but are not exposed in the web app
- Common capabilities repeated across mature booking engines such as Checkfront, Rezdy, and bookingkit

## Current Product Surface

### Public flow currently implemented

- Home/catalog page
- Offering detail page with date and slot selection
- Hold creation
- Checkout with customer name, email, phone
- Redirect to Redsys or direct confirmation for zero-value bookings
- Confirmation page with QR code
- Public booking lookup by code
- Public cancellation by code

### Admin flow currently implemented

- Login
- Booking list
- Offering list/create/edit
- Availability override and schedule management per offering
- Check-in by scan/manual entry and quick list check-in
- Discount batch management
- Large settings screen including branding, notifications, tax, and policy settings

### Backend capability beyond the current UI

- Instance management API
- Parking entry, quote, payment, and gate override API
- Settings templates, compare, validate, import, and export APIs
- Reminder email cron job
- Check-in history API

## Highest Priority Gaps

### 1. Missing admin pages for existing backend workflows

These are the clearest product gaps because backend support already exists.

- Instance management is linked in the admin navigation, but there is no corresponding page route in the web app.
- Parking operations exist in the backend but have no operator UI.
- Settings import/export/template/compare workflows exist in the API but are not surfaced in the settings UI.
- Check-in history exists in the API but has no screen in the admin.

Impact:

- Super admins cannot manage tenants from the product itself.
- Parking appears productized in backend only, not as a usable workflow.
- Operational setup and migration workflows are incomplete in UI.
- Frontline staff have no audit trail for check-in actions.

## Important Product Gaps In The Customer Journey

### 2. No self-service reschedule flow

The current customer self-service flow supports lookup and cancellation, but not changing date/time. Mature booking engines almost always provide at least operator rescheduling, and many provide customer self-service rescheduling.

Why it matters:

- Reschedule is one of the highest-frequency post-purchase actions.
- Cancellation-only flows force avoidable refund/support work.
- It is expected in tours, attractions, classes, and reservation systems generally.

### 3. No promo code entry in checkout

Discount generation and validation exist for admins, but there is no public promo-code entry point in the booking flow.

Why it matters:

- You can create discount inventory, but customers cannot redeem it online.
- This blocks campaigns, partnerships, and many standard sales motions.

### 4. No add-ons, bundles, or upsell workflow

The booking flow only supports ticket quantities and price variants. Common engines repeatedly emphasize checkout upsells, add-ons, packages, and bundles.

Why it matters:

- Lost average order value.
- Hard to model parking add-ons, guide upgrades, extras, equipment, insurance, or premium access.

### 5. No customer form builder or structured intake

Checkout captures only name, email, and optional phone.

Missing common fields/workflows:

- Per-attendee details
- Billing details
- Legal/tax fields
- Consent capture
- Custom questions per offering
- Waiver acceptance or pre-visit declarations

Why it matters:

- Mature systems use custom forms as a standard part of checkout.
- Different offerings often need different customer data.

### 6. Weak payment recovery flow

The payment success and failure return handlers both redirect to the same confirmation route. There is no dedicated failed-payment recovery page, retry path, or explicit pending-payment experience.

Why it matters:

- Failed or abandoned payments create ambiguity.
- Support load rises when users do not know whether the booking is confirmed.
- Mature engines usually provide a clear retry or resume-payment path.

### 7. Hold expiry is not surfaced as a real countdown state

Checkout shows a static 10-minute message, but the customer experience does not appear to include an actual synchronized countdown, expiry refresh, or hold-extension handling.

Why it matters:

- Creates trust issues if the hold expires unexpectedly.
- Mature engines usually show explicit remaining time and recover gracefully.

## Important Admin And Operations Gaps

### 8. Booking management is list-only

The admin booking page is a table with no details page or action workflow.

Common missing operator actions:

- Open booking detail
- Cancel from admin
- Refund from admin
- Reschedule from admin
- Resend confirmation
- Reissue QR/ticket
- Add internal notes
- Filter/export/search beyond the basic table

Why it matters:

- This is below the bar for day-to-day operations.
- Operators need a booking workspace, not just a report table.

### 9. No reporting and analytics product surface

Settings include analytics flags and Google Analytics configuration, but there is no internal dashboard, operational reporting area, or daily reports UI. Backend daily-report generation is still TODO.

Common standard reports missing:

- Sales by day/product/channel
- Capacity utilization
- Check-in and no-show rates
- Refund and cancellation trends
- Staff performance
- End-of-day reconciliation

### 10. No invoice/receipt workflow despite tax settings

The system has extensive tax and invoice settings, and the shared web types mention invoice data, but there is no clear public invoice capture flow, invoice generation workflow, or receipt download surface.

Why it matters:

- The settings create an expectation the system can issue invoices.
- B2B, school, group, and corporate customers often require billing documents.

### 11. No role-based staff workflows beyond a thin admin shell

Competitors commonly expose differentiated staff tooling: bookings desk, manifests, limited check-in rights, end-of-day reporting, and safer permission boundaries.

Current state:

- Basic auth exists
- Check-in page exists
- Admin layout is still very coarse

Missing likely next steps:

- Staff role permissions by section/action
- Check-in-only role UX
- Front desk booking creation/editing
- Audit history for operator actions

### 12. No distribution/channel/reseller workflow

Competitor engines consistently emphasize OTA/channel management and centralized inventory distribution. This app currently looks direct-booking only.

Why it matters:

- Direct-only is acceptable for an MVP, but it becomes a strategic gap quickly for attractions and activities.
- Even if OTA support is deferred, reseller/affiliate or coupon-based partner workflows are often needed early.

## Medium Priority Gaps

### 13. No gift cards, vouchers, or stored credit workflow

Discounts exist, but that is not the same as customer-facing vouchers or gift cards.

### 14. No memberships, passes, or multi-use products

Important if the business expands beyond single reservations.

### 15. No waitlist or sold-out recovery workflow

Competitor systems often support waitlists, no-show replacement, or guest manifests that help monetize sold-out periods.

### 16. No external calendar sync or calendar export

Common for appointment/service businesses and useful operationally.

### 17. No dedicated mobile-first operator views

Check-in is usable, but there is no clear mobile operations area for front-of-house, gate staff, or parking attendants.

### 18. No abandoned checkout follow-up

Mature engines increasingly support abandoned-cart recovery, especially when payment is required before confirmation.

## Lower Priority Or Domain-Dependent Gaps

These matter depending on your target market.

- Waivers and signed documents
- Seating maps
- Group bookings and quote workflows
- B2B account pricing
- POS/in-person booking sales
- Multiple currencies in live commerce
- Marketplace/affiliate tracking
- Review requests and post-visit automation

## Confirmed Mismatches Between Product Signals And Actual UX

These are worth fixing because they create confusion.

### Admin navigation mismatch

- The admin navbar includes an instances link, but the page does not exist.

### Settings over-promise compared to runtime workflows

- Settings expose tax, invoicing, analytics, templates, reminders, and notification editing.
- The product does not yet expose the corresponding operator workflows that users will expect from those settings.

### Backend capabilities with no user-facing completion

- Parking looks like a product line in backend only.
- Reporting is scheduled conceptually but not implemented.
- Payment confirmation helper remains placeholder-level in the bookings service.

## Competitive Baseline Summary

Across Checkfront, Rezdy, and bookingkit, the repeated baseline patterns are:

- Conversion-focused embedded booking widgets and optimized checkout
- Multi-language and multi-currency customer flows
- Add-ons, packages, upsells, timed ticketing, and seasonal pricing
- Resource and capacity management with live availability
- Operator tools for check-in, manifests, no-shows, and cancellation handling
- Invoicing, receipts, and stronger billing workflows
- Reporting, analytics, and end-of-day operational visibility
- Channel management, reseller/OTA distribution, and centralized inventory sync
- Automated communications including reminders and confirmations

This app already covers some foundations well:

- Core slot booking
- Holds
- QR confirmation
- Check-in
- Basic discount administration
- Advanced tenant settings

But compared with the market baseline, it is still missing several standard middle-layer workflows between “booking exists” and “business can run on this daily without manual work”.

## Recommended Priority Order

### Now

1. Build missing admin pages for existing backend capabilities:
   - Instances
   - Parking operations
   - Settings import/export/templates
   - Check-in history
2. Add booking detail pages with admin actions:
   - cancel
   - resend confirmation
   - refund status visibility
   - internal notes
3. Add payment failure and retry workflow
4. Add promo code redemption in public checkout

### Next

5. Add self-service and admin rescheduling
6. Add checkout form extensibility and billing/invoice capture
7. Add reporting dashboard and exports
8. Add add-ons or bundle support

### Later

9. Add staff roles and tighter permissions
10. Add vouchers/gift cards
11. Add waitlist and sold-out recovery
12. Add channel/reseller integrations if distribution matters to the business

## Concrete Missing Pages Worth Adding

- Admin booking detail page
- Admin booking search/filter/export view
- Admin instances page
- Admin parking dashboard
- Admin reports page
- Admin check-in history page
- Public payment failed page
- Public reschedule page
- Public billing/invoice details step or drawer
- Public promo code UI in checkout

## Bottom Line

The app is past prototype level on the core reservation path, but it is not yet a complete booking engine in the sense that established operators expect. The biggest gaps are not the raw booking primitive itself; they are the surrounding workflows that reduce support load and let operations run inside the product:

- rescheduling
- payment recovery
- admin booking actions
- reporting
- invoicing
- backend-exposed workflows with no UI

If the goal is to compete with mainstream booking engines, those workflow layers are the most important next step.