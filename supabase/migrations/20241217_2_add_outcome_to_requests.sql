-- Add Outcome Tracking to Requests
alter table requests 
add column if not exists outcome text check (outcome in ('approved', 'denied', 'pending', 'partial')),
add column if not exists outcome_date timestamptz,
add column if not exists outcome_notes text;
