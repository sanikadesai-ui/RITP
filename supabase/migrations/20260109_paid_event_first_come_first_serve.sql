-- =====================================================
-- KAIZEN 2026 - Paid Event Registration Update
-- First Come First Serve Payment Flow
-- =====================================================
-- Run this migration to update the payment status options
-- and add support for "awaiting_payment_link" status
-- with payment deadline tracking
-- =====================================================

-- 1. Add payment deadline columns to registrations table
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS payment_link_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_reminder_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS slot_expired BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 2. Update the payment_status constraint to include new status
-- First, drop existing constraint if it exists
DO $$ 
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'registrations_payment_status_check' 
        AND table_name = 'registrations'
    ) THEN
        ALTER TABLE registrations DROP CONSTRAINT registrations_payment_status_check;
    END IF;
END $$;

-- 3. Add new constraint with additional status values
ALTER TABLE registrations 
ADD CONSTRAINT registrations_payment_status_check 
CHECK (payment_status IS NULL OR payment_status IN (
    'pending',           -- Payment proof uploaded, awaiting verification
    'completed',         -- Payment verified successfully
    'verified',          -- Alternative to completed
    'failed',            -- Payment verification failed
    'rejected',          -- Payment rejected by admin
    'awaiting_payment_link',  -- NEW: First come first serve - waiting for payment link
    'payment_link_sent',      -- NEW: Payment link has been sent to user
    'payment_received',       -- NEW: Payment received, pending confirmation
    'slot_expired'            -- NEW: Student didn't pay in time, slot given to next person
));

-- 4. Create index for faster queries on payment status
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status 
ON registrations(payment_status) 
WHERE payment_status IS NOT NULL;

-- 5. Create index for first come first serve ordering
CREATE INDEX IF NOT EXISTS idx_registrations_created_at 
ON registrations(created_at DESC);

-- 6. Create index for payment deadline tracking
CREATE INDEX IF NOT EXISTS idx_registrations_payment_deadline 
ON registrations(payment_deadline) 
WHERE payment_deadline IS NOT NULL AND payment_status = 'payment_link_sent';

-- 7. Add comment to document the payment flow
COMMENT ON COLUMN registrations.payment_status IS 
'Payment status for paid events:
- NULL: Free event (no payment needed)
- pending: Payment proof uploaded, awaiting verification
- completed/verified: Payment verified successfully
- failed/rejected: Payment verification failed
- awaiting_payment_link: First come first serve - user registered, waiting for payment link
- payment_link_sent: Payment link has been sent to user (has deadline)
- payment_received: Payment received, pending final confirmation
- slot_expired: Student did not pay in time, slot given to next person';

COMMENT ON COLUMN registrations.payment_deadline IS 
'Deadline for payment after payment link is sent. Usually 24-48 hours. If not paid by deadline, slot_expired becomes true and slot goes to next in queue.';

-- =====================================================
-- VIEW: Pending Paid Event Registrations (Admin Use)
-- Shows all registrations awaiting payment link
-- Ordered by registration time (first come first serve)
-- =====================================================
-- Drop existing view first to allow column changes
DROP VIEW IF EXISTS vw_pending_paid_registrations CASCADE;

CREATE VIEW vw_pending_paid_registrations AS
SELECT 
    r.id AS registration_id,
    r.created_at AS registered_at,
    r.payment_status,
    r.payment_link_sent_at,
    r.payment_deadline,
    r.slot_expired,
    CASE 
        WHEN r.payment_deadline IS NOT NULL AND r.payment_deadline < NOW() AND r.payment_status = 'payment_link_sent'
        THEN TRUE 
        ELSE FALSE 
    END AS is_overdue,
    CASE 
        WHEN r.payment_deadline IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (r.payment_deadline - NOW()))/3600 
        ELSE NULL 
    END AS hours_remaining,
    e.id AS event_id,
    e.name AS event_name,
    e.registration_fee,
    p.full_name,
    p.email,
    p.phone,
    p.college,
    t.name AS team_name,
    ROW_NUMBER() OVER (PARTITION BY e.id ORDER BY r.created_at ASC) AS queue_position
