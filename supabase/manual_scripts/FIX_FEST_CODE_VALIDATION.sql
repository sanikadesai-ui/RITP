-- ==============================================================================
-- FIX: Fest Code Validation & Profile Fetching
-- ==============================================================================

-- Create a secure RPC function to validate the code and fetch profile details
-- This replaces the direct client-side query which was looking at the wrong table/column.

CREATE OR REPLACE FUNCTION public.get_profile_by_fest_code(p_code TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Find the registration with this code that is completed
  -- Join with profiles to get the user details
  SELECT p.full_name, p.email, p.phone, p.college, p.year, p.branch, p.education
  INTO v_profile
  FROM public.registrations r
  JOIN public.profiles p ON r.profile_id = p.id
  WHERE r.fest_registration_code = p_code
  AND r.payment_status = 'completed'
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'data', json_build_object(
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
