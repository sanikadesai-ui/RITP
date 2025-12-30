-- ==============================================================================
-- FIX: Registration Status Default to Pending
-- ==============================================================================
-- Issue: Registrations were defaulting to 'completed' when a proof was uploaded.
-- Fix: Always default payment_status to 'pending' so admin can verify.

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
    -- 1. Get Fest Event ID (Prioritize the fixed ID)
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
    -- FIX: Always set payment_status to 'pending' regardless of proof upload
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
      'pending', -- CHANGED FROM: CASE WHEN p_payment_proof_url IS NOT NULL THEN 'completed' ELSE 'pending' END
      p_payment_proof_url,
      'pending'
    )
    ON CONFLICT (profile_id, event_id) DO UPDATE SET
      payment_proof_url = COALESCE(EXCLUDED.payment_proof_url, public.registrations.payment_proof_url),
      proof_status = 'pending',
      -- If updating, we might want to reset status to pending if a new proof is uploaded, 
      -- but for now let's keep existing logic or just update proof_status.
      -- The requirement is about "Submit Registration", which implies new or update.
      -- If updating, resetting to pending is safer.
      payment_status = CASE 
        WHEN EXCLUDED.payment_proof_url IS NOT NULL AND EXCLUDED.payment_proof_url != public.registrations.payment_proof_url 
        THEN 'pending' 
        ELSE public.registrations.payment_status 
      END,
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
