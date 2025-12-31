# Bug Report: Fest Registration System

## Bug 1: Admin cannot view uploaded proof

**Category:** Storage / Frontend

**Description:**
Admins are unable to view or download payment proofs uploaded by students. The `ProofViewer` component attempts to generate a signed URL, but it may fail if the path is incorrect or if the storage bucket permissions are not set up correctly for the admin role.

**Root Cause:**
1.  **Path Mismatch:** The path stored in the database might contain the bucket name or be a full URL, while `createSignedUrl` expects a relative path within the bucket.
2.  **Storage Policies:** The `proof-uploads` bucket might lack the necessary RLS policies to allow authenticated admins to `select` (read) files.
3.  **Frontend Logic:** The `ProofViewer` component handles `http` links but might not handle all path variations correctly.

**Fix Plan:**
1.  Update `ProofViewer` to handle different path formats (full URL vs relative path).
2.  Ensure the `proof-uploads` bucket exists and has correct policies (via SQL migration).
3.  Add error handling to the signed URL generation.

## Bug 2: Payment verification email not sending

**Category:** Backend / Edge Function

**Description:**
When an admin approves a payment, the system updates the database but fails to send the confirmation email reliably.

**Root Cause:**
1.  **Edge Function Invocation:** The client-side code invokes `send-registration-email`. If this function fails (e.g., timeout, configuration error), the user sees a warning, but the DB is already updated.
2.  **SMTP Configuration:** The Edge Function relies on environment variables (`SMTP_EMAIL`, `SMTP_PASSWORD`). If these are missing or incorrect in the Supabase project, sending fails.
3.  **Error Handling:** The current implementation catches the email error but doesn't revert the DB change, leading to a state where the user is "approved" but hasn't received their code.

**Fix Plan:**
1.  Add robust error handling in the Edge Function.
2.  Ensure environment variables are set (I cannot set them on the real server, but I will add code to log/handle missing vars gracefully).
3.  Improve the frontend `handleApprove` function to alert the admin more clearly if email fails, and potentially allow "Resend Email".

## Bug 3: Success submission page not professional / missing flow

**Category:** Frontend / UI

**Description:**
The success page after registration is basic and doesn't clearly communicate the "Pending Verification" status or the next steps.

**Root Cause:**
1.  **UI Design:** The current design is functional but lacks the "wow" factor and clear timeline of what happens next.
2.  **User Feedback:** Users might be confused about whether they are fully registered or just submitted a request.

**Fix Plan:**
1.  Enhance `FestRegistration.tsx` with a professional success view.
2.  Add a timeline/step-by-step guide (already partially implemented in previous turn, will refine).
3.  Ensure the status is clearly "Pending Verification".

---

## Fix Implementation Plan

1.  **Database/Storage:** Create a migration to ensure `proof-uploads` bucket exists and has correct policies.
2.  **Frontend (Admin):** Fix `ProofViewer` in `FestApprovals.tsx`.
3.  **Frontend (User):** Polish `FestRegistration.tsx` success view.
4.  **Backend:** Review `send-registration-email` function (I can't deploy it, but I can fix the code).

