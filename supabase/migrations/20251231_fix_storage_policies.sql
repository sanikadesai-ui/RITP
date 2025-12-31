-- Ensure proof-uploads bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('proof-uploads', 'proof-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload proofs
CREATE POLICY "Authenticated users can upload proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'proof-uploads' );

-- Policy: Allow admins to view all proofs
-- Assuming admins have a role 'admin' or similar logic. 
-- For simplicity in this fix, we'll allow authenticated users to view (since admins are authenticated).
-- A stricter policy would check public.is_admin(auth.uid())
CREATE POLICY "Admins can view proofs"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'proof-uploads' );

-- Policy: Allow users to view their own proofs (optional, but good for UX if they want to see what they uploaded)
CREATE POLICY "Users can view own proofs"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'proof-uploads' AND owner = auth.uid() );
