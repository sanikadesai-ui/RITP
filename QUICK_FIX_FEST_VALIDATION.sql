-- ==============================================================================
-- QUICK FIX: Run this in Supabase SQL Editor to fix the fest code validation
-- ==============================================================================

-- Drop the old function
DROP FUNCTION IF EXISTS public.get_profile_by_fest_code(TEXT);

-- Create the corrected function
CREATE OR REPLACE FUNCTION public.get_profile_by_fest_code(p_code TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Find the profile with this fest_registration_id (stored by Fest Approvals page)
  SELECT 
    p.id,
    p.full_name, 
    p.email, 
    p.phone, 
    p.college, 
    p.year, 
    p.branch,
    COALESCE(p.education, '') as education
  INTO v_profile
  FROM public.profiles p
  WHERE p.fest_registration_id = p_code
    AND p.is_fest_registered = true
    AND p.fest_payment_status = 'approved'
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'data', json_build_object(
        'profile_id', v_profile.id,
        'full_name', v_profile.full_name,
        'email', v_profile.email,
        'phone', v_profile.phone,
        'college', v_profile.college,
        'year', v_profile.year,
        'branch', v_profile.branch,
        'education', v_profile.education
      )
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid Fest Code or Payment not verified.'
    );
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_profile_by_fest_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_by_fest_code(TEXT) TO anon;

-- Verify it works by checking your test code
-- SELECT public.get_profile_by_fest_code('KZN26-6DX5427');
