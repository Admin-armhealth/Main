-- Create Requests Table for History & Auto-Save
create table if not exists requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  organization_id uuid references organizations(id),
  patient_name text,
  patient_id text,
  payer text,
  status text default 'draft', -- draft, generated, verified, submitted
  request_type text default 'preauth', -- preauth, appeal
  content text, -- The full markdown content
  metadata jsonb, -- cpt, icd, scores, etc.
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table requests enable row level security;

-- Policies
create policy "Users can view their own requests"
  on requests for select
  using (auth.uid() = user_id);

create policy "Users can insert their own requests"
  on requests for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own requests"
  on requests for update
  using (auth.uid() = user_id);
