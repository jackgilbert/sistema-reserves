-- Quick setup migration
-- This adds the extendedSettings column without using prisma migrate

\c sistema_reservas;

-- Add extendedSettings column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'instances' 
        AND column_name = 'extendedSettings'
    ) THEN
        ALTER TABLE instances ADD COLUMN "extendedSettings" JSONB DEFAULT '{}';
        RAISE NOTICE 'Column extendedSettings added successfully';
    ELSE
        RAISE NOTICE 'Column extendedSettings already exists';
    END IF;
END $$;
