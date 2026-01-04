#!/bin/bash
set -e

echo "🗄️  Setting up database..."

# Navigate to db package
cd packages/db

echo "📦 Generating Prisma client..."
npx prisma generate

echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database..."
pnpm db:seed

echo "✅ Database setup complete!"
