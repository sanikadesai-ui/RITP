-- Create fest_registrations table
CREATE TABLE IF NOT EXISTS public.fest_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  education TEXT,
  college TEXT,
  year TEXT,
  branch TEXT,
  account_holder_name TEXT,
  payment_proof_url TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  proof_status TEXT DEFAULT 'pending' CHECK (proof_status IN ('pending', 'approved', 'rejected')),
  fest_registration_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fest_registrations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can create fest registrations"
  ON public.fest_registrations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own fest registration"
  ON public.fest_registrations FOR SELECT
  USING (
    (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id))
    OR
    (email = (auth.jwt() ->> 'email'))
  );

CREATE POLICY "Admins can view all fest registrations"
  ON public.fest_registrations FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update fest registrations"
  ON public.fest_registrations FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Drop existing functions to avoid signature conflicts
DROP FUNCTION IF EXISTS public.register_fest_user(text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.register_fest_user(text, text, text, text, text, text, text, text, text);

-- Update register_fest_user function to use the new table
CREATE OR REPLACE FUNCTION public.register_fest_user(
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_education TEXT,
  p_college TEXT,
  p_year TEXT,
  p_branch TEXT,
  p_account_holder_name TEXT DEFAULT NULL,
  p_payment_proof_url TEXT DEFAULT NULL
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
  -- Check if profile exists by email
  SELECT id, user_id INTO v_profile_id, v_user_id FROM public.profiles WHERE email = p_email;

  IF v_profile_id IS NULL THEN
    -- Create new profile (unlinked to auth user initially)
    INSERT INTO public.profiles (full_name, email, phone, college, year, branch)
    VALUES (p_full_name, p_email, p_phone, p_college, p_year, p_branch)
    RETURNING id INTO v_profile_id;
  ELSE
    -- Update existing profile with latest info
    UPDATE public.profiles 
    SET 
      full_name = COALESCE(p_full_name, full_name),
      phone = COALESCE(p_phone, phone),
      college = COALESCE(p_college, college),
      year = COALESCE(p_year, year),
      branch = COALESCE(p_branch, branch)
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
    proof_status
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
    'pending'
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
