-- ==============================================================================
-- FEATURE: Fest Registration Code System
-- ==============================================================================

-- 1. Add `fest_registration_code` to `registrations` table
-- This code will be generated only for 'fest' type events when payment is completed.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'fest_registration_code') THEN
    ALTER TABLE public.registrations ADD COLUMN fest_registration_code TEXT UNIQUE;
  END IF;
END $$;

-- 2. Create a Function to Generate Unique Fest Code
CREATE OR REPLACE FUNCTION public.generate_fest_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 6-digit code prefixed with KZN-
    -- Example: KZN-123456
    v_code := 'KZN-' || floor(random() * 900000 + 100000)::text;
    
    -- Check if it already exists
    SELECT EXISTS(SELECT 1 FROM public.registrations WHERE fest_registration_code = v_code) INTO v_exists;
    
    -- If not exists, return it
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;

-- 3. Create a Trigger Function to Assign Code on Payment Completion
CREATE OR REPLACE FUNCTION public.assign_fest_code_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only proceed if:
  -- 1. Payment status changed to 'completed'
  -- 2. It is a 'fest' event (we need to check the event type)
  -- 3. Code is not already assigned
  
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS DISTINCT FROM 'completed') AND NEW.fest_registration_code IS NULL THEN
    
    -- Check if the event is a 'fest' event
    -- We do a subquery to check event_type. 
    -- Performance note: This is a single row lookup, should be fast.
    IF EXISTS (SELECT 1 FROM public.events WHERE id = NEW.event_id AND event_type = 'fest') THEN
       NEW.fest_registration_code := public.generate_fest_code();
    END IF;
    
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Attach Trigger to Registrations Table
DROP TRIGGER IF EXISTS trigger_assign_fest_code ON public.registrations;

CREATE TRIGGER trigger_assign_fest_code
BEFORE UPDATE ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.assign_fest_code_on_payment();

-- 5. RPC Function to Validate Fest Code (for Event Registration)
CREATE OR REPLACE FUNCTION public.validate_fest_code(p_code TEXT, p_email TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valid BOOLEAN;
  v_profile_id UUID;
BEGIN
  -- Check if code exists and belongs to the user (via email)
  -- We join registrations -> profiles
  SELECT EXISTS (
    SELECT 1 
    FROM public.registrations r
    JOIN public.profiles p ON r.profile_id = p.id
    WHERE r.fest_registration_code = p_code
    AND lower(p.email) = lower(p_email)
    AND r.payment_status = 'completed'
  ) INTO v_valid;

  IF v_valid THEN
    RETURN json_build_object('valid', true, 'message', 'Fest code verified');
  ELSE
    RETURN json_build_object('valid', false, 'message', 'Invalid Fest Code or Email mismatch');
  END IF;
END;
$$;
