-- 🛠️ PRE-FLIGHT FIX: CLEANUP & RESET
-- Run this in Supabase SQL Editor to clear conflicts and set up Test Users correctly.

-- 1. Cleanup old collisions (Cascades to members)
delete from auth.users where email in ('user_a@test.com', 'user_b@test.com');

-- 2. Insert Dummy Auth Users (With FIXED IDs for Testing)
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
  recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, 
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user_a@test.com', 'password', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"User A"}', now(), now(), '', '', '', ''),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user_b@test.com', 'password', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"User B"}', now(), now(), '', '', '', '');

-- 3. Link Memberships (Ensure Org A and Org B exist first - usually handled by seed script)
-- We upsert to be safe.
insert into organization_members (organization_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'member'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'owner')
on conflict (organization_id, user_id) do update set role = EXCLUDED.role;
