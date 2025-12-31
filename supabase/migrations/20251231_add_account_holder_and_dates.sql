-- Add account_holder_name to registrations
ALTER TABLE public.registrations 
ADD COLUMN IF NOT EXISTS account_holder_name TEXT;

-- Add fest dates to fest_settings
ALTER TABLE public.fest_settings
ADD COLUMN IF NOT EXISTS fest_start_date timestamptz,
ADD COLUMN IF NOT EXISTS fest_end_date timestamptz;

-- Update the register_fest_user function
CREATE OR REPLACE FUNCTION public.register_fest_user(
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_education TEXT,
  p_college TEXT,
  p_year TEXT,
  p_branch TEXT,
  p_payment_proof_url TEXT DEFAULT NULL,
  p_account_holder_name TEXT DEFAULT NULL
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
    -- 1. Get Fest Event ID
    SELECT id INTO v_fest_event_id FROM public.events 
    WHERE id = '12345678-1234-1234-1234-123456789012';

    IF v_fest_event_id IS NULL THEN
      SELECT id INTO v_fest_event_id FROM public.events 
      WHERE event_type = 'fest' LIMIT 1;
    END IF;

    IF v_fest_event_id IS NULL THEN
       RAISE EXCEPTION 'Fest event not found.';
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
      payment_status,
      payment_proof_url,
      account_holder_name,
      proof_status
    ) VALUES (
      v_profile_id,
      v_fest_event_id,
      'pending',
      p_payment_proof_url,
      p_account_holder_name,
      CASE WHEN p_payment_proof_url IS NOT NULL THEN 'pending' ELSE 'not_required' END
    )
    ON CONFLICT (profile_id, event_id) DO UPDATE SET
      payment_proof_url = COALESCE(EXCLUDED.payment_proof_url, public.registrations.payment_proof_url),
      account_holder_name = COALESCE(EXCLUDED.account_holder_name, public.registrations.account_holder_name),
      updated_at = now()
    RETURNING id INTO v_registration_id;

    -- 4. Return Success Response
    SELECT json_build_object(
      'success', true,
      'message', 'Registration successful',
      'data', json_build_object(
        'registration_id', v_registration_id,
        'profile_id', v_profile_id
      )
    ) INTO v_response;

    RETURN v_response;

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
  END;
END;
$$;
