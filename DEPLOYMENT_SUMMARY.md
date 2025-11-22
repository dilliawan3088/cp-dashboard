# CP Bird Counter Analysis Dashboard - Deployment Ready

## ✅ Changes Made for Deployment

### 1. Environment Configuration
- Added `window.ENV_API_URL` variable in `index.html` to dynamically set API URL
- Updated `app.js` to use environment variable for API_BASE_URL
- Default: `http://localhost:8001` for local development
- Can be overridden for production deployment

### 2. Vercel Configuration
- Created `vercel.json` for backend deployment
- Configured to deploy FastAPI application

### 3. CORS Configuration
- Updated CORS to allow multiple origins
- Supports both localhost and 127.0.0.1
- Ready for production domains

---

## 📁 Project Structure

```
cp-dashboard/
├── api/                          # Backend (FastAPI)
│   ├── main.py                   # Main API application
│   ├── database.py               # Database models
│   ├── models.py                 # Pydantic models
│   ├── data_analyzer.py          # Data processing
│   └── excel_processor.py        # Excel file handling
│
├── public/                       # Frontend (Static files)
│   ├── index.html                # Main HTML file
│   ├── app.js                    # Application logic
│   ├── charts.js                 # Chart visualizations
│   └── styles.css                # Styling
│
├── uploads/                      # Excel files storage
├── requirements.txt              # Python dependencies
├── vercel.json                   # Vercel deployment config
├── DEPLOYMENT.md                 # Deployment guide
└── README.md                     # Project documentation
```

---

## 🚀 Quick Start - Local Development

### Backend
```bash
cd "C:\Users\hp\Desktop\dashboard\python code"
python -m uvicorn api.main:app --reload --port 8001
```

### Frontend (if testing separately)
```bash
python -m http.server 3000 --directory public
```

### Access
- **Full Application**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs

---

## 🌐 Deployment Options

### Option 1: Both on Vercel
- **Backend**: Deploy root directory to Vercel
- **Frontend**: Create separate project with `public/` folder
- Update `window.ENV_API_URL` in `index.html` with backend URL

### Option 2: Backend on Railway, Frontend on Vercel
- **Backend**: Deploy to Railway (better for databases)
- **Frontend**: Deploy `public/` folder to Vercel
- More reliable for SQLite database

### Option 3: All-in-One on Railway
- Deploy entire project to Railway
- Railway serves both API and static files
- Simplest option for small projects

---

## 🔧 Configuration for Production

### Step 1: Deploy Backend

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. Deploy to Vercel/Railway

3. Get your backend URL (e.g., `https://your-app.vercel.app`)

### Step 2: Configure Frontend

Update `public/index.html` line 17:
```html
<script>
    window.ENV_API_URL = 'https://your-backend-url.vercel.app';
</script>
```

### Step 3: Deploy Frontend

- Deploy `public/` folder to Vercel
- Or update the backend URL and use the combined deployment

---

## 📊 Features

✅ **8 KPI Cards** with colored top borders
✅ **10 Interactive Charts**:
   1. Variance Trends (Area Chart)
   2. Overall Net Difference (Pie Chart)
   3. Death Rate by Truck (Lollipop Chart)
   4. Farm Performance (Grouped Bar Chart)
   5. Truck Performance (Grouped Bar Chart)
   6. Overall Trend by Trucks (Dual Axis Line Chart)
   7. Slaughter Yield per Farm (Donut Chart)
   8. Missing Birds per Farm (Dotted Line Chart)
   9. Delivered vs Received per Farm (Dual Axis Bar Chart)
   10. Historical Trend by Date (Multi-line Chart)

✅ **Truck Alerts Table**
✅ **Responsive Design**
✅ **Animated Background**
✅ **Filter Controls** (7, 15, 30 days)
✅ **Auto-scroll Header**

---

## 🗄️ Database

### Current: SQLite
- File: `poultry_dashboard.db`
- Location: Project root
- **Note**: Vercel has ephemeral storage (data lost on redeploy)

### For Production: PostgreSQL (Recommended)
1. Add `psycopg2-binary` to `requirements.txt`
2. Set `DATABASE_URL` environment variable
3. Database will auto-migrate

---

## 🔐 Environment Variables

### Backend
- `DATABASE_URL`: Database connection string (optional, defaults to SQLite)
- `PORT`: Server port (auto-set by hosting platform)

### Frontend
- `window.ENV_API_URL`: Backend API URL (set in index.html)

---

## 📝 Next Steps

1. ✅ Code is ready for deployment
2. ⏭️ Choose deployment platform (Vercel/Railway/Render)
3. ⏭️ Deploy backend
4. ⏭️ Update frontend API URL
5. ⏭️ Deploy frontend (or use combined deployment)
6. ⏭️ Test production deployment
7. ⏭️ (Optional) Set up custom domain

---

## 📚 Documentation

- **Deployment Guide**: See `DEPLOYMENT.md`
- **API Documentation**: Visit `/docs` endpoint when backend is running
- **README**: See `README.md` for project overview

---

## 🐛 Troubleshooting

### CORS Errors
- Ensure backend URL is correctly set in `window.ENV_API_URL`
- Check CORS configuration in `api/main.py`

### Database Errors
- For Vercel: Consider using Railway for backend (persistent storage)
- For production: Use PostgreSQL instead of SQLite

### Charts Not Loading
- Check browser console for errors
- Verify API endpoints are accessible
- Ensure Chart.js CDN is loading

---

## 📞 Support

For deployment issues, refer to:
- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- FastAPI Docs: https://fastapi.tiangolo.com

---

**Project is now deployment-ready! 🎉**
