-- Run this in the Supabase SQL Editor to add the missing column
-- without re-creating existing tables.

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'saved_preferences'
    ) THEN 
        ALTER TABLE public.organizations 
        ADD COLUMN saved_preferences jsonb DEFAULT '{"shortcuts": []}'::jsonb; 
    END IF; 
END $$;
