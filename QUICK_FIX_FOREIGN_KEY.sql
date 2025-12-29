-- ==============================================================================
-- FIX: Foreign Key Violation on Registrations Table
-- ==============================================================================

-- 1. Ensure the specific Fest Event exists with the ID expected by the fallback logic
INSERT INTO public.events (
  id,
  name,
  description,
  category,
  event_type,
  venue,
  event_date,
  registration_deadline,
  max_participants,
  is_featured,
  status
) VALUES (
  '12345678-1234-1234-1234-123456789012', -- This is the ID causing the FK error if missing
  'Main Fest Registration',
  'Main festival registration for all participants',
  'Main',
  'fest',
  'Online',
  now() + interval '30 days',
  now() + interval '7 days',
  1000,
  false,
  'upcoming'
)
ON CONFLICT (id) DO UPDATE SET
  event_type = 'fest',
  name = 'Main Fest Registration';

-- 2. Drop ambiguous functions to clean up
DROP FUNCTION IF EXISTS public.register_fest_user(text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.register_fest_user(text, text, text, text, text, text, text, text);

-- 3. Re-create the robust version of the function
CREATE OR REPLACE FUNCTION public.register_fest_user(
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_education TEXT,
  p_college TEXT,
  p_year TEXT,
  p_branch TEXT,
  p_payment_proof_url TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_registration_id UUID;
  v_fest_event_id UUID;
  v_response json;
BEGIN
  BEGIN
    -- 1. Get Fest Event ID (Prioritize the fixed ID to match the INSERT above)
    SELECT id INTO v_fest_event_id FROM public.events 
    WHERE id = '12345678-1234-1234-1234-123456789012';

    -- Fallback: Find any event of type 'fest'
    IF v_fest_event_id IS NULL THEN
      SELECT id INTO v_fest_event_id FROM public.events 
      WHERE event_type = 'fest' LIMIT 1;
    END IF;

    -- CRITICAL CHECK: If no event exists, we cannot proceed.
    IF v_fest_event_id IS NULL THEN
       RAISE EXCEPTION 'Fest event configuration missing. Please contact admin.';
    END IF;

    -- 2. Create or Update Profile
    INSERT INTO public.profiles (
      full_name,
      email,
      phone,
      education,
      college,
      year,
      branch
    ) VALUES (
      p_full_name,
      p_email,
      p_phone,
      p_education,
      p_college,
      p_year,
      p_branch
    )
    ON CONFLICT (email) DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      college = COALESCE(EXCLUDED.college, public.profiles.college),
      year = COALESCE(EXCLUDED.year, public.profiles.year),
      branch = COALESCE(EXCLUDED.branch, public.profiles.branch),
      updated_at = now()
    RETURNING id INTO v_profile_id;

    -- 3. Create Registration
    INSERT INTO public.registrations (
      profile_id,
      event_id,
      registration_type,
      payment_status,
      payment_proof_url,
      proof_status
    ) VALUES (
      v_profile_id,
      v_fest_event_id,
      'solo',
      CASE WHEN p_payment_proof_url IS NOT NULL THEN 'completed' ELSE 'pending' END,
      p_payment_proof_url,
      'pending'
    )
    ON CONFLICT (profile_id, event_id) DO UPDATE SET
      payment_proof_url = COALESCE(EXCLUDED.payment_proof_url, public.registrations.payment_proof_url),
      proof_status = 'pending',
      updated_at = now()
    RETURNING id INTO v_registration_id;

    -- 4. Create Proof Upload Record
    IF p_payment_proof_url IS NOT NULL THEN
      INSERT INTO public.proof_uploads (
        registration_id,
        file_path,
        file_name,
        file_type,
        proof_status
      ) VALUES (
        v_registration_id,
        p_payment_proof_url,
        'payment_proof.file',
        'application/octet-stream',
        'pending'
      )
      ON CONFLICT DO NOTHING;
    END IF;

    v_response := json_build_object(
      'success', true,
      'message', 'Registration submitted successfully',
      'registration_id', v_registration_id
    );

    RETURN v_response;

  EXCEPTION WHEN OTHERS THEN
    v_response := json_build_object(
      'success', false,
      'message', SQLERRM,
      'error_code', SQLSTATE
    );
    RETURN v_response;
  END;
END;
$$;
