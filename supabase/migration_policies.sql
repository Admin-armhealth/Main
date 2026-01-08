-- Create Policies Table for "The Brain"
create table if not exists policies (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default now(),
  
  -- The Key
  payer text not null,       -- e.g., 'Aetna', 'Cigna', 'Medicare'
  cpt_code text not null,    -- e.g., '27447'
  
  -- The Knowledge
  title text,                -- e.g., 'Total Knee Arthroplasty (Commercial)'
  policy_content text,       -- Human readable summary (Legacy/fallback)
  
  -- THE MOAT (Structured Logic)
  -- Schema: { "criteria": [{ "id": "bmi", "operator": "<", "value": 40 }] }
  structured_content jsonb,
  
  -- The Source Tracking (Engine)
  source_url text,           -- Link to the PDF/Site
  content_hash text,         -- SHA256 of the raw text (to detect updates)
  last_checked_at timestamp with time zone,
  last_updated_at timestamp with time zone,

  -- The Scope (Answer to "Who maintains it?")
  organization_id uuid references organizations(id), 
  
  -- Search Index (Simple)
  unique(payer, cpt_code, organization_id)
);

-- RLS Policies
alter table policies enable row level security;

-- 1. READ: Everyone can read "Global" rules. Users can read their own "Org" rules.
create policy "Read Global and Org Policies"
  on policies for select
  using (
    organization_id is null 
    or 
    organization_id in (
      select organization_id from user_profiles 
      where id = auth.uid()
    )
  );

-- 2. WRITE: Only Admins can insert Global. Users can insert Private.
create policy "Users can add Private Rules"
  on policies for insert
  with check (
    organization_id in (
      select organization_id from user_profiles 
      where id = auth.uid()
    )
  );
  
-- 3. UPDATE: Sync Engine (Service Role) bypasses RLS, but for users:
create policy "Users can update Private Rules"
  on policies for update
  using (
    organization_id in (
        select organization_id from user_profiles 
        where id = auth.uid()
    )
  );
