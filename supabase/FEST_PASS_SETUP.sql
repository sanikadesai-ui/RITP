-- ================================================
-- KAIZEN 2026 - Fest Pass & Coordinator Setup
-- Complete SQL Script for Get Pass Functionality
-- Run this in Supabase SQL Editor
-- ================================================

-- ============ PART 0: HELPER FUNCTIONS ============

-- Create is_admin function (required for RLS policies)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- Create user_roles table if not exists (needed for is_admin function)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policies for user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (true);

-- ============ PART 1: COORDINATORS TABLE ============

-- Create coordinators table if not exists
CREATE TABLE IF NOT EXISTS public.coordinators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    password_hash TEXT NOT NULL,
    assigned_events UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add is_global column if table already exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'coordinators' 
                   AND column_name = 'is_global') THEN
        ALTER TABLE public.coordinators ADD COLUMN is_global BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create index for email lookup
CREATE INDEX IF NOT EXISTS idx_coordinators_email ON public.coordinators(email);

-- Enable RLS
ALTER TABLE public.coordinators ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage coordinators" ON public.coordinators;
DROP POLICY IF EXISTS "Coordinators can view own data" ON public.coordinators;
DROP POLICY IF EXISTS "Public coordinator login" ON public.coordinators;
DROP POLICY IF EXISTS "Allow anon insert coordinators" ON public.coordinators;
DROP POLICY IF EXISTS "Allow authenticated insert coordinators" ON public.coordinators;

-- RLS Policies for coordinators
CREATE POLICY "Admins can manage coordinators" ON public.coordinators
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Public coordinator login" ON public.coordinators
    FOR SELECT TO anon, authenticated
    USING (true);

-- Allow admin to insert coordinators
CREATE POLICY "Allow authenticated insert coordinators" ON public.coordinators
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

-- Grant permissions
GRANT ALL ON public.coordinators TO authenticated;
GRANT SELECT ON public.coordinators TO anon;

-- ============ PART 2: FEST REGISTRATIONS TABLE ============

-- Create fest_registrations table if not exists
CREATE TABLE IF NOT EXISTS public.fest_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fest_reg_email ON public.fest_registrations(email);
CREATE INDEX IF NOT EXISTS idx_fest_reg_code ON public.fest_registrations(fest_registration_code);
CREATE INDEX IF NOT EXISTS idx_fest_reg_proof_status ON public.fest_registrations(proof_status);

-- Enable RLS
ALTER TABLE public.fest_registrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can create fest registrations" ON public.fest_registrations;
DROP POLICY IF EXISTS "Public can check status by email" ON public.fest_registrations;
DROP POLICY IF EXISTS "Admins can view all fest registrations" ON public.fest_registrations;
DROP POLICY IF EXISTS "Admins can update fest registrations" ON public.fest_registrations;

-- RLS Policies
CREATE POLICY "Anyone can create fest registrations" ON public.fest_registrations
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Public can check status by email" ON public.fest_registrations
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Admins can view all fest registrations" ON public.fest_registrations
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update fest registrations" ON public.fest_registrations
    FOR UPDATE TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Grant permissions
GRANT ALL ON public.fest_registrations TO authenticated;
GRANT SELECT, INSERT ON public.fest_registrations TO anon;

-- ============ PART 3: FEST ATTENDANCE TABLE ============

-- Drop and recreate fest_attendance table with correct columns
DROP TABLE IF EXISTS public.fest_attendance CASCADE;

-- Create fest_attendance table with all required columns
CREATE TABLE public.fest_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fest_registration_id UUID NOT NULL REFERENCES public.fest_registrations(id) ON DELETE CASCADE,
    fest_code TEXT,
    attendee_name TEXT,
    attendee_email TEXT,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_type TEXT DEFAULT 'main_gate',
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    marked_by UUID,
    coordinator_name TEXT,
    notes TEXT,
    UNIQUE(fest_registration_id, entry_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fest_attendance_reg ON public.fest_attendance(fest_registration_id);
CREATE INDEX IF NOT EXISTS idx_fest_attendance_date ON public.fest_attendance(entry_date);
CREATE INDEX IF NOT EXISTS idx_fest_attendance_code ON public.fest_attendance(fest_code);

-- Enable RLS
ALTER TABLE public.fest_attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Coordinators can mark attendance" ON public.fest_attendance;
DROP POLICY IF EXISTS "View attendance" ON public.fest_attendance;

-- RLS Policies
CREATE POLICY "Coordinators can mark attendance" ON public.fest_attendance
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "View attendance" ON public.fest_attendance
    FOR SELECT TO anon, authenticated
    USING (true);

-- Grant permissions
GRANT ALL ON public.fest_attendance TO authenticated;
GRANT SELECT, INSERT ON public.fest_attendance TO anon;

-- ============ PART 4: FEST SETTINGS ============

-- Create fest_settings table (separate from main settings to avoid conflicts)
CREATE TABLE IF NOT EXISTS public.fest_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fest_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public can read fest settings" ON public.fest_settings;
DROP POLICY IF EXISTS "Admins can manage fest settings" ON public.fest_settings;

-- RLS Policies
CREATE POLICY "Public can read fest settings" ON public.fest_settings
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Admins can manage fest settings" ON public.fest_settings
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Grant permissions
GRANT SELECT ON public.fest_settings TO anon;
GRANT ALL ON public.fest_settings TO authenticated;

-- Insert default settings
INSERT INTO public.fest_settings (key, value, description) VALUES
    ('fest_upi_id', 'kaizenfest@upi', 'UPI ID for fest registration payments'),
    ('fest_registration_amount', '499', 'Fest registration fee in INR'),
    ('fest_name', 'KAIZEN 2026', 'Name of the fest'),
    ('fest_date', '2026-02-15', 'Start date of the fest')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- ============ PART 5: FUNCTION TO GENERATE FEST CODE ============

CREATE OR REPLACE FUNCTION public.generate_fest_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'KZN-2026-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
        SELECT EXISTS(SELECT 1 FROM public.fest_registrations WHERE fest_registration_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$;

-- ============ PART 6: STORAGE BUCKET ============

-- Create storage bucket for payment proofs (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true)
-- ON CONFLICT (id) DO NOTHING;

-- ============ SETUP COMPLETE ============
-- 
-- IMPORTANT: After running this script, add yourself as admin:
-- 
-- Step 1: Find your user ID
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
--
-- Step 2: Add yourself as admin
-- INSERT INTO public.user_roles (user_id, role) VALUES ('YOUR-USER-ID', 'admin');
--
-- ============================================
