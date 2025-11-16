# 🚀 Complete Setup Guide - Authentication & Quota System

This guide will walk you through setting up authentication and quota tracking for Learneazy.io, step by step.

---

## ✅ Step 1: Configure Google OAuth (5 minutes)

### A. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth Client ID**
5. Configure the OAuth consent screen if prompted:
   - User Type: **External**
   - App name: **Learneazy.io**
   - User support email: Your email
   - Developer contact: Your email
6. Application type: **Web application**
7. Name: **Learneazy Production**
8. Authorized redirect URIs - Add these two:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   http://localhost:3000
   ```
   (Replace YOUR_PROJECT_ID with your actual Supabase project ID from the next step)

9. Click **Create**
10. Copy the **Client ID** and **Client Secret** - you'll need these soon

---

## ✅ Step 2: Setup Supabase Project (10 minutes)

### A. Create/Access Your Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. You should already have a project (the one you're using for vector store)
3. Note your **Project ID** from the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID`

### B. Enable Google OAuth Provider

1. In your Supabase project, go to **Authentication** → **Providers**
2. Find **Google** in the list
3. Click to expand it
4. Toggle **Enable Sign in with Google** to ON
5. Paste your Google OAuth credentials:
   - **Client ID**: (from Step 1)
   - **Client Secret**: (from Step 1)
6. Click **Save**

### C. Configure Site URL

1. Still in **Authentication** → **URL Configuration**
2. Set **Site URL** to: `http://localhost:3000` (for development)
3. Add **Redirect URLs**:
   ```
   http://localhost:3000
   http://localhost:3000/**
   ```
4. Click **Save**

---

## ✅ Step 3: Create Database Tables (2 minutes)

### Run SQL Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `/backend/supabase-schema.sql`
4. Paste into the SQL editor
5. Click **Run** (or press Ctrl/Cmd + Enter)
6. You should see: "Success. No rows returned"

### Verify Table Creation

1. Go to **Table Editor**
2. You should see a new table called **users**
3. Click on it to verify the columns:
   - id (uuid)
   - google_id (text)
   - email (text)
   - name (text)
   - photo_url (text)
   - queries_used (int4) - default 0
   - pdfs_uploaded (int4) - default 0
   - has_own_keys (bool) - default false
   - created_at (timestamptz)
   - updated_at (timestamptz)

---

## ✅ Step 4: Get Supabase API Keys (2 minutes)

1. In Supabase Dashboard, go to **Settings** → **API**
2. You'll see three keys - copy these:

### Keys You Need:

**a) Project URL:**
```
https://YOUR_PROJECT_ID.supabase.co
```
Copy this entire URL

**b) anon public key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
```
This is labeled "anon" or "anon public" - it's safe to expose in frontend

**c) service_role secret key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
```
This is labeled "service_role" - **keep this secret!** Only use in backend

---

## ✅ Step 5: Configure Environment Variables

### A. Backend Environment Variables

