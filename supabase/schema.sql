-- Enable Row Level Security (RLS) is best practice.
-- We are only storing metadata, NO PHI.

create table public.usage_logs (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action_type text not null, -- e.g., 'generate_preauth', 'generate_appeal'
  created_at timestamptz not null default now(),
  constraint usage_logs_pkey primary key (id)
);

-- Enable Row Level Security (RLS)
alter table public.usage_logs enable row level security;

-- 1. Organizations (Hospitals/Clinics)
create table public.organizations (
  id uuid not null default gen_random_uuid(),
  name text not null,
  tin text, -- Tax ID shared by the organization
  npi text, -- Group NPI shared by the organization
  saved_preferences jsonb default '{"shortcuts": []}'::jsonb, -- Auto-saved user codes
  created_at timestamptz not null default now(),
  constraint organizations_pkey primary key (id)
);
alter table public.organizations enable row level security;

-- 2. User Profiles (Linking Auth Users to Organizations)
create table public.user_profiles (
  id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text,
  npi text, -- Individual NPI
  created_at timestamptz not null default now(),
  constraint user_profiles_pkey primary key (id)
);
alter table public.user_profiles enable row level security;

-- 3. Update Usage Logs to belong to an Organization
alter table public.usage_logs 
  add column organization_id uuid references public.organizations(id);

-- POLICIES -------------------------------------------

-- Organizations: Users can view their own organization
create policy "Users can view own organization"
on public.organizations
for select
to authenticated
using (
  id in (
    select organization_id from public.user_profiles
    where id = auth.uid()
  )
);

-- User Profiles: Users can view their own profile
create policy "Users can view own profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = id);

-- Usage Logs:
-- Users can insert their own logs (automatically tagging org if possible, or trigger handled)
create policy "Users can insert own logs"
on public.usage_logs
for insert
to authenticated
with check (
  auth.uid() = user_id
);

-- Users can view logs belonging to their organization
create policy "Users can view organization logs"
on public.usage_logs
for select
to authenticated
using (
  organization_id in (
    select organization_id from public.user_profiles
    where id = auth.uid()
  )
);

-- Comments
comment on table public.usage_logs is 'Audit logs. NO PHI.';
comment on table public.organizations is 'Tenants (Hospitals/Clinics).';
comment on table public.user_profiles is 'Extends auth.users with organization link.';
