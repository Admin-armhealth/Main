-- Migration: Add Policy Sync Tracking
alter table policies 
add column if not exists last_checked_at timestamptz default now(),
add column if not exists last_updated_at timestamptz default now(),
add column if not exists content_hash text;

-- Index for querying stale policies
create index if not exists policies_last_checked_idx on policies(last_checked_at);
