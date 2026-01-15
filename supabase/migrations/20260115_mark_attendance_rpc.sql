-- ==========================================================
-- KAIZEN 2026 - Secure Attendance Marking
-- ==========================================================
-- Fixes RLS (Permission) issues for Coordinators when 
-- marking attendance. Uses SECURITY DEFINER to bypass RLS.
-- ==========================================================

CREATE OR REPLACE FUNCTION mark_event_attendance(
    p_registration_id UUID,
    p_event_id UUID,
    p_coordinator_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_id UUID;
    v_reg_exists BOOLEAN;
BEGIN
    -- 1. Validate Registration Exists
    IF NOT EXISTS (SELECT 1 FROM registrations WHERE id = p_registration_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Registration not found');
    END IF;

    -- 2. Check for Duplicate Attendance
    SELECT id INTO v_existing_id
    FROM attendance
    WHERE registration_id = p_registration_id AND event_id = p_event_id;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already checked in!', 'already_marked', true);
    END IF;

    -- 3. Mark Attendance
    INSERT INTO attendance (registration_id, event_id, marked_by, marked_at)
    VALUES (p_registration_id, p_event_id, p_coordinator_id, NOW());

    RETURN jsonb_build_object('success', true, 'message', 'Attendance marked successfully');

EXCEPTION
    WHEN foreign_key_violation THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Data: Foreign Key Violation');
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already checked in!', 'already_marked', true);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Database Error: ' || SQLERRM);
END;
$$;

-- Grant access to all (since coordinator auth is custom)
GRANT EXECUTE ON FUNCTION mark_event_attendance(UUID, UUID, UUID) TO anon, authenticated, service_role;
