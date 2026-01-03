# Demo Setup Guide

## Quick Start - Run these commands in order:

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run Database Migration
```bash
cd packages/db
npx prisma migrate dev --name add_extended_settings
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Seed Database with Demo Data
```bash
pnpm db:seed
```

### 5. Restart the Development Server
```bash
cd ../..
pnpm dev
```

## Demo Credentials

### Museum Instance (localhost)
- **Email:** `admin@museo.com`
- **Password:** `admin123`
- **Role:** Admin

- **Email:** `staff@museo.com`
- **Password:** `staff123`
- **Role:** Staff

### Parking Instance (parking.localhost)
- **Email:** `admin@parking.com`
- **Password:** `admin123`
- **Role:** Admin

## Access Points

1. **Admin Panel:** http://localhost:3000/admin/login
2. **Public Booking:** http://localhost:3000/
3. **API Documentation:** http://localhost:3001/api/docs

## What's Included in Demo Data

### Museum Instance Features:
- ✅ Complete company information
- ✅ Tax details (CIF: B12345678)
- ✅ Bank information for invoicing
- ✅ Booking policies
- ✅ Email notifications configured
- ✅ Stripe integration ready
- ✅ 1 offering: "Entrada General" with 3 price variants
- ✅ Schedule: Tuesday-Sunday, 10:00-18:00

### Parking Instance Features:
- ✅ Full payment required on booking
- ✅ QR code check-in enabled
- ✅ 10 parking spaces (A-01 to C-04)
- ✅ 1 offering: "Plaza de Parking Estándar"
- ✅ 24/7 availability

## Exploring the Settings

After logging in with `admin@museo.com` / `admin123`:

1. Click **"Configuración"** in the top menu
2. Navigate through the tabs:
   - 🏢 **General** - Business info, contact details
   - ⚡ **Características** - Enable/disable features
   - 📅 **Reservas** - Booking configuration
   - 📧 **Notificaciones** - Email settings
   - 🔌 **Integraciones** - Stripe, Analytics
   - 💰 **Impuestos y Facturación** - Tax & invoice details
   - 📋 **Políticas** - Cancellation policies
   - 🎨 **Marca** - Colors and branding
   - 🔍 **SEO** - Meta tags

## Testing Bookings

1. Go to http://localhost:3000/
2. Select "Entrada General"
3. Choose a date and time
4. Fill in customer details
5. Complete booking
6. Check bookings in admin panel

## Troubleshooting

If the seed fails with "unique constraint" errors:
```bash
cd packages/db
npx prisma migrate reset --force
pnpm db:seed
```

This will reset the database and re-seed it with fresh demo data.
