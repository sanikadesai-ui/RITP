# Build Instructions for Android

This project is configured to build a single Android app ("Kaizen Staff") that supports both **Admin** and **Coordinator** roles.

## 1. Prerequisites
- Node.js & npm
- Android Studio (latest version)
- Java JDK 17+

## 2. Build Steps

### Step 1: Build Web Assets
Compile the React application into the `dist` folder.
```bash
npm run build
```

### Step 2: Sync with Capacitor
Copy the web assets to the Android native project.
```bash
npx cap sync
```

### Step 3: Open in Android Studio
```bash
npx cap open android
```

### Step 4: Generate APK
1. In Android Studio, go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
2. The APK will be generated in `android/app/build/outputs/apk/debug/app-debug.apk`.
3. For a release build (signed), use **Build > Generate Signed Bundle / APK**.

## 3. App Behavior
- **Mobile Landing Page**: When the app opens, it detects it is running natively and redirects to a special landing page.
- **Role Selection**: The user can choose "Admin Portal" or "Coordinator Portal".
- **Permissions**: The app requests Camera permissions for the Coordinator QR scanner.

## 4. Troubleshooting
- **White Screen**: Ensure `npm run build` was run before syncing.
- **Routing Issues**: If the back button exits the app unexpectedly, check `CapacitorGuard.tsx`.
