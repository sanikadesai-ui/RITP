-- Add global_button_action to fest_settings to control which registration is active
ALTER TABLE fest_settings 
ADD COLUMN IF NOT EXISTS global_button_action text DEFAULT 'fest_registration';

-- Add comment to explain values
COMMENT ON COLUMN fest_settings.global_button_action IS 'Determines which registration button is shown: "fest_registration" or "event_registration"';
