-- Add 'templates' column for Clinic Customization
-- Stores JSON: { "header": "...", "signature": "...", "tone": "formal" }

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'templates'
    ) THEN 
        ALTER TABLE public.organizations 
        ADD COLUMN templates jsonb DEFAULT '{"header": "", "signature": "", "tone": "standard"}'::jsonb; 
    END IF; 
END $$;
