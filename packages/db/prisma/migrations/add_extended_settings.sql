-- Add extendedSettings column to instances table
ALTER TABLE "instances" ADD COLUMN IF NOT EXISTS "extendedSettings" JSONB DEFAULT '{}';
