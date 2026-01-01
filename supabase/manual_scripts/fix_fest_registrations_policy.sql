-- Fix for "permission denied for table users" error
-- This script drops the problematic policy and recreates it using auth.jwt() instead of querying auth.users directly.

DO $$
BEGIN
  -- Drop the policy if it exists
  EXECUTE 'DROP POLICY IF EXISTS "Users can view their own fest registration" ON public.fest_registrations';
  
  -- Recreate the policy
  EXECUTE 'CREATE POLICY "Users can view their own fest registration"
    ON public.fest_registrations FOR SELECT
    USING (
      (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id))
      OR
      (email = (auth.jwt() ->> ''email''))
    )';
END $$;
