# KAIZEN 2026 - Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Deploy to Vercel (Recommended)

#### Option A: Using Vercel CLI
```bash
# Install Vercel CLI if not installed
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project root
cd /workspaces/KAIZEN-RITP
vercel --prod
```

#### Option B: Using GitHub Integration
1. Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Add Get Pass coordinator feature"
   git push origin main
   ```
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Vercel will auto-detect Vite and deploy

### 2. Deploy to Netlify (Alternative)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

---

## 📊 Database Setup (Supabase)

### Run the SQL Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy the contents of `supabase/FEST_PASS_SETUP.sql`
5. Paste and click **Run**

Or run this command if you have Supabase CLI:
```bash
supabase db push
```

---

## 📧 Deploy Edge Functions (Email)

### Deploy Email Function to Supabase

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (get project ref from dashboard URL)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the email function
supabase functions deploy send-registration-email
```

### Set Environment Variables for Email
In Supabase Dashboard → Edge Functions → send-registration-email → Settings:

```
SMTP_EMAIL=kaizentechfest@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## 🎫 How to Create Get Pass Coordinator

### Steps for Admin:
1. Login to Admin Dashboard at `/admin`
2. Go to **Coordinators** page
3. Click **"Create for Get Pass"** (purple button)
4. Fill in coordinator details:
   - Name
   - Email
   - Phone (optional)
   - Password (use "Generate" for secure password)
5. The **Global Coordinator** option is pre-selected
6. Click **Create Coordinator**
7. Share login credentials with the coordinator

### Coordinator Login:
- URL: `https://kaizen-ritp.in/coordinator/login`
- Use email and password to login
- Switch to **"Fest Entry"** mode to scan Fest Passes

---

## 📱 How Users Get Their Fest Pass

### After Registration:
1. User receives **"Registration Received"** email
2. Email contains instructions to check status

### After Payment Approval:
1. User receives **"Payment Verified"** email with Fest Code
2. Instructions in email:
   - Visit [www.kaizen-ritp.in](https://www.kaizen-ritp.in)
   - Click **"Check Status"** in menu
   - Enter email and click Search
   - Click **"GET YOUR FEST PASS"** button
   - Download pass with QR code

---

## 🔧 Environment Variables

Create a `.env` file or set in your deployment platform:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: Analytics
VITE_GA_ID=G-XXXXXXXXXX
```

---

## ✅ Deployment Checklist

- [ ] Push code to GitHub
- [ ] Run SQL migration in Supabase
- [ ] Deploy Edge Functions
- [ ] Set environment variables
- [ ] Deploy to Vercel/Netlify
- [ ] Test coordinator login
- [ ] Test Get Pass flow
- [ ] Test email sending

---

## 🧪 Testing After Deployment

### Test Coordinator Flow:
1. Create a Get Pass coordinator from admin panel
2. Login at `/coordinator/login`
3. Switch to "Fest Entry" mode
4. Test camera starts correctly
5. Test scanning a fest pass QR

### Test User Flow:
1. Register at `/get-pass` or `/register`
2. Check email for confirmation
3. After admin approves, check email for Fest Code
4. Go to Check Status page
5. Download Fest Pass with QR

---

## 📞 Troubleshooting

### Camera not starting?
- Ensure HTTPS is enabled
- Check browser camera permissions
- Try refreshing the page

### Email not sending?
- Verify SMTP credentials in Edge Function settings
- Check Supabase Edge Function logs

### Database errors?
- Re-run the SQL migration
- Check RLS policies are correctly applied

---

## 🔗 Important URLs

- **Main Site**: https://kaizen-ritp.in
- **Admin Panel**: https://kaizen-ritp.in/admin
- **Coordinator Login**: https://kaizen-ritp.in/coordinator/login
- **Check Status**: https://kaizen-ritp.in/check-status
- **Supabase Dashboard**: https://supabase.com/dashboard
