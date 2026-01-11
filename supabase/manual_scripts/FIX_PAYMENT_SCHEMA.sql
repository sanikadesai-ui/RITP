-- FIX_PAYMENT_SCHEMA.sql
-- Run this in Supabase SQL Editor to fix the "Could not find column" error

-- 1. Add missing columns to registrations table
ALTER TABLE public.registrations 
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_link_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS slot_expired BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_reminder_sent BOOLEAN DEFAULT FALSE;

-- 2. Update the status constraint to allow new statuses
ALTER TABLE public.registrations 
DROP CONSTRAINT IF EXISTS registrations_payment_status_check;

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

-- 3. Refresh schema cache
NOTIFY pgrst, 'reload config';
