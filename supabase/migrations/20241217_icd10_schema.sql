
-- Create ICD-10 Codes table
create table if not exists icd10_codes (
    code text primary key,
    description text not null,
    search_text tsvector generated always as (to_tsvector('english', code || ' ' || description)) stored
);

-- Index for fast search
create index if not exists icd10_codes_search_idx on icd10_codes using gin (search_text);

-- Public access (Reference data)
alter table icd10_codes enable row level security;

create policy "Allow public read access"
    on icd10_codes for select
    using (true);
