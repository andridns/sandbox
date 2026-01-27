# Complete Railway Deployment Guide - Step by Step

This is a complete walkthrough for deploying your Expense Tracker application to Railway from scratch.

## Prerequisites

- Your code is pushed to a GitHub repository
- You have a GitHub account
- You're ready to deploy!

## Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"** or **"Login"** if you already have an account
3. Choose **"Login with GitHub"** (recommended - easiest way to connect repositories)
4. Authorize Railway to access your GitHub account when prompted

## Step 2: Create a New Project

1. After logging in, you'll see the Railway dashboard
2. Click the **"New Project"** button (usually a big blue button or "+" icon)
3. Select **"Deploy from GitHub repo"**
4. If this is your first time, Railway will ask you to install the Railway GitHub App
   - Click **"Configure GitHub App"** or **"Install"**
   - Select the repositories you want Railway to access (or select "All repositories")
   - Click **"Install"**
5. You'll see a list of your GitHub repositories
6. **Select the repository** that contains your `backend` and `frontend` folders (likely named `sandbox` or similar)
7. Railway will create a new project and start detecting your code

## Step 3: Add PostgreSQL Database

1. In your Railway project dashboard, you'll see an empty project
2. Click the **"New"** button (or **"+"** icon)
3. Select **"Database"** from the dropdown menu
4. Choose **"Add PostgreSQL"**
5. Railway will automatically provision a PostgreSQL database
6. Wait a few seconds for it to be created
7. **Important**: Click on the PostgreSQL service card
8. Go to the **"Variables"** tab
9. Find the `DATABASE_URL` variable - **copy this value** (you'll need it later)
   - It looks like: `postgresql://postgres:password@hostname:port/railway`

## Step 4: Deploy Backend Service

1. In your Railway project, click **"New"** again
2. Select **"GitHub Repo"** from the dropdown
3. Select the **same repository** you selected in Step 2
4. Railway will create a new service and try to auto-detect the setup
5. **Configure the backend service:**

   a. **Click on the backend service** (it might be named after your repo)
   
   b. Go to the **"Settings"** tab
   
   c. **Set Root Directory:**
      - Find the **"Root Directory"** field
      - Enter: `backend`
      - Press Enter or click outside to save
   
   d. **Configure Build Settings:**
      - Scroll to the **"Build"** section
      - Find **"Builder"** - change it from "Railpack" or "Nixpacks" to **"Dockerfile"**
      - Find **"Dockerfile Path"** - set it to: `Dockerfile`
        (This is relative to the root directory you set above)
   
   e. **Set Environment Variables:**
      - Go to the **"Variables"** tab
      - Click **"New Variable"** or **"Raw Editor"**
      - Add these variables one by one:
      
        ```
        DATABASE_URL=<paste the DATABASE_URL from PostgreSQL service>
        ALLOWED_ORIGINS=https://your-frontend.railway.app
        PORT=8000
        DEFAULT_USERNAME=admin
        DEFAULT_PASSWORD=<choose a strong password>
        ```
      
      - **Important**: 
        - Set `DEFAULT_PASSWORD` to a strong password (not the default `23052020`)
        - The admin user will be created/updated automatically on deployment
        - You can change the password later by updating this variable and redeploying
      - **Note**: For `ALLOWED_ORIGINS`, you'll need to update this after deploying the frontend. For now, you can set it to `*` temporarily, or leave it and update later.
   
   f. **Save all changes**

6. Railway will automatically start building and deploying your backend
7. Watch the deployment logs - you should see:
   - Building Docker image
   - Installing dependencies
   - Running migrations
   - Starting the server
8. Once deployed, note the **backend service URL** (e.g., `https://your-backend.railway.app`)
   - You can find this in the "Settings" → "Networking" tab, or it will be shown in the service card

## Step 5: Deploy Frontend Service

1. In your Railway project, click **"New"** again
2. Select **"GitHub Repo"** from the dropdown
3. Select the **same repository** as before
4. **Configure the frontend service:**

   a. **Click on the frontend service**
   
   b. Go to the **"Settings"** tab
   
   c. **Set Root Directory:**
      - Find the **"Root Directory"** field
      - Enter: `frontend`
      - Press Enter or click outside to save
   
   d. **Configure Build Settings:**
      - Scroll to the **"Build"** section
      - Find **"Builder"** - change it to **"Dockerfile"**
      - Find **"Dockerfile Path"** - set it to: `Dockerfile`
   
   e. **Set Environment Variables:**
      - Go to the **"Variables"** tab
      - Add these variables:
      
        ```
        VITE_API_URL=https://your-backend.railway.app/api/v1
        ```
      
      - **Replace `your-backend.railway.app`** with your actual backend URL from Step 4
   
   f. **Save all changes**

5. Railway will automatically start building and deploying your frontend
6. Wait for the build to complete (this takes a few minutes)
7. Once deployed, note the **frontend service URL** (e.g., `https://your-frontend.railway.app`)

## Step 6: Update Backend CORS Configuration

1. Go back to your **backend service**
2. Go to the **"Variables"** tab
3. Find the `ALLOWED_ORIGINS` variable
4. Update it to include your frontend URL:
   ```
   ALLOWED_ORIGINS=https://your-frontend.railway.app
   ```
   (Replace with your actual frontend URL)
5. Railway will automatically redeploy with the new configuration

## Step 7: Access Your Application

1. Open your **frontend URL** in a web browser
   - Example: `https://your-frontend.railway.app`
2. The application should load and be fully functional!
3. **Login with admin credentials:**
   - Username: `admin` (or whatever you set in `DEFAULT_USERNAME`)
   - Password: The password you set in `DEFAULT_PASSWORD` environment variable
   - **Note**: If you didn't set `DEFAULT_PASSWORD`, the default is `23052020` (change this!)
4. **To access from your mobile phone:**
   - Simply open the same URL in your mobile browser
   - The app is mobile-responsive and will work perfectly

## Verification Checklist

After deployment, verify:

- [ ] Backend service is running (check deployment logs)
- [ ] Frontend service is running (check deployment logs)
- [ ] Database is connected (check backend logs for migration success)
- [ ] Frontend can access backend API (try using the app)
- [ ] No CORS errors in browser console
- [ ] Application loads correctly on mobile

## Troubleshooting Common Issues

### Backend won't build
- **Check**: Root Directory is set to `backend`
- **Check**: Builder is set to "Dockerfile" (not Railpack)
- **Check**: Dockerfile Path is set to `Dockerfile`
- **Check**: All files are committed and pushed to GitHub

### Frontend can't connect to backend
- **Check**: `VITE_API_URL` is set correctly in frontend variables
- **Check**: Backend URL uses `https://` (not `http://`)
- **Check**: `ALLOWED_ORIGINS` includes your frontend URL
- **Check**: Backend service is running (check deployment status)

### Database connection errors
- **Check**: `DATABASE_URL` is correctly copied from PostgreSQL service
- **Check**: PostgreSQL service is running
- **Check**: Backend logs for specific error messages

### Build fails with "file not found"
- **Check**: Root Directory is set correctly
- **Check**: Files exist in your GitHub repository
- **Check**: You've committed and pushed all changes

## Cost Monitoring

- Railway provides **$5 free credit per month**
- Monitor your usage in the Railway dashboard
- Your app should stay within free tier limits for personal use
- Check "Usage" or "Billing" tab to see current costs

## Next Steps

- **Custom Domain**: Add your own domain in Settings → Networking
- **Environment Variables**: Add any additional config as needed
- **Monitoring**: Check logs regularly in the "Deployments" tab
- **Updates**: Push to GitHub and Railway will auto-deploy

## Quick Reference

### Service URLs
- Backend: `https://your-backend.railway.app`
- Frontend: `https://your-frontend.railway.app`
- Database: Managed by Railway (connection via DATABASE_URL)

### Important Settings
- **Backend Root Directory**: `backend`
- **Frontend Root Directory**: `frontend`
- **Dockerfile Path**: `Dockerfile` (for both)

### Environment Variables

**Backend:**
- `DATABASE_URL` - From PostgreSQL service (required)
- `ALLOWED_ORIGINS` - Your frontend URL (comma-separated if multiple)
- `PORT` - 8000 (default, Railway may override)
- `DEFAULT_USERNAME` - Admin username (default: "admin")
- `DEFAULT_PASSWORD` - Admin password (⚠️ **Set a strong password!**)
- `SECRET_KEY` - JWT secret key (auto-generated if not set, but recommended for production)
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID (required for Google Sign-In)
- `ALLOWED_EMAILS` - Comma-separated list of allowed emails for Google OAuth

**Frontend:**
- `VITE_API_URL` - Your backend URL + `/api/v1`
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth Client ID (same as backend, required for Google Sign-In)

### Updating Admin Password in Production

To change the admin password after deployment:

1. Go to Railway → Backend service → Variables
2. Update the `DEFAULT_PASSWORD` variable with your new password
3. Redeploy the service (or restart it)
4. The password will be automatically updated on the next startup

**Note**: The password update happens automatically - you don't need to manually update the database.

---

**Need Help?**
- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Check Railway Status: [status.railway.app](https://status.railway.app)
