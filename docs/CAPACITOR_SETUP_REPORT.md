# Capacitor Setup Report

## Overview
Successfully converted the React + Vite web application into a Capacitor Android app tailored for the **Coordinator** role.

## 1. Project Setup
- **Dependencies Installed:**
  - `@capacitor/core`
  - `@capacitor/cli`
  - `@capacitor/android`
- **Initialization:**
  - App Name: `Kaizen Coordinator`
  - Package ID: `com.kaizen.coordinator`
  - Web Dir: `dist`

## 2. Coordinator-Only Logic
- **Route Guard Implemented:** `src/components/CapacitorGuard.tsx`
- **Behavior:**
  - Detects if the app is running in a native environment (Android/iOS).
  - **Redirects Root (`/`)**: Automatically redirects to `/coordinator/login`.
  - **Blocks Admin (`/admin/*`)**: Redirects any attempt to access admin routes back to coordinator login.
- **Integration:** Wrapped the main `Routes` in `App.tsx` with `CapacitorGuard`.

## 3. Configuration
- **`capacitor.config.ts`**:
  - Set `webDir: 'dist'`.
  - Added `server: { androidScheme: 'https' }` to ensure proper routing and asset loading on Android.

## 4. Android Permissions
- Added `android.permission.CAMERA` to `android/app/src/main/AndroidManifest.xml` to support the Coordinator Scanner feature.

## 5. Build Fixes
During the conversion, several build errors in the existing React code were identified and fixed:
- **`src/pages/Events.tsx`**: Fixed malformed JSX tags (mismatched `AlertDialog` components).
- **`src/pages/admin/Settings.tsx`**: Fixed syntax errors (stray text and unclosed tags) that were preventing the build.

## How to Run
1. **Build the Web Assets:**
   ```bash
   npm run build
   ```
2. **Sync with Android:**
   ```bash
   npx cap sync
   ```
3. **Run on Android Device/Emulator:**
   ```bash
   npx cap run android
   ```
   *Note: You need Android Studio installed and a device connected (or emulator running).*

## Troubleshooting
- **"Web Asset Error"**: If you see a white screen or 404, ensure `npm run build` was successful and `npx cap sync` was run afterwards.
- **Routing Issues**: If deep links don't work, ensure `capacitor.config.ts` has `androidScheme: 'https'`.
- **Permissions**: If the scanner doesn't work, check if the Camera permission prompt appears. If not, verify `AndroidManifest.xml`.
