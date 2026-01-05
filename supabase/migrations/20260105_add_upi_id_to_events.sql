-- Add upi_id column to events table for storing UPI payment ID
-- This allows auto-generation of UPI QR codes based on UPI ID and event fee

ALTER TABLE events ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN events.upi_id IS 'UPI ID for payment collection (e.g., yourname@upi). Used to auto-generate UPI QR codes.';

-- Update existing paid events to have null upi_id (they will use uploaded QR codes)
-- New events can use either UPI ID (auto-generated QR) or uploaded QR code
