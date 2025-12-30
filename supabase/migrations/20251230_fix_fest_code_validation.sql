-- ==============================================================================
-- FIX: Update Fest Code Validation to Use profiles.fest_registration_id
-- ==============================================================================
-- Problem: The validation was looking at registrations.fest_registration_code
--          but FestApprovals page stores the code in profiles.fest_registration_id
-- Solution: Update the RPC function to check profiles.fest_registration_id
-- ==============================================================================

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.get_profile_by_fest_code(TEXT);

-- Create the corrected function that checks profiles.fest_registration_id
CREATE OR REPLACE FUNCTION public.get_profile_by_fest_code(p_code TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Find the profile with this fest_registration_id
  -- The code is stored in profiles.fest_registration_id after approval from Fest Approvals page
  -- We also verify that fest_payment_status is 'approved' for extra security
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

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_profile_by_fest_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_by_fest_code(TEXT) TO anon;

-- Also update the validate_fest_code function if it exists
DROP FUNCTION IF EXISTS public.validate_fest_code(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.validate_fest_code(p_code TEXT, p_email TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  -- Check if code exists in profiles and belongs to the user (via email)
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.fest_registration_id = p_code
      AND lower(p.email) = lower(p_email)
      AND p.is_fest_registered = true
      AND p.fest_payment_status = 'approved'
  ) INTO v_valid;

  IF v_valid THEN
    RETURN json_build_object('valid', true, 'message', 'Fest code verified');
  ELSE
    RETURN json_build_object('valid', false, 'message', 'Invalid Fest Code or Email mismatch');
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.validate_fest_code(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_fest_code(TEXT, TEXT) TO anon;

-- ==============================================================================
-- COMMENT: Summary of the Fest Registration Flow
-- ==============================================================================
-- 1. Student submits Fest Registration with payment proof
-- 2. Admin goes to "Fest Approvals" page
-- 3. Admin approves the payment
-- 4. System:
--    a. Updates registrations: payment_status='completed', proof_status='approved'
--    b. Updates profiles: fest_registration_id=CODE, is_fest_registered=true, fest_payment_status='approved'
--    c. Sends email with the code
-- 5. Student uses the code to register for paid events
-- 6. get_profile_by_fest_code validates by checking profiles.fest_registration_id
-- ==============================================================================
