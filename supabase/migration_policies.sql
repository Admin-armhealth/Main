-- Create Policies Table for "The Brain"
create table if not exists policies (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default now(),
  
  -- The Key
  payer text not null,       -- e.g., 'Aetna', 'Cigna', 'Medicare'
  cpt_code text not null,    -- e.g., '27447'
  
  -- The Knowledge
  title text,                -- e.g., 'Total Knee Arthroplasty (Commercial)'
  policy_content text,       -- The actual simplified rules (e.g., "BMI < 40, 6 weeks PT")
  source_url text,           -- Link to the PDF/Site
  
  -- The Scope (Answer to "Who maintains it?")
  organization_id uuid references organizations(id), 
  -- IF NULL: It is a GLOBAL rule (Maintained by You/System)
  -- IF SET: It is a CLINIC rule (Private Override)

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

-- 2. WRITE: Only Admins (or Users for their own Org) can insert.
-- For MVP, we'll allow Authenticated users to write to their OWN Org, 
-- or write Global if they are 'system_admin' (we don't have that role yet, so let's stick to Org write).
create policy "Users can add Private Rules"
  on policies for insert
  with check (
    organization_id in (
      select organization_id from user_profiles 
      where id = auth.uid()
    )
  );
