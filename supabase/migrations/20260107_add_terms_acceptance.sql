-- Add terms acceptance columns to fest_registrations
ALTER TABLE public.fest_registrations 
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Add terms acceptance columns to profiles (to persist across registrations if needed)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Update the register_fest_user function to accept terms_accepted
CREATE OR REPLACE FUNCTION public.register_fest_user(
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_education TEXT,
  p_college TEXT,
  p_year TEXT,
  p_branch TEXT,
  p_account_holder_name TEXT DEFAULT NULL,
  p_payment_proof_url TEXT DEFAULT NULL,
  p_terms_accepted BOOLEAN DEFAULT FALSE
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile_id UUID;
  v_user_id UUID;
  v_registration_id UUID;
BEGIN
  -- 1. Check if email already registered in fest_registrations
  IF EXISTS (SELECT 1 FROM public.fest_registrations WHERE email = p_email) THEN
    RETURN json_build_object('success', false, 'message', 'Email already registered for Fest');
  END IF;

  -- 2. Get or Create Profile
  SELECT id, user_id INTO v_profile_id, v_user_id FROM public.profiles WHERE email = p_email;

  IF v_profile_id IS NULL THEN
    INSERT INTO public.profiles (full_name, email, phone, college, year, branch, terms_accepted, terms_accepted_at)
    VALUES (p_full_name, p_email, p_phone, p_college, p_year, p_branch, p_terms_accepted, CASE WHEN p_terms_accepted THEN now() ELSE NULL END)
    RETURNING id INTO v_profile_id;
  ELSE
    UPDATE public.profiles 
    SET 
      full_name = COALESCE(p_full_name, full_name),
      phone = COALESCE(p_phone, phone),
      college = COALESCE(p_college, college),
      year = COALESCE(p_year, year),
      branch = COALESCE(p_branch, branch),
      terms_accepted = CASE WHEN terms_accepted THEN true ELSE p_terms_accepted END,
      terms_accepted_at = CASE WHEN terms_accepted THEN terms_accepted_at ELSE (CASE WHEN p_terms_accepted THEN now() ELSE NULL END) END
    WHERE id = v_profile_id;
  END IF;

  -- 3. Insert into fest_registrations
  INSERT INTO public.fest_registrations (
    profile_id,
    full_name,
    email,
    phone,
    education,
    college,
    year,
    branch,
    account_holder_name,
    payment_proof_url,
    payment_status,
    proof_status,
    terms_accepted,
    terms_accepted_at
  ) VALUES (
    v_profile_id,
    p_full_name,
    p_email,
    p_phone,
    p_education,
    p_college,
    p_year,
    p_branch,
    p_account_holder_name,
    p_payment_proof_url,
    'pending',
    'pending',
    p_terms_accepted,
    CASE WHEN p_terms_accepted THEN now() ELSE NULL END
  ) RETURNING id INTO v_registration_id;

  RETURN json_build_object(
    'success', true, 
    'message', 'Registration successful',
    'registration_id', v_registration_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
