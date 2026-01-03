-- Add is_global column to coordinators table
-- Global coordinators can scan fest passes for entry and track attendance for all events

ALTER TABLE public.coordinators
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.coordinators.is_global IS 'Global coordinators can scan fest passes for fest entry and attendance tracking';

-- Create fest_attendance table for tracking fest entry (not event-specific)
CREATE TABLE IF NOT EXISTS public.fest_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fest_registration_id UUID REFERENCES public.fest_registrations(id) ON DELETE CASCADE,
    fest_code TEXT NOT NULL,
    attendee_name TEXT NOT NULL,
    attendee_email TEXT,
    marked_by UUID REFERENCES public.coordinators(id),
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    entry_type TEXT DEFAULT 'main_gate' CHECK (entry_type IN ('main_gate', 'event', 're_entry')),
    notes TEXT,
    UNIQUE(fest_registration_id, DATE(marked_at))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fest_attendance_fest_reg_id ON public.fest_attendance(fest_registration_id);
CREATE INDEX IF NOT EXISTS idx_fest_attendance_marked_at ON public.fest_attendance(marked_at);
CREATE INDEX IF NOT EXISTS idx_fest_attendance_marked_by ON public.fest_attendance(marked_by);
CREATE INDEX IF NOT EXISTS idx_fest_attendance_fest_code ON public.fest_attendance(fest_code);

-- Enable RLS
ALTER TABLE public.fest_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fest_attendance
CREATE POLICY "Admins can manage fest attendance" ON public.fest_attendance
    FOR ALL
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Coordinators can mark fest attendance" ON public.fest_attendance
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.coordinators 
            WHERE id = marked_by 
            AND is_active = true
            AND is_global = true
        )
    );

CREATE POLICY "Coordinators can view fest attendance" ON public.fest_attendance
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.coordinators 
            WHERE is_active = true
        )
    );

-- Grant permissions
GRANT ALL ON public.fest_attendance TO authenticated;
GRANT SELECT ON public.fest_attendance TO anon;

-- Update RLS for attendance to allow global coordinators to mark for any event
DROP POLICY IF EXISTS "Coordinators can mark attendance" ON public.attendance;
CREATE POLICY "Coordinators can mark attendance" ON public.attendance
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.coordinators 
            WHERE id = marked_by 
            AND is_active = true
            AND (
                is_global = true 
                OR event_id = ANY(assigned_events)
                OR assigned_events = '{}'
            )
        )
    );
