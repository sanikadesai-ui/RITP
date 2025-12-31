# Critical Bug Fixes & Deployment Guide

I have implemented fixes for the 3 critical bugs you reported.

## 1. Admin Proof Access (Bug 1)
**Issue:** Admins could not view payment proofs due to missing Storage RLS policies and incorrect path handling.
**Fix:**
- Created a new SQL migration file: `supabase/migrations/20251231_fix_storage_policies.sql`.
- Updated `src/pages/admin/FestApprovals.tsx` to correctly handle relative paths and sign URLs.

**Action Required:**
You must run the SQL migration to fix the storage permissions.
1. Go to your Supabase Dashboard -> SQL Editor.
2. Copy the contents of `supabase/migrations/20251231_fix_storage_policies.sql`.
3. Run the SQL query.

## 2. Email Reliability (Bug 2)
**Issue:** Emails were failing silently or not being retried.
**Fix:**
- Added a **"Resend Email"** button to the Admin Approval dashboard (`FestApprovals.tsx`).
- This allows admins to manually retry sending the "Fest Code" email if the initial attempt fails.
- Verified `supabase/functions/send-registration-email` logic.

**Action Required:**
- Ensure your Supabase Edge Function environment variables (`SMTP_EMAIL`, `SMTP_PASSWORD`) are set correctly in the Supabase Dashboard.
- If using Gmail, ensure you are using an **App Password**, not your login password.

## 3. Professional Success Page (Bug 3)
**Issue:** The success page was basic and uninformative.
**Fix:**
- Completely redesigned the "Success" state in `src/pages/FestRegistration.tsx`.
- Added a professional "Next Steps" timeline (Payment Verification -> Receive Code -> Register Events).
- Fixed a critical syntax error in the file that was causing the build to fail.

## 4. Registration Button Control (New Feature)
**Issue:** User wanted to remove the dropdown menu from the "Register Now" button and control which registration page opens.
**Fix:**
- Removed the dropdown from `GlobalRegisterButton.tsx`.
- Added a new setting in **Admin -> Settings -> Fest Registration Control**.
- You can now select **"Global Register Button Action"** to switch between "Fest Registration" and "Event Registration".
- Created migration `supabase/migrations/20251231_add_global_button_action.sql`.

## 5. Fix "Registration Type" Error (Critical)
**Issue:** Submitting the form fails with `null value in column "registration_type"`.
**Fix:**
- Updated the `register_fest_user` database function to explicitly set `registration_type = 'solo'`.
- Created migration `supabase/migrations/20251231_fix_registration_type_error.sql`.

## ACTION REQUIRED: Apply Database Changes

You must run the SQL migrations to apply the fixes and new features.

1.  **Go to Supabase Dashboard -> SQL Editor.**
2.  **Run Migration 1 (Storage Fix):**
    Copy content from `supabase/migrations/20251231_fix_storage_policies.sql` and run it.
3.  **Run Migration 2 (New Setting):**
    Copy content from `supabase/migrations/20251231_add_global_button_action.sql` and run it.
4.  **Run Migration 3 (Fix Registration Error):**
    Copy content from `supabase/migrations/20251231_fix_registration_type_error.sql` and run it.

## Verification Steps
1.  **Run the App:** `npm run dev`
2.  **Check Settings:** Go to Admin -> Settings. You should see the new "Global Register Button Action" dropdown.
3.  **Test Toggle:** Change the setting to "Event Registration" and save.
4.  **Check Button:** Go to the home page. The "Register Now" button should now say "Event Registration" and link to `/register`.
5.  **Test Fest Reg:** Change setting back to "Fest Registration". Button should link to `/fest-registration`.
6.  **Submit Form:** Try submitting the Fest Registration form again. It should now succeed.
