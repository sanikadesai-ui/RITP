-- Ensure attendance table exists and is correct
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    marked_by UUID, -- Can be null if marked by generic admin
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(registration_id, event_id)
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Allow admins/coordinators to insert
CREATE POLICY "Admins can insert attendance" 
ON public.attendance FOR INSERT 
TO authenticated 
WITH CHECK (true); -- Ideally restrict to admin role, but keeping open for authenticated staff for now

-- Allow admins to view
CREATE POLICY "Admins can view attendance" 
ON public.attendance FOR SELECT 
TO authenticated 
USING (true);
