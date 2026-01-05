-- Add upi_id column to events table for storing UPI ID
-- Run this in Supabase SQL Editor

-- Add upi_id column if it doesn't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- Add image_url column if it doesn't exist (for event poster)
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add registration_start_date and registration_end_date columns if they don't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_end_date TIMESTAMP WITH TIME ZONE;

-- Add prize_pool column if it doesn't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS prize_pool INTEGER DEFAULT 0;

-- Create storage bucket for events if not exists (run this separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('events', 'events', true) ON CONFLICT DO NOTHING;

-- Create policy to allow public read access to events bucket
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'events');

-- Create policy to allow authenticated users to upload to events bucket
-- CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'events' AND auth.role() = 'authenticated');

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;
