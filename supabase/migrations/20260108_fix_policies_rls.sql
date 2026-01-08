
-- Fix RLS for "policies" table
-- The original table might be missing a policy for "Global" (null org) items.

-- Enable RLS just in case
alter table policies enable row level security;

-- Allow reading GLOBAL policies (id IS NULL or 'global')
create policy "Users can view global policies"
  on policies for select
  using (
    organization_id is null
  );

-- Also ensure users can see their OWN org policies (redundant if already exists, but safe)
create policy "Users can view their org policies"
  on policies for select
  using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid()
    )
  );
