-- Migration: Policy Engine Schema
-- Description: Enhances policies table and adds policy_sections and policy_codes for scraping.

-- 1. Enhance 'policies' table
alter table policies 
add column if not exists last_scraped_at timestamp with time zone,
add column if not exists status text default 'active' check (status in ('active', 'archived', 'draft'));

-- 2. Create 'policy_sections' table
create table if not exists policy_sections (
    id uuid default uuid_generate_v4() primary key,
    policy_id uuid not null references policies(id) on delete cascade,
    section_title text not null,
    content text,
    display_order int default 0,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Index for fast retrieval by policy
create index if not exists idx_policy_sections_policy_id on policy_sections(policy_id);

-- 3. Create 'policy_codes' table (Many-to-Many for CPT/ICD)
create table if not exists policy_codes (
    id uuid default uuid_generate_v4() primary key,
    policy_id uuid not null references policies(id) on delete cascade,
    code text not null,
    code_type text not null, -- 'CPT', 'ICD-10', 'HCPCS'
    description text,
    created_at timestamp with time zone default now(),
    unique(policy_id, code, code_type)
);

-- Index for looking up policies by code
create index if not exists idx_policy_codes_code on policy_codes(code);

-- RLS Policies for new tables

alter table policy_sections enable row level security;
alter table policy_codes enable row level security;

-- READ: Same as policies (Global public, or Org-specific)
create policy "Read Global and Org Policy Sections"
  on policy_sections for select
  using (
    exists (
      select 1 from policies p
      where p.id = policy_sections.policy_id
      and (
        p.organization_id is null 
        or 
        p.organization_id in (select organization_id from user_profiles where id = auth.uid())
      )
    )
  );

create policy "Read Global and Org Policy Codes"
  on policy_codes for select
  using (
    exists (
      select 1 from policies p
      where p.id = policy_codes.policy_id
      and (
        p.organization_id is null 
        or 
        p.organization_id in (select organization_id from user_profiles where id = auth.uid())
      )
    )
  );

-- WRITE: Only Service Role or Admins (for now, simplistic permissive for authenticated adding their own, 
-- but since these are child tables, we usually rely on the parent policy ownership).
-- For this "Policy Engine", we assume the scraper runs as a service role or admin.
-- We'll add a simple "Users can insert if they own the policy" rule.

create policy "Users can add Private Policy Sections"
  on policy_sections for insert
  with check (
    exists (
      select 1 from policies p
      where p.id = policy_sections.policy_id
      and p.organization_id in (select organization_id from user_profiles where id = auth.uid())
    )
  );

create policy "Users can add Private Policy Codes"
  on policy_codes for insert
  with check (
    exists (
      select 1 from policies p
      where p.id = policy_codes.policy_id
      and p.organization_id in (select organization_id from user_profiles where id = auth.uid())
    )
  );
