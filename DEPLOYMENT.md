# Deployment Guide - CP Bird Counter Analysis Dashboard

## Overview
This guide explains how to deploy the frontend and backend separately.

## Architecture
- **Frontend**: Static HTML/CSS/JS files (deployed to Vercel/Netlify)
- **Backend**: FastAPI Python application (deployed to Vercel/Railway/Render)

---

## Option 1: Deploy Both to Vercel

### Backend Deployment (FastAPI)

1. **Push code to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the `vercel.json` configuration
   - Click "Deploy"

3. **Note your backend URL**: 
   - After deployment, you'll get a URL like: `https://your-project.vercel.app`
   - Save this URL - you'll need it for the frontend

### Frontend Deployment

1. **Create a separate frontend folder**:
   ```bash
   mkdir frontend
   cp -r public/* frontend/
   ```

2. **Update the API URL in `frontend/index.html`**:
   - Find the line: `window.ENV_API_URL = window.ENV_API_URL || 'http://localhost:8001';`
   - Replace with your backend URL: `window.ENV_API_URL = 'https://your-backend.vercel.app';`

3. **Deploy frontend to Vercel**:
   - Create a new Vercel project
   - Select the `frontend` folder
   - Deploy

---

## Option 2: Backend on Railway, Frontend on Vercel

### Backend on Railway (Recommended for databases)

1. **Create `railway.json`**:
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "uvicorn api.main:app --host 0.0.0.0 --port $PORT",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

2. **Deploy to Railway**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect Python and deploy
   - Add environment variables if needed

3. **Get your Railway URL**: `https://your-app.up.railway.app`

### Frontend on Vercel

Same as Option 1, but use your Railway backend URL.

---

## Environment Variables

### Backend (Vercel/Railway)
- `DATABASE_URL`: SQLite path or PostgreSQL connection string
- `CORS_ORIGINS`: Comma-separated list of allowed origins

### Frontend (Vercel)
Create a `vercel.json` in the frontend folder:
```json
{
  "buildCommand": "echo 'No build needed'",
  "outputDirectory": ".",
  "env": {
    "API_URL": "https://your-backend-url.vercel.app"
  }
}
```

---

## File Structure for Deployment

```
project/
├── api/                    # Backend (FastAPI)
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── data_analyzer.py
│   └── excel_processor.py
├── public/                 # Frontend (Static files)
│   ├── index.html
│   ├── app.js
│   ├── charts.js
│   └── styles.css
├── uploads/                # Excel files
├── requirements.txt        # Python dependencies
├── vercel.json            # Vercel config for backend
└── README.md
```

---

## Testing Deployment

### Local Testing with Production URL

1. Update `index.html`:
   ```html
   <script>
       window.ENV_API_URL = 'https://your-backend-url.vercel.app';
   </script>
   ```

2. Test locally:
   ```bash
   python -m http.server 3000 --directory public
   ```

3. Open `http://localhost:3000` and verify it connects to your deployed backend

---

## CORS Configuration

Make sure your backend allows requests from your frontend domain:

In `api/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend.vercel.app",
        "http://localhost:3000",  # For local development
        "*"  # Or allow all (less secure)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Database Considerations

### SQLite (Current)
- **Issue**: Vercel has ephemeral filesystem (data lost on redeploy)
- **Solution**: Use Railway or Render for backend (persistent storage)

### PostgreSQL (Recommended for Production)
1. Add to `requirements.txt`:
   ```
   psycopg2-binary
   ```

2. Update `database.py` to use PostgreSQL:
   ```python
   DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./poultry_dashboard.db")
   ```

3. Add DATABASE_URL environment variable in Railway/Vercel

---

## Quick Deployment Checklist

- [ ] Push code to GitHub
- [ ] Deploy backend to Vercel/Railway
- [ ] Note backend URL
- [ ] Update frontend `window.ENV_API_URL` with backend URL
- [ ] Deploy frontend to Vercel
- [ ] Test the deployed application
- [ ] Configure CORS if needed
- [ ] Set up custom domain (optional)

---

## Support

For issues, check:
1. Browser console for frontend errors
2. Vercel/Railway logs for backend errors
3. CORS configuration
4. Environment variables are set correctly
