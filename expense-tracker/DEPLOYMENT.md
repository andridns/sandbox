# Deployment Guide: Expense Tracker to Railway

This guide will walk you through deploying the Expense Tracker application to Railway cloud platform.

## Prerequisites

- GitHub account
- Railway account (sign up at [railway.app](https://railway.app))
- Git repository with your expense-tracker code

## Cost Estimate

**Railway Free Tier:**
- $5 credit/month
- Estimated monthly cost: ~$2-4/month
  - Backend service: ~$1-2/month
  - Frontend service: ~$1-2/month
  - PostgreSQL database: Free (included)
  - Storage: Free (up to 5GB)

**Result**: Should stay within free tier limits for personal use.

## Step-by-Step Deployment

### 1. Prepare Your Repository

Ensure your code is pushed to GitHub with all the deployment files:
- `expense-tracker/backend/Dockerfile`
- `expense-tracker/backend/start.sh`
- `expense-tracker/backend/railway.toml`
- `expense-tracker/frontend/Dockerfile`
- `expense-tracker/frontend/nginx.conf`
- `expense-tracker/frontend/railway.toml`

**Note**: The source code is located in the `expense-tracker/` directory, so we'll need to set the root directory accordingly in Railway.

### 2. Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign up with GitHub (recommended for easy repository access)

### 3. Create New Project

1. In Railway dashboard, click "New Project"
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub repositories if prompted
4. Select your repository (the one that contains the `expense-tracker` directory)
5. Railway will create a new project

**Note**: If your repository is named something like `sandbox` or `my-projects` and contains the `expense-tracker` folder, select that repository. Railway will allow you to set the root directory per service.

### 4. Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically provision a PostgreSQL database
4. **Important**: Note the `DATABASE_URL` connection string from the database service variables tab

### 5. Deploy Backend Service

1. In your Railway project, click "New"
2. Select "GitHub Repo" → Select your repository (the one containing the `expense-tracker` directory)
3. Railway will detect the Dockerfile automatically
4. **Configure the service:**
   - Click on the backend service
   - Go to "Settings" tab
   - Set "Root Directory" to `expense-tracker/backend`
   - Go to "Variables" tab
   - Add the following environment variables:

#### Backend Environment Variables

```
DATABASE_URL=<from PostgreSQL service>
ALLOWED_ORIGINS=https://your-frontend.railway.app
PORT=8000
```

**To get DATABASE_URL:**
- Click on your PostgreSQL service
- Go to "Variables" tab
- Copy the `DATABASE_URL` value
- Paste it into your backend service variables

**Note**: You'll need to update `ALLOWED_ORIGINS` after deploying the frontend with the actual frontend URL.

5. Railway will automatically build and deploy your backend
6. Once deployed, note the backend service URL (e.g., `https://your-backend.railway.app`)

### 6. Deploy Frontend Service

1. In your Railway project, click "New"
2. Select "GitHub Repo" → Select your repository (the same repository as backend)
3. **Configure the service:**
   - Click on the frontend service
   - Go to "Settings" tab
   - Set "Root Directory" to `expense-tracker/frontend`
   - Go to "Variables" tab
   - Add the following environment variables:

#### Frontend Environment Variables

**Recommended: Direct API calls**
```
VITE_API_URL=https://your-backend.railway.app/api/v1
```

**Alternative: Using nginx proxy (for relative paths)**
```
VITE_API_URL=
BACKEND_URL=https://your-backend.railway.app
```

**Replace `your-backend.railway.app`** with your actual backend service URL from step 5.

**Note**: The recommended approach uses direct API calls with CORS. The alternative uses nginx to proxy API calls, allowing you to use relative paths (`/api/v1`) instead of absolute URLs. Both work, but direct API calls are simpler.

4. Railway will automatically build and deploy your frontend
5. Once deployed, note the frontend service URL (e.g., `https://your-frontend.railway.app`)

### 7. Update Backend CORS Configuration

1. Go back to your backend service
2. Go to "Variables" tab
3. Update `ALLOWED_ORIGINS` to include your frontend URL:
   ```
   ALLOWED_ORIGINS=https://your-frontend.railway.app
   ```
4. The backend will automatically redeploy

### 8. Configure Custom Domains (Optional)

Railway provides free `.railway.app` domains by default. To use a custom domain:

1. Go to your service (backend or frontend)
2. Click "Settings" → "Networking"
3. Click "Custom Domain"
4. Add your domain and follow DNS configuration instructions

### 9. Access Your Application

1. Open your frontend URL in a web browser: `https://your-frontend.railway.app`
2. The application should be fully functional
3. Access from mobile: Simply open the URL in your mobile browser

## Environment Variables Reference

### Backend Variables

| Variable          | Description                  | Example                               |
|-------------------|------------------------------|---------------------------------------|
| `DATABASE_URL`    | PostgreSQL connection string | `postgresql://user:pass@host:port/db` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `https://frontend.railway.app`        |
| `PORT`            | Server port (default: 8000)  | `8000`                                |

### Frontend Variables

| Variable       | Description                           | Example                              |
|----------------|---------------------------------------|--------------------------------------|
| `VITE_API_URL` | Backend API base URL                  | `https://backend.railway.app/api/v1` |
| `BACKEND_URL`  | Backend service URL (for nginx proxy) | `https://backend.railway.app`        |

## Troubleshooting

### Backend Issues

**Database Connection Errors:**
- Verify `DATABASE_URL` is correctly set
- Ensure PostgreSQL service is running
- Check database credentials in PostgreSQL service variables

**CORS Errors:**
- Verify `ALLOWED_ORIGINS` includes your frontend URL
- Check browser console for specific CORS error messages
- Ensure URLs use `https://` protocol

**Migration Errors:**
- Check backend logs in Railway dashboard
- Verify database is accessible
- Try redeploying the backend service

### Frontend Issues

**API Connection Errors:**
- Verify `VITE_API_URL` is correctly set
- Ensure backend service is running and accessible
- Check browser network tab for failed requests

**Build Errors:**
- Check Railway build logs
- Verify all dependencies are in `package.json`
- Ensure Node.js version is compatible (18+)

### General Issues

**Service Not Starting:**
- Check Railway service logs
- Verify Dockerfile is correct
- Ensure all required files are in the repository

**High Costs:**
- Monitor usage in Railway dashboard
- Check if services are sleeping (free tier services sleep after inactivity)
- Consider upgrading if consistently exceeding free tier

## Monitoring and Maintenance

### Viewing Logs

1. Go to your service in Railway dashboard
2. Click "Deployments" tab
3. Select a deployment to view logs
4. Or use "View Logs" button for real-time logs

### Database Backups

Railway PostgreSQL includes automatic backups. To manually backup:

1. Use the backup API endpoint: `POST /api/v1/backup/create`
2. Or use Railway's database backup feature in the PostgreSQL service

### Updating the Application

1. Push changes to your GitHub repository
2. Railway will automatically detect changes and redeploy
3. Monitor deployment status in Railway dashboard

## Alternative: Render.com Deployment

If Railway doesn't work for you, Render.com offers a similar free tier:

1. Sign up at [render.com](https://render.com)
2. Create a new Web Service for backend
3. Create a new Static Site for frontend
4. Add PostgreSQL database
5. Configure environment variables similarly

**Render Free Tier:**
- 750 hours/month (enough for 24/7 operation)
- Free PostgreSQL database
- Automatic SSL certificates

## Security Notes

- Never commit `.env` files to Git
- Use Railway's environment variables for secrets
- Keep your Railway account secure with 2FA
- Regularly update dependencies for security patches

## Support

- Railway Documentation: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Check Railway status: [status.railway.app](https://status.railway.app)
