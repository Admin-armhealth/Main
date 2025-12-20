-- Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id),
    user_id uuid REFERENCES auth.users(id),
    action_type text NOT NULL, -- e.g., 'GENERATE_PREAUTH', 'EXPORT_PDF', 'LOGIN'
    resource_id text, -- ID of the generated document or affected record
    metadata jsonb DEFAULT '{}'::jsonb, -- Additional details (IP, status, etc.)
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: INSERT (Authenticated users can log their own actions)
CREATE POLICY "Enable insert for authenticated users" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: SELECT (Users can view logs for their own organization)
CREATE POLICY "Enable select for users in same organization" ON public.audit_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles
            WHERE id = auth.uid()
        )
    );

-- Policy: DELETE/UPDATE (DENY ALL - Immutability)
-- No policies created for UPDATE or DELETE implies denial by default in Supabase RLS.
-- But explicitly ensuring no one can delete:
CREATE POLICY "Deny delete for all" ON public.audit_logs
    FOR DELETE USING (false);
    
CREATE POLICY "Deny update for all" ON public.audit_logs
    FOR UPDATE USING (false);
