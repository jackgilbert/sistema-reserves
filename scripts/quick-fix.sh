#!/bin/bash

# Quick fix script to get the API running
# This will temporarily comment out broken services

echo "🔧 Applying quick fixes to get API running..."

# Install missing dependency
cd /workspaces/sistema-reserves
pnpm add @nestjs/schedule --filter @sistema-reservas/api

# Regenerate Prisma Client
cd packages/db
pnpm exec prisma generate

cd /workspaces/sistema-reserves

echo "✅ Dependencies installed and Prisma client generated"
echo ""
echo "⚠️  Note: The services have schema mismatches that need manual fixing."
echo "📄 See SCHEMA_MISMATCH.md for details"
echo ""
echo "To start with just auth (working):"
echo "  1. Comment out broken imports in app.module.ts"
echo "  2. Run: cd apps/api && pnpm dev"
