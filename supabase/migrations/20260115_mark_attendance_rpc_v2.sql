-- ==========================================================
-- KAIZEN 2026 - Secure Attendance Marking v2
-- ==========================================================
-- Update: Now returns attendee email and name for certificate
-- generation.
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
    v_attendee_email TEXT;
    v_attendee_name TEXT;
    v_event_name TEXT;
BEGIN
    -- 1. Validate Registration and Get Details
    SELECT p.email, p.full_name, e.name
    INTO v_attendee_email, v_attendee_name, v_event_name
    FROM registrations r
    JOIN profiles p ON r.profile_id = p.id
    JOIN events e ON r.event_id = e.id
    WHERE r.id = p_registration_id;

    IF v_attendee_email IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Registration not found');
    END IF;

    -- 2. Check for Duplicate Attendance
    SELECT id INTO v_existing_id
    FROM attendance
    WHERE registration_id = p_registration_id AND event_id = p_event_id;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Already checked in!', 
            'already_marked', true,
            'attendee_email', v_attendee_email,
            'attendee_name', v_attendee_name
        );
    END IF;

    -- 3. Mark Attendance
    INSERT INTO attendance (registration_id, event_id, marked_by, marked_at)
    VALUES (p_registration_id, p_event_id, p_coordinator_id, NOW());

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Attendance marked successfully',
        'attendee_email', v_attendee_email,
        'attendee_name', v_attendee_name,
        'event_name', v_event_name
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Database Error: ' || SQLERRM);
END;
$$;

-- Grant access to all (since coordinator auth is custom)
GRANT EXECUTE ON FUNCTION mark_event_attendance(UUID, UUID, UUID) TO anon, authenticated, service_role;
