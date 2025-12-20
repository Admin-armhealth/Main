-- 1. Organizations
create table if not exists organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);
alter table organizations enable row level security;

-- 2. Members (Join Table)
create table if not exists organization_members (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('owner', 'admin', 'member', 'readonly')) default 'member',
  created_at timestamptz default now(),
  unique(organization_id, user_id)
);
alter table organization_members enable row level security;

-- 3. Invites
create table if not exists invites (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade,
  email text not null,
  token text unique not null,
  role text default 'member',
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
alter table invites enable row level security;

-- 4. Audit Logs (Append Only)
create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key, -- Explicit UUID PK
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  target_resource text,
  details jsonb,
  created_at timestamptz default now()
);
alter table audit_logs enable row level security;

-- RLS POLICIES ----------------------------------------------------

-- Organizations: Users can view orgs they are members of
create policy "Members can view their organizations"
  on organizations for select
  using (
    id in (
      select organization_id from organization_members
      where user_id = auth.uid()
    )
  );

-- Members : Users can view members in their orgs
create policy "Members can view other members in their org"
  on organization_members for select
  using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid()
    )
  );

-- Audit Logs: Admin/Owners can select
create policy "Admins can view audit logs"
  on audit_logs for select
  using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- Audit Logs: Members can insert (logging their own actions)
create policy "Members can insert logs"
  on audit_logs for insert
  with check (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid()
    )
  );
-- No Update/Delete for Audit Logs (Immutable by design)

-- UPDATE REQUESTS POLICIES (Switch from Personal to Multi-Tenant) --

-- Drop old "Personal" policies if they exist to avoid conflict
drop policy if exists "Users can view their own requests" on requests;
drop policy if exists "Users can insert their own requests" on requests;
drop policy if exists "Users can update their own requests" on requests;

-- New "Organization" policies
create policy "Members can view org requests"
  on requests for select
  using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid()
    )
  );

create policy "Members can insert org requests"
  on requests for insert
  with check (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid()
    )
  );

create policy "Members can update org requests"
  on requests for update
  using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid()
    )
  );
