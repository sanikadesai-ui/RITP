-- Migration script to restore fest registrations from profiles table
-- This script identifies profiles that have fest registration data but are missing from fest_registrations table
-- and inserts them into fest_registrations.

DO $$
DECLARE
  r RECORD;
  v_count INT := 0;
  v_proof_url TEXT;
BEGIN
  -- Loop through profiles that have fest registration data (indicated by fest_payment_status or is_fest_registered)
  -- and do NOT have a corresponding entry in fest_registrations (by email)
  FOR r IN 
    SELECT * FROM public.profiles 
    WHERE (fest_payment_status IS NOT NULL OR is_fest_registered = true)
    AND email NOT IN (SELECT email FROM public.fest_registrations)
  LOOP
    
    -- Try to find the proof URL from the old registrations table if possible
    -- We look for the most recent registration for this user that has a proof URL
    SELECT payment_proof_url INTO v_proof_url
    FROM public.registrations
    WHERE profile_id = r.id
    AND payment_proof_url IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;

    -- Insert into fest_registrations
    INSERT INTO public.fest_registrations (
      profile_id,
      full_name,
      email,
      phone,
      college,
      year,
      branch,
      payment_status,
      proof_status,
      fest_registration_code,
      payment_proof_url, -- Include the recovered proof URL
      created_at,
      updated_at
    ) VALUES (
      r.id,
      r.full_name,
      r.email,
      COALESCE(r.phone, ''),
      r.college,
      r.year,
      r.branch,
      -- Map profile status to fest_registrations status
      CASE 
        WHEN r.fest_payment_status = 'approved' THEN 'completed'
        WHEN r.fest_payment_status = 'rejected' THEN 'failed'
        ELSE 'pending'
      END,
      CASE 
        WHEN r.fest_payment_status = 'approved' THEN 'approved'
        WHEN r.fest_payment_status = 'rejected' THEN 'rejected'
        ELSE 'pending'
      END,
      r.fest_registration_id, -- Restore the code if it exists
      v_proof_url, -- Insert the recovered proof URL
      r.created_at,
      now()
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Restored % registrations from profiles table.', v_count;
END $$;
