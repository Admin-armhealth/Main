-- Migration: Restore Requests Table for History
-- Description: Tracks individual workflow requests (Checks, Appeals) to provide a "History" view.
-- Note: Replaces the previous 'requests' table concept but focuses on Workflow Units, not Patient Records.

create table if not exists requests (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id),
    organization_id uuid, -- Optional, if we want org-wide visibility later
    request_type text not null, -- 'compliance_check', 'appeal_generation'
    title text, -- Auto-generated title e.g. "Check: CPT 76872"
    status text default 'draft', -- 'draft', 'processing', 'completed', 'error'
    
    -- Data Storage (JSONB for flexibility)
    input_data jsonb default '{}'::jsonb, -- The form inputs (CPT, Notes snippet, metadata)
    output_data jsonb default '{}'::jsonb, -- The resulting analysis or generated letter content
    
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Index for fast dashboard retrieval
create index if not exists idx_requests_user_created on requests(user_id, created_at desc);
create index if not exists idx_requests_org_created on requests(organization_id, created_at desc);

-- RLS Policies
alter table requests enable row level security;

-- Policy: Users can see their own requests
create policy "Users can view direct requests"
  on requests for select
  using (auth.uid() = user_id);

-- Policy: Users can see their organization's requests (Collab feature)
create policy "Users can view org requests"
  on requests for select
  using (
    organization_id in (
      select organization_id from user_profiles where id = auth.uid()
    )
  );

-- Policy: Users can insert their own requests
create policy "Users can insert requests"
  on requests for insert
  with check (auth.uid() = user_id);

-- Policy: Users can update their own requests
create policy "Users can update own requests"
  on requests for update
  using (auth.uid() = user_id);
