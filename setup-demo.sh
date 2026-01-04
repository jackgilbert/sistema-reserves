#!/bin/bash
set -e

echo "🔧 Setting up database and demo data..."
echo ""

# Navigate to packages/db
cd "$(dirname "$0")/packages/db"

echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🗄️  Running database migration..."
npx prisma migrate dev --name add_extended_settings --skip-seed

echo ""
echo "⚙️  Generating Prisma client..."
npx prisma generate

echo ""
echo "🌱 Seeding database with demo data..."
pnpm db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 DEMO CREDENTIALS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Email:    admin@museo.com"
echo "Password: admin123"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 ACCESS POINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Admin Panel: http://localhost:3000/admin/login"
echo "Public Site: http://localhost:3000/"
echo "API Docs:    http://localhost:3001/api/docs"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: Restart your dev server!"
echo "    Press Ctrl+C in the terminal running 'pnpm dev'"
echo "    Then run 'pnpm dev' again"
echo ""
