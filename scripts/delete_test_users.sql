-- Delete specific test users to reuse email addresses
-- Run this in Supabase SQL Editor > SQL tab

-- IMPORTANT: Run this as a transaction to ensure all-or-nothing deletion

DO $$
DECLARE
  user_ids UUID[];
BEGIN
  -- Get user IDs
  SELECT ARRAY_AGG(id) INTO user_ids
  FROM auth.users
  WHERE email IN (
    'aki.ruthwik9999@gmail.com',
    'aki.ruthwik@gmail.com',
    'aki.ruthwik39@gmail.com'
  );

  -- Delete in dependency order
  DELETE FROM requests WHERE user_id = ANY(user_ids);
  DELETE FROM audit_logs WHERE user_id = ANY(user_ids);
  DELETE FROM organization_members WHERE user_id = ANY(user_ids);
  DELETE FROM user_profiles WHERE id = ANY(user_ids);
  
  -- Finally delete users
  DELETE FROM auth.users WHERE id = ANY(user_ids);
  
  RAISE NOTICE 'Successfully deleted % users', array_length(user_ids, 1);
END $$;

-- Verify deletion
SELECT email, created_at
FROM auth.users
WHERE email LIKE '%aki.ruthwik%'
ORDER BY created_at DESC;

-- Expected result: Should return 0 rows if deletion was successful
