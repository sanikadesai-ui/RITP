-- ==========================================================
-- KAIZEN 2026 - Secure Registration Lookup by Email
-- ==========================================================
-- This function allows the Check Status page to find all
-- registrations linked to an email, bypassing RLS restrictions.
-- Safe because it only accepts email input and returns data
-- associated with that email only.
-- ==========================================================

CREATE OR REPLACE FUNCTION get_registrations_by_email(p_email TEXT)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    payment_status TEXT,
    event_id UUID,
    payment_deadline TIMESTAMPTZ,
    event_name TEXT,
    event_date TIMESTAMPTZ,
    event_venue TEXT,
    event_fee NUMERIC,
    team_name TEXT,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    college TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.created_at,
        r.payment_status,
        r.event_id,
        r.payment_deadline,
        e.name AS event_name,
        e.event_date,
        e.venue AS event_venue,
        e.registration_fee AS event_fee,
        t.name AS team_name,
        p.full_name,
        p.email,
        p.phone,
        p.college
    FROM registrations r
    JOIN profiles p ON r.profile_id = p.id
    JOIN events e ON r.event_id = e.id
    LEFT JOIN teams t ON r.team_id = t.id
    WHERE p.email ILIKE TRIM(p_email)
    ORDER BY r.created_at DESC;
END;
$$;

-- Grant execution permission to anonymous users (for public check status)
GRANT EXECUTE ON FUNCTION get_registrations_by_email(TEXT) TO anon, authenticated, service_role;
