-- Fix for infinite recursion in organization_members RLS policy
-- Run this in Supabase SQL Editor

-- 1. Drop the recursive policy
DROP POLICY IF EXISTS "Members can view other members in their org" ON organization_members;

-- 2. Create helper function (security definer bypasses RLS)
CREATE OR REPLACE FUNCTION user_organizations()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id 
  FROM organization_members 
  WHERE user_id = auth.uid();
$$;

-- 3. Recreate policy using the helper function (no recursion)
CREATE POLICY "Members can view other members in their org"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (SELECT user_organizations())
  );

-- Test: This should now work without recursion
SELECT * FROM organization_members LIMIT 1;
