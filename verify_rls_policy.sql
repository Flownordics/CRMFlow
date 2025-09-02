-- Verify RLS policy for companies table
-- Check current RLS status
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'companies';

-- Check current RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'companies';

-- Test the policy with a mock authenticated user
-- This simulates what happens when a user tries to create a company
DO $$
DECLARE
  test_user_id uuid := gen_random_uuid();
BEGIN
  -- Set the current user context (this is what auth.uid() returns)
  SET LOCAL "request.jwt.claim.sub" = test_user_id::text;
  
  -- Try to insert a test company
  BEGIN
    INSERT INTO public.companies (name, domain, country, created_by) 
    VALUES ('Test Company via RLS', 'test-rls.com', 'DK', test_user_id);
    
    RAISE NOTICE 'SUCCESS: RLS policy allows insertion for authenticated user';
    
    -- Clean up
    DELETE FROM public.companies WHERE name = 'Test Company via RLS';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FAILED: RLS policy blocks insertion: %', SQLERRM;
  END;
  
  -- Reset the user context
  RESET "request.jwt.claim.sub";
END $$;