FROM registrations r
JOIN events e ON r.event_id = e.id
JOIN profiles p ON r.profile_id = p.id
LEFT JOIN teams t ON r.team_id = t.id
WHERE e.registration_fee > 0
  AND r.payment_status IN ('awaiting_payment_link', 'payment_link_sent')
  AND (r.slot_expired IS NULL OR r.slot_expired = FALSE)
ORDER BY e.name, r.created_at ASC;

-- Grant access to the view
GRANT SELECT ON vw_pending_paid_registrations TO authenticated;

-- =====================================================
-- FUNCTION: Update payment status with validation
-- =====================================================
CREATE OR REPLACE FUNCTION update_registration_payment_status(
    p_registration_id UUID,
    p_new_status TEXT,
    p_admin_note TEXT DEFAULT NULL,
    p_deadline_hours INTEGER DEFAULT 48
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_status TEXT;
    v_event_name TEXT;
    v_user_email TEXT;
    v_user_name TEXT;
    v_deadline TIMESTAMPTZ;
BEGIN
    -- Get current status and user info
    SELECT 
        r.payment_status,
        e.name,
        p.email,
        p.full_name
    INTO v_old_status, v_event_name, v_user_email, v_user_name
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    JOIN profiles p ON r.profile_id = p.id
    WHERE r.id = p_registration_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Registration not found');
    END IF;
    
    -- Validate status transition
    IF p_new_status NOT IN ('pending', 'completed', 'verified', 'failed', 'rejected', 
                            'awaiting_payment_link', 'payment_link_sent', 'payment_received', 'slot_expired') THEN
        RETURN json_build_object('success', false, 'message', 'Invalid payment status');
    END IF;
    
    -- Calculate deadline if sending payment link
    IF p_new_status = 'payment_link_sent' THEN
        v_deadline := NOW() + (p_deadline_hours || ' hours')::INTERVAL;
    END IF;
    
    -- Update the status
    UPDATE registrations 
    SET 
        payment_status = p_new_status,
        payment_link_sent_at = CASE WHEN p_new_status = 'payment_link_sent' THEN NOW() ELSE payment_link_sent_at END,
        payment_deadline = CASE WHEN p_new_status = 'payment_link_sent' THEN v_deadline ELSE payment_deadline END,
        slot_expired = CASE WHEN p_new_status = 'slot_expired' THEN TRUE ELSE slot_expired END,
        admin_notes = COALESCE(p_admin_note, admin_notes),
        updated_at = NOW()
    WHERE id = p_registration_id;
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Payment status updated successfully',
        'old_status', v_old_status,
        'new_status', p_new_status,
        'event_name', v_event_name,
        'user_email', v_user_email,
        'user_name', v_user_name,
        'payment_deadline', v_deadline
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_registration_payment_status TO authenticated;

-- =====================================================
-- FUNCTION: Expire overdue payment slots
-- Run this periodically to auto-expire slots
-- =====================================================
CREATE OR REPLACE FUNCTION expire_overdue_payment_slots()
RETURNS TABLE (
    registration_id UUID,
    event_name TEXT,
    user_email TEXT,
    user_name TEXT,
    expired_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH expired AS (
        UPDATE registrations r
        SET 
            payment_status = 'slot_expired',
            slot_expired = TRUE,
            updated_at = NOW()
        FROM events e, profiles p
        WHERE r.event_id = e.id
          AND r.profile_id = p.id
          AND r.payment_status = 'payment_link_sent'
          AND r.payment_deadline < NOW()
          AND (r.slot_expired IS NULL OR r.slot_expired = FALSE)
        RETURNING r.id, e.name, p.email, p.full_name, NOW() AS expired_at
    )
    SELECT 
        expired.id AS registration_id,
        expired.name AS event_name,
        expired.email AS user_email,
        expired.full_name AS user_name,
        expired.expired_at
    FROM expired;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION expire_overdue_payment_slots TO authenticated;

-- =====================================================
-- FUNCTION: Get registration queue for paid event
-- Returns the queue position for first come first serve
-- =====================================================
CREATE OR REPLACE FUNCTION get_event_registration_queue(p_event_id UUID)
RETURNS TABLE (
    registration_id UUID,
    queue_position BIGINT,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    team_name TEXT,
    registered_at TIMESTAMPTZ,
    payment_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id AS registration_id,
        ROW_NUMBER() OVER (ORDER BY r.created_at ASC) AS queue_position,
        p.full_name,
        p.email,
        p.phone,
        t.name AS team_name,
        r.created_at AS registered_at,
        r.payment_status
    FROM registrations r
    JOIN profiles p ON r.profile_id = p.id
    LEFT JOIN teams t ON r.team_id = t.id
    WHERE r.event_id = p_event_id
      AND r.payment_status IN ('awaiting_payment_link', 'payment_link_sent', 'payment_received', 'completed', 'verified')
    ORDER BY r.created_at ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_event_registration_queue TO authenticated;

-- =====================================================
-- Sample queries for admin panel
-- =====================================================

-- Query 1: Get all registrations awaiting payment link for a specific event
-- SELECT * FROM vw_pending_paid_registrations WHERE event_name = 'Your Event Name';

-- Query 2: Get queue position for all paid events
-- SELECT * FROM vw_pending_paid_registrations ORDER BY event_name, queue_position;

-- Query 3: Update payment status when sending payment link
-- SELECT update_registration_payment_status('registration-uuid-here', 'payment_link_sent');

-- Query 4: Mark payment as received
-- SELECT update_registration_payment_status('registration-uuid-here', 'payment_received');

-- Query 5: Mark payment as completed/verified
-- SELECT update_registration_payment_status('registration-uuid-here', 'completed');

-- Query 6: Get full queue for an event
-- SELECT * FROM get_event_registration_queue('event-uuid-here');

-- =====================================================
-- Statistics query for dashboard
-- =====================================================
-- Drop existing view first to allow column changes
DROP VIEW IF EXISTS vw_paid_event_stats CASCADE;

CREATE VIEW vw_paid_event_stats AS
SELECT 
    e.id AS event_id,
    e.name AS event_name,
    e.registration_fee,
    e.max_participants,
    COUNT(*) FILTER (WHERE r.payment_status = 'awaiting_payment_link') AS awaiting_link_count,
    COUNT(*) FILTER (WHERE r.payment_status = 'payment_link_sent') AS link_sent_count,
    COUNT(*) FILTER (WHERE r.payment_status = 'payment_link_sent' AND r.payment_deadline < NOW()) AS overdue_count,
    COUNT(*) FILTER (WHERE r.payment_status = 'slot_expired') AS expired_count,
    COUNT(*) FILTER (WHERE r.payment_status IN ('completed', 'verified')) AS confirmed_count,
    COUNT(*) FILTER (WHERE r.payment_status NOT IN ('slot_expired', 'failed', 'rejected') OR r.payment_status IS NULL) AS active_registrations,
    COUNT(*) AS total_registrations
FROM events e
LEFT JOIN registrations r ON e.id = r.event_id
WHERE e.registration_fee > 0
GROUP BY e.id, e.name, e.registration_fee, e.max_participants;

GRANT SELECT ON vw_paid_event_stats TO authenticated;

-- =====================================================
-- VIEW: Expired slots (for giving to next person)
-- =====================================================
-- Drop existing view first to allow column changes
DROP VIEW IF EXISTS vw_expired_slots CASCADE;

CREATE VIEW vw_expired_slots AS
SELECT 
    r.id AS registration_id,
    r.created_at AS registered_at,
    r.payment_link_sent_at,
    r.payment_deadline,
    e.id AS event_id,
    e.name AS event_name,
    e.registration_fee,
    p.full_name,
    p.email,
    p.phone,
    t.name AS team_name
FROM registrations r
JOIN events e ON r.event_id = e.id
JOIN profiles p ON r.profile_id = p.id
LEFT JOIN teams t ON r.team_id = t.id
WHERE e.registration_fee > 0
  AND (r.payment_status = 'slot_expired' OR r.slot_expired = TRUE)
ORDER BY e.name, r.payment_deadline DESC;

GRANT SELECT ON vw_expired_slots TO authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
