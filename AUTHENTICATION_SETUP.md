# 🔐 Authentication & Quota System Setup Guide

This guide explains how to set up the authentication and quota system for Learneazy.io.

## 📋 Overview

The app now includes:
- ✅ Google Sign-In with Supabase Auth
- ✅ Free tier: 5 queries + 1 PDF upload per user
- ✅ Unlimited usage with user's own API keys (stored client-side)
- ✅ Quota tracking in Supabase database
- ✅ API Keys settings modal
- ✅ Quota exceeded popup

---

## 🚀 Setup Steps

### 1. Configure Supabase

#### A. Enable Google OAuth

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** and click **Enable**
5. Add your Google OAuth credentials:
   - Get Client ID and Secret from [Google Cloud Console](https://console.cloud.google.com/)
   - Add authorized redirect URIs:
     ```
     https://your-project.supabase.co/auth/v1/callback
     http://localhost:3000 (for development)
     ```

#### B. Create Users Table

1. Go to **SQL Editor** in Supabase
2. Run the SQL script from `/backend/supabase-schema.sql`
3. This creates the `users` table with quota tracking

### 2. Update Environment Variables

#### Backend (`.env`)
```bash
# Existing variables
GOOGLE_API_KEY=your_gemini_api_key
COHERE_API_KEY=your_cohere_api_key

# Supabase (same as backend uses for vector store)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

#### Frontend (`.env.local`)
Create this file in `/frontend/`:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### 3. Install Dependencies

```bash
# Frontend (already done if you pulled latest)
cd frontend
npm install

# Backend (no new dependencies needed)
```

### 4. Update Frontend Code

You need to integrate the auth system into your main app. Here's what needs to be done:

#### A. Update `frontend/app/layout.tsx`

Wrap your app with the AuthProvider:

```typescript
import { AuthProvider } from '@/contexts/AuthContext'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

#### B. Update `frontend/components/chatbot-ui.tsx`

Add these imports at the top:
```typescript
import { useAuth } from '@/contexts/AuthContext'
import { ApiKeysModal } from './api-keys-modal'
import { QuotaExceededModal } from './quota-exceeded-modal'
```

Inside the component:
```typescript
export default function ChatbotUI() {
  const { user, supabaseUser, signIn, signOut, hasOwnKeys, queriesRemaining } = useAuth()

  // Add state for modals
  const [showApiKeysModal, setShowApiKeysModal] = useState(false)
  const [showQuotaModal, setShowQuotaModal] = useState(false)

  // Update fetch calls to include auth headers
  const userGoogleKey = typeof window !== 'undefined' ? localStorage.getItem('userGoogleKey') : null
  const userCohereKey = typeof window !== 'undefined' ? localStorage.getItem('userCohereKey') : null

  const response = await fetch(`${BACKEND_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": supabaseUser?.id || '',
      ...(userGoogleKey && { "x-user-google-key": userGoogleKey }),
      ...(userCohereKey && { "x-user-cohere-key": userCohereKey }),
    },
    body: JSON.stringify({ question: input, history: historyForAPI }),
  })

  // Handle quota exceeded
  if (response.status === 403) {
    setShowQuotaModal(true)
    return
  }

  // ... rest of your code
}
```

---

## 🎨 UI Components

### Free Tier Indicator

Add this to your chat interface to show remaining queries:

```typescript
{user && !hasOwnKeys && (
  <div className="text-xs text-center text-gray-500 py-2">
    {queriesRemaining} free {queriesRemaining === 1 ? 'query' : 'queries'} remaining
    <button
      onClick={() => setShowApiKeysModal(true)}
      className="text-blue-600 hover:underline ml-2"
    >
      Get unlimited
    </button>
  </div>
)}
```

### Settings Button in Header

Add a button to open API keys settings:

```typescript
<button
  onClick={() => setShowApiKeysModal(true)}
  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 hover:bg-gray-50"
>
  <Key className="w-4 h-4" />
  API Keys
</button>
```

---

## 🔒 Security Notes

1. **API Keys Storage**: User API keys are stored in browser localStorage only
2. **Never stored on server**: We only receive keys in request headers
3. **Quota tracking**: Only applies to users using free tier (without own keys)
4. **Supabase RLS**: Row-level security ensures users can only see their own data

---

## 🧪 Testing

### Test Free Tier User:
1. Sign in with Google
2. Upload a PDF (1/1 limit)
3. Ask 5 questions (will hit quota)
4. Try 6th question → Quota exceeded popup appears

### Test User with Own Keys:
1. Sign in with Google
2. Click "API Keys" in header
3. Add Gemini & Cohere API keys
4. Unlimited queries and PDFs!

---

## 📊 Database Schema

```sql
users (
  id UUID PRIMARY KEY
  google_id TEXT UNIQUE  -- Supabase auth user ID
  email TEXT
  name TEXT
  photo_url TEXT
  queries_used INTEGER DEFAULT 0
  pdfs_uploaded INTEGER DEFAULT 0
  has_own_keys BOOLEAN DEFAULT false
  created_at TIMESTAMP
  updated_at TIMESTAMP
)
```

---

## 🐛 Troubleshooting

### "Authentication required" error
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Verify user is signed in (check browser console)

### Quota not tracking
- Check Supabase database for users table
- Verify middleware is applied to endpoints
- Check browser network tab for `x-user-id` header

### Google Sign-In not working
- Verify Google OAuth is enabled in Supabase
- Check redirect URIs match exactly
- Clear browser cookies and try again

---

## 🚀 Next Steps

1. Run the SQL schema in Supabase
2. Update environment variables
3. Wrap app with AuthProvider
4. Update chatbot UI with auth logic
5. Test authentication flow
6. Deploy!

---

For questions, refer to the code comments or check Supabase documentation.
