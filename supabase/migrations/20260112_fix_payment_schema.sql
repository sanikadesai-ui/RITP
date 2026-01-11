-- Fix for missing columns in registrations table
-- This ensures the payment workflow columns exist

ALTER TABLE public.registrations 
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_link_sent_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS slot_expired BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_reminder_sent BOOLEAN DEFAULT FALSE;

-- Ensure the payment_status check constraint supports the new statuses
DO $$ 
BEGIN
    -- We attempt to drop the constraint to re-add it with new values
    -- This handles cases where the constraint might be old
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'registrations_payment_status_check' 
        AND table_name = 'registrations'
    ) THEN
        ALTER TABLE public.registrations DROP CONSTRAINT registrations_payment_status_check;
    END IF;
END $$;

ALTER TABLE public.registrations 
ADD CONSTRAINT registrations_payment_status_check 
CHECK (payment_status IN (
    'pending',
    'completed',
    'verified',
    'failed',
    'rejected',
    'awaiting_payment_link',
    'payment_link_sent',
    'payment_received',
    'slot_expired'
));

-- Force a schema cache reload (usually happens automatically on DDL, but good to be sure)
NOTIFY pgrst, 'reload config';
