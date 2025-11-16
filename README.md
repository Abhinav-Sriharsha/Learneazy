# Learneazy.io

AI-powered learning assistant that transforms PDFs into interactive study experiences.

## Features

- 📚 **Chat with PDFs** - Upload any textbook or document and ask questions
- 🎴 **Smart Flashcards** - Auto-generate study flashcards from chapters
- ✨ **AI Summaries** - Get concise chapter summaries instantly
- 🔒 **Quota Management** - Free tier + unlimited with your own API keys
- 👑 **Admin Dashboard** - Manage users and custom quotas

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Express.js, LangChain, Google Gemini 2.5 Flash
- **PDF Processing**: Flask, PyMuPDF
- **Database**: Supabase (PostgreSQL + pgVector)
- **Auth**: Supabase Auth (Google OAuth)
- **Embeddings**: Cohere embed-english-v3.0

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- Python 3.9+
- Supabase account
- API keys: Google Gemini, Cohere

### 1. Clone Repository
```bash
git clone https://github.com/Abhinav-Sriharsha/Learneazy.io.git
cd Learneazy.io
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys
npm start
```

### 3. Python PDF Processor
```bash
cd backend
pip install -r requirements.txt
python pdf_processor_service.py
```

### 4. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase keys
npm run dev
```

### 5. Database Setup
- Create Supabase project
- Run `backend/supabase-schema.sql` in SQL Editor
- Enable Google OAuth in Authentication

Visit `http://localhost:3000`

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Railway deployment instructions.

**Quick Deploy:**
1. Push to GitHub
2. Create Railway project from repo
3. Deploy 3 services (Frontend, Backend, PDF Processor)
4. Set environment variables
5. Done! ✅

## Environment Variables

### Backend (.env)
```bash
GOOGLE_API_KEY=your_gemini_key
COHERE_API_KEY=your_cohere_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
ADMIN_EMAIL=your_admin_email
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_ADMIN_EMAIL=your_admin_email
```

## Project Structure

```
Learneazy.io/
├── frontend/              # Next.js app
│   ├── app/              # App router
│   │   ├── page.tsx      # Landing page
│   │   └── chat/         # Chat app
│   ├── components/       # React components
│   └── contexts/         # Auth context
├── backend/              # Express + Flask
│   ├── server.js         # Express server
│   ├── ragChain.js       # LangChain agent
│   ├── ingestion.js      # PDF processing
│   ├── pdf_processor_service.py  # Flask service
│   └── middleware/       # Quota middleware
└── DEPLOYMENT.md         # Deploy guide
```

## License

MIT License

---

Built with ❤️ for students everywhere
