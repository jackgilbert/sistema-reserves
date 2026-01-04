#!/bin/bash

echo "🔧 Quick Fix for 404 Error"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Add the column directly to PostgreSQL
echo "📊 Adding extendedSettings column to database..."
docker exec sistema-reservas-db psql -U reservas -d sistema_reservas -c "ALTER TABLE instances ADD COLUMN IF NOT EXISTS \"extendedSettings\" JSONB DEFAULT '{}';"

if [ $? -eq 0 ]; then
    echo "✅ Column added successfully"
else
    echo "⚠️  Column might already exist or command failed"
fi

echo ""
echo "⚙️  Regenerating Prisma client..."
cd packages/db
npx prisma generate

echo ""
echo "🌱 Seeding database..."
pnpm db:seed

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Done! Now restart your dev server:"
echo "   1. Stop the server (Ctrl+C)"
echo "   2. Run: pnpm dev"
echo ""
echo "🔐 Login with:"
echo "   Email: admin@museo.com"
echo "   Password: admin123"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
