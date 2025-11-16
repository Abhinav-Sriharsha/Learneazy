# Deployment Guide - Railway

This guide will help you deploy Learneazy.io on Railway with all 3 services.

## Architecture Overview

Your app consists of 3 services:
1. **Frontend** - Next.js (port 3000)
2. **Backend** - Express.js (port 3001)
3. **PDF Processor** - Flask (port 5000)

Plus **Supabase** (already hosted externally for database + auth)

---

## Pre-Deployment Checklist

### 1. Supabase Setup
- ✅ Create Supabase project at https://supabase.com
- ✅ Run `backend/supabase-schema.sql` in SQL Editor
- ✅ Enable Google OAuth in Authentication → Providers
- ✅ Add Railway domain to "Redirect URLs" (you'll do this after deployment)

### 2. Get API Keys
- ✅ Google Gemini API: https://makersuite.google.com/app/apikey
- ✅ Cohere API: https://dashboard.cohere.com/api-keys

---

## Railway Deployment Steps

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Connect your repository: `Abhinav-Sriharsha/Learneazy.io`

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `Learneazy.io` repository
4. Railway will detect your services automatically

### Step 3: Deploy Backend Service (Express)

1. **Create Service**: Click "Add Service" → "GitHub Repo"
2. **Root Directory**: Set to `backend`
3. **Build Command**: Leave empty (Railway auto-detects)
4. **Start Command**: `node server.js`

**Environment Variables** (Settings → Variables):
```bash
GOOGLE_API_KEY=AIza...your_gemini_key
COHERE_API_KEY=your_cohere_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...your_service_key
ADMIN_EMAIL=your-admin-email@gmail.com
PORT=3001
```

4. **Generate Domain**: Settings → Networking → Generate Domain
5. **Note the URL**: You'll need this for frontend (e.g., `https://backend-production-xxxx.up.railway.app`)

### Step 4: Deploy PDF Processor (Flask)

1. **Create Another Service**: "Add Service" → "GitHub Repo"
2. **Root Directory**: Set to `backend` (Flask is in same folder)
3. **Start Command**: `python pdf_processor_service.py`

**Environment Variables**:
```bash
PORT=5000
```

4. **Generate Domain**: Settings → Networking → Generate Domain
5. **Note the URL**: (e.g., `https://pdf-processor-production-xxxx.up.railway.app`)

### Step 5: Deploy Frontend (Next.js)

1. **Create Another Service**: "Add Service" → "GitHub Repo"
2. **Root Directory**: Set to `frontend`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`

**Environment Variables**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_BACKEND_URL=https://backend-production-xxxx.up.railway.app
NEXT_PUBLIC_ADMIN_EMAIL=your-admin-email@gmail.com
```

5. **Generate Domain**: Settings → Networking → Generate Domain
6. **Optional - Custom Domain**:
   - Go to Settings → Networking → Custom Domain
   - Add your `.tech` domain
   - Follow DNS instructions

### Step 6: Update Supabase Redirect URLs

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your Railway frontend URL to "Redirect URLs":
   ```
   https://your-frontend-production-xxxx.up.railway.app/chat
   ```
3. If using custom domain:
   ```
   https://yourdomain.tech/chat
   ```

---

## Can You Make Changes After Deployment? ✅ YES!

Railway has **automatic deployments** from GitHub:

### How It Works:
1. You make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. Railway **automatically detects** the push
4. Railway **rebuilds and redeploys** affected services
5. Your changes are **live in ~2-3 minutes**

### Tips for Updates:
- **Frontend changes** → Only frontend rebuilds
- **Backend changes** → Only backend rebuilds
- **Database changes** → Run SQL in Supabase SQL Editor
- **Environment variables** → Update in Railway dashboard (no rebuild needed)

### Rollback if Needed:
- Railway keeps deployment history
- Click "Deployments" → Select previous version → "Redeploy"

---

## Testing Your Deployment

### 1. Check Services Are Running
In Railway dashboard, all 3 services should show:
- ✅ Green "Active" status
- ✅ No error logs

### 2. Test Frontend
Visit your frontend URL:
- Should see landing page
- Click "Try Free Tier"
- Should redirect to Google sign-in

### 3. Test Backend
Visit `https://your-backend-url.railway.app/check_pdf_quota` in browser
- Should see: `{"canUpload":false,"error":"Authentication required"}`
- This confirms backend is running

### 4. Test Full Flow
1. Sign in with Google
2. Upload a PDF
3. Ask a question
4. Generate flashcards

---

## Cost Estimate

### Railway Pricing:
- **Hobby Plan**: $5/month (+ $0.000231/GB-hour)
- **3 services** running 24/7: ~$10-15/month
- **Plus usage**: RAM, CPU, bandwidth

### Supabase:
- **Free tier**: Up to 500MB database, 50K monthly active users
- Your use case should fit free tier easily

### Total: ~$10-20/month

**To Reduce Costs:**
- Use Railway's "Sleep after inactivity" for dev environment
- Only pay for what you use

---

## Troubleshooting

### Service Won't Start
**Check Logs**: Click service → "View Logs"
- Look for error messages
- Common issues: Missing env vars, wrong port

### Backend Can't Connect to Supabase
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Check Supabase is accessible (not IP restricted)

### Frontend Shows 404
- Ensure build command ran successfully
- Check `NEXT_PUBLIC_BACKEND_URL` is correct

### Google OAuth Fails
- Add Railway domain to Supabase redirect URLs
- Add Railway domain to Google Cloud Console (Authorized redirect URIs)

---

## Railway Dashboard Overview

```
Your Project
├── Backend (Express)
│   ├── Settings → Variables (env vars)
│   ├── Settings → Networking (domain)
│   └── Deployments (history)
├── PDF Processor (Flask)
│   └── Settings → Variables
└── Frontend (Next.js)
    ├── Settings → Variables
    └── Settings → Networking (custom domain)
```

---

## Quick Commands Reference

### View Logs:
```bash
# In Railway dashboard
Click service → "View Logs"
```

### Update Environment Variable:
```bash
# In Railway dashboard
Settings → Variables → Add/Edit → Save
# Service auto-restarts
```

### Manual Redeploy:
```bash
# In Railway dashboard
Deployments → Three dots → "Redeploy"
```

---

## Next Steps After Deployment

1. ✅ Test all features thoroughly
2. ✅ Set up custom domain (optional)
3. ✅ Monitor logs for first few days
4. ✅ Set up error tracking (optional - Sentry)
5. ✅ Share with users!

---

## Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Supabase Docs**: https://supabase.com/docs

Good luck with your deployment! 🚀