1. Go to `/home/user/Learneazy.io/backend/`
2. Open `.env` file (or create if it doesn't exist)
3. Ensure you have these variables (keep existing ones):

```bash
# Google Gemini API (your server key for free tier users)
GOOGLE_API_KEY=AIza...your_key_here

# Cohere API (your server key for free tier users)
COHERE_API_KEY=your_cohere_key_here

# Supabase Configuration (same values for both vector store and auth)
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...your_service_role_key_here
```

**Important:**
- The `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are already in your `.env` for the vector store
- You don't need to change them - we're reusing the same Supabase project!
- Just make sure they're set correctly

### B. Frontend Environment Variables

1. Go to `/home/user/Learneazy.io/frontend/`
2. Create a new file called `.env.local`
3. Add these variables:

```bash
# Supabase Configuration (for authentication)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your_anon_public_key_here

# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

**Important:**
- Use the **anon public** key (not service_role!) for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- All variables must start with `NEXT_PUBLIC_` to be accessible in the browser
- Same `SUPABASE_URL` as backend but with the **anon** key instead of service_role

---

## ✅ Step 6: Update Google OAuth Redirect URI

Now that you know your Supabase URL, update Google OAuth:

1. Go back to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, make sure you have:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
   (Replace YOUR_PROJECT_ID with your actual ID from the Supabase URL)
4. Click **Save**

---

## ✅ Step 7: Test the Setup (3 minutes)

### Start All Services

```bash
# Terminal 1: Start Python PDF Processor
cd /home/user/Learneazy.io/backend
python pdf_processor_service.py

# Terminal 2: Start Backend
cd /home/user/Learneazy.io/backend
npm start

# Terminal 3: Start Frontend
cd /home/user/Learneazy.io/frontend
npm run dev
```

### Test Authentication Flow

1. Open browser to `http://localhost:3000`
2. You should see: **"Welcome to Learneazy.io"**
3. Click **"Sign In with Google"**
4. Google OAuth popup should appear
5. Select your Google account
6. You should be redirected back to the app
7. Header should show:
   - Your profile photo
   - "Settings" button
   - "Sign Out" button

### Verify Database

1. Go to Supabase **Table Editor** → **users**
2. You should see your user row created automatically with:
   - Your email
   - Your name
   - Your photo URL
   - `queries_used: 0`
   - `pdfs_uploaded: 0`

---

## ✅ Step 8: Test Quota System (5 minutes)

### Test Free Tier Limits

1. **Upload a PDF** (uses 1 of 1 PDF quota)
2. **Ask 5 questions** (uses 5 of 5 query quota)
3. On the 6th question, you should see:
   - ❌ **Quota Exceeded Modal** appears
   - Shows: "You've used 5/5 free queries"
   - Button: "Add Your API Keys"

### Test API Keys

1. Click **"Add Your API Keys"** button
2. API Keys Modal should open
3. Enter your Gemini API key (starts with `AIza`)
4. Enter your Cohere API key
5. Click **"Save Keys"**
6. Try asking another question
7. Should work! (unlimited usage now)

### Verify Keys Storage

1. Open browser DevTools (F12)
2. Go to **Application** → **Local Storage** → `http://localhost:3000`
3. You should see:
   - `userGoogleKey`: AIza...
   - `userCohereKey`: your_key...

---

## 🎯 Quick Troubleshooting

### Issue: "Authentication required" error

**Solution:**
- Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `/frontend/.env.local`
- Restart frontend: `npm run dev`
- Clear browser cache and try again

### Issue: Google Sign-In popup doesn't appear

**Solution:**
- Check that redirect URIs match exactly in Google Cloud Console
- Make sure Google OAuth is enabled in Supabase
- Check browser console for errors

### Issue: User not created in database

**Solution:**
- Check Supabase Table Editor → **users** table exists
- Run the SQL schema again if needed
- Check backend console for errors

### Issue: Quota not tracking

**Solution:**
- Check backend console for `x-user-id` header in requests
- Verify `users` table has `queries_used` and `pdfs_uploaded` columns
- Check browser Network tab to see if headers are being sent

### Issue: API keys not working

**Solution:**
- Validate Gemini key starts with `AIza`
- Check browser console for key validation errors
- Make sure keys are saved in localStorage (check DevTools)

---

## 📊 Environment Variables Summary

### Backend `.env`:
```bash
GOOGLE_API_KEY=AIza...
COHERE_API_KEY=...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc... (service_role key)
```

### Frontend `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (anon public key)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

---

## ✅ What You've Accomplished

- ✅ Google OAuth configured
- ✅ Supabase authentication enabled
- ✅ Users table created with quota tracking
- ✅ Frontend integrated with auth
- ✅ Backend quota middleware active
- ✅ Client-side API key storage working
- ✅ Free tier: 5 queries + 1 PDF upload
- ✅ Unlimited tier: User's own API keys

---

## 🚀 Next Steps

1. **Test thoroughly** with both free tier and own API keys
2. **Update for production** when deploying:
   - Change `NEXT_PUBLIC_BACKEND_URL` to your production backend URL
   - Update Supabase Site URL to production domain
   - Add production domain to Google OAuth redirect URIs
3. **Monitor usage** in Supabase Table Editor → **users** table

---

## 🆘 Need Help?

If you encounter issues:
1. Check browser console for errors
2. Check backend console logs
3. Verify all environment variables are set correctly
4. Make sure all 3 services are running (Python, Backend, Frontend)
5. Check Supabase Dashboard → Logs for auth errors

Good luck! 🎉
