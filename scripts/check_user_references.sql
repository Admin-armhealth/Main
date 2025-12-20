-- Step 1: Find all tables referencing these users
-- Run this first to see what's blocking deletion

WITH target_users AS (
  SELECT id, email FROM auth.users
  WHERE email IN (
    'aki.ruthwik9999@gmail.com',
    'aki.ruthwik@gmail.com',
    'aki.ruthwik39@gmail.com'
  )
)
SELECT 
  'requests' as table_name,
  COUNT(*) as record_count
FROM requests
WHERE user_id IN (SELECT id FROM target_users)

UNION ALL

SELECT 
  'organization_members' as table_name,
  COUNT(*) as record_count
FROM organization_members
WHERE user_id IN (SELECT id FROM target_users)

UNION ALL

SELECT 
  'audit_logs' as table_name,
  COUNT(*) as record_count
FROM audit_logs
WHERE user_id IN (SELECT id FROM target_users)

UNION ALL

SELECT 
  'user_profiles' as table_name,
  COUNT(*) as record_count
FROM user_profiles
WHERE id IN (SELECT id FROM target_users);
