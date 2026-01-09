-- Migration: Structured Policy Rules
-- Description: Adds 'policy_rules' table to store deterministic criteria for the V1 Policy Engine.

create table if not exists policy_rules (
    id uuid default uuid_generate_v4() primary key,
    policy_id uuid not null references policies(id) on delete cascade,
    
    -- Categorization for the UI/Logic
    category text not null, -- e.g., 'Conservative Therapy', 'Imaging', 'Diagnosis', 'Contraindication'
    
    -- Rule Logic
    rule_id text, -- Optional stable ID for external referencing e.g. 'RULE-001'
    operator text not null check (operator in (
        'MATCH_ONE',    -- value_json is array of strings; extracted fact must match at least one
        'MATCH_ALL',    -- value_json is array; extracted fact must match all
        'GREATER_THAN', -- value_json is number; extracted fact > value
        'LESS_THAN',    -- value_json is number; extracted fact < value
        'CONTAINS',     -- value_json is string; extracted fact must contain this substring
        'EXISTS',       -- value_json is boolean/null; fact must simply exist
        'NOT_EXISTS'    -- fact must NOT exist (e.g. contraindications)
    )),
    
    -- The threshold/criteria value
    value_json jsonb not null, 
    
    -- User-facing explanation if this rule fails
    failure_message text, 
    
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Index for fast lookup during verification
create index if not exists idx_policy_rules_policy_id on policy_rules(policy_id);

-- Enable RLS
alter table policy_rules enable row level security;

-- READ: Public/Global or Org-owned (Same as parent policies)
create policy "Read Global and Org Policy Rules"
  on policy_rules for select
  using (
    exists (
      select 1 from policies p
      where p.id = policy_rules.policy_id
      and (
        p.organization_id is null 
        or 
        p.organization_id in (select organization_id from user_profiles where id = auth.uid())
      )
    )
  );

-- WRITE: Org-owned only
create policy "Users can add Private Policy Rules"
  on policy_rules for insert
  with check (
    exists (
      select 1 from policies p
      where p.id = policy_rules.policy_id
      and p.organization_id in (select organization_id from user_profiles where id = auth.uid())
    )
  );
