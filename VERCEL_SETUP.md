# Vercel Deployment Setup Guide

## Fix the 500 Error on Vercel

The error occurs because `DATABASE_URL` environment variable is not set in Vercel. Follow these steps:

### Step 1: Set DATABASE_URL in Vercel

1. **Go to your Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Select your project

2. **Navigate to Settings → Environment Variables**

3. **Add the DATABASE_URL variable:**
   - **Name**: `DATABASE_URL`
   - **Value**: `postgresql://neondb_owner:npg_Vx9bJ1zjrBGO@ep-rough-scene-a4jwz52c-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require`
   - **Environment**: Select all (Production, Preview, Development)

4. **Click "Save"**

### Step 2: Redeploy Your Application

After adding the environment variable:

1. Go to the **Deployments** tab
2. Click the **"..."** menu on your latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger a new deployment

### Step 3: Verify the Deployment

1. Check the deployment logs to ensure it starts without errors
2. Visit your Vercel URL
3. The application should now work correctly

## Important Notes

- **Environment Variables are required**: The application now uses Neon database only (no SQLite fallback)
- **Never commit secrets**: The connection string contains credentials - keep it secure in Vercel's environment variables
- **All environments**: Make sure to set the variable for Production, Preview, and Development if you use all three

## Troubleshooting

### Still getting 500 error?

1. **Check Vercel Logs**:
   - Go to your deployment
   - Click on "Functions" tab
   - Check the logs for error messages

2. **Verify DATABASE_URL is set**:
   - Go to Settings → Environment Variables
   - Confirm `DATABASE_URL` is listed and has the correct value

3. **Check connection string format**:
   - Make sure it starts with `postgresql://` (not `postgres://`)
   - Ensure `sslmode=require` is included

4. **Test connection locally**:
   ```bash
   set DATABASE_URL=postgresql://neondb_owner:npg_Vx9bJ1zjrBGO@ep-rough-scene-a4jwz52c-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   uvicorn api.main:app --host 0.0.0.0 --port 8001
   ```

## Alternative: Use Vercel CLI

You can also set environment variables using Vercel CLI:

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Set environment variable
vercel env add DATABASE_URL
# When prompted, paste your connection string
# Select: Production, Preview, Development (all)

# Redeploy
vercel --prod
```

