
-- Add versioning columns to policies table
alter table policies 
add column if not exists content_hash text,
add column if not exists version int default 1;

-- Create table to track history of changes
create table if not exists policy_changes (
    id uuid default uuid_generate_v4() primary key,
    policy_id uuid references policies(id) on delete cascade,
    old_hash text,
    new_hash text,
    change_summary text, -- AI generated summary of what changed
    detected_at timestamp with time zone default now()
);

-- Enable RLS
alter table policy_changes enable row level security;

-- Policies for policy_changes (Global read for now, similar to policies)
create policy "Users can view policy changes" on policy_changes 
for select using (true);

-- Allow backend (service role) to insert/update
create policy "Service role can manage policy changes" on policy_changes 
for all using (true);
