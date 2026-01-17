# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for the Expense Tracker application.

## Prerequisites

1. A Google account
2. Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create or Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top (next to "Google Cloud")
3. Either:
   - **Create a new project**: Click "NEW PROJECT", enter a name (e.g., "Expense Tracker"), click "CREATE"
   - **Select existing project**: Click on an existing project from the list
4. Wait for the project to be created/selected (you'll see a notification)

## Step 2: Configure OAuth Consent Screen

1. In the left sidebar, click **"APIs & Services"** → **"OAuth consent screen"**
   - (If you don't see this, click the ☰ menu icon to expand the sidebar)

2. **App Information Section:**
   - **App name***: Enter `Expense Tracker` (or your preferred name)
   - **User support email***: Select your email from the dropdown
   - Click **"Next"**

3. **Audience Section:**
   - Choose **"External"** (unless you have a Google Workspace account)
   - Click **"Create"**

4. **Scopes Section** (optional):
   - You can skip this for now - default scopes are sufficient
   - Click **"Save and Continue"**

5. **Test Users Section** (if you chose External):
   - Click **"+ ADD USERS"**
   - Enter email addresses that should be able to sign in (e.g., `your-email@gmail.com`)
   - Click **"Add"** for each email
   - Click **"Save and Continue"**

6. **Summary:**
   - Review the information
   - Click **"Back to Dashboard"**

## Step 3: Create OAuth Credentials

1. In the left sidebar, click **"APIs & Services"** → **"Credentials"**

2. Click **"+ CREATE CREDENTIALS"** at the top of the page

3. Select **"OAuth client ID"**

4. **Configure OAuth Client:**
   - **Application type**: Select **"Web application"**
   - **Name**: Enter `Expense Tracker Web Client` (or your preferred name)

5. **Authorized JavaScript origins:**
   - Click **"+ ADD URI"**
   - Enter: `http://localhost:5173` (for local development)
   - Click **"+ ADD URI"** again and add your production URL if you have one:
     - Example: `https://your-app.railway.app` or `https://yourdomain.com`

6. **Authorized redirect URIs:**
   - Click **"+ ADD URI"**
   - Enter: `http://localhost:5173` (for local development)
   - Click **"+ ADD URI"** again and add your production URL if you have one:
     - Example: `https://your-app.railway.app` or `https://yourdomain.com`

7. Click **"Create"**

8. **Copy Your Client ID:**
   - A popup will appear showing your **Client ID** and **Client Secret**
   - **Copy the Client ID** (it looks like: `xxxxx-xxxxx.apps.googleusercontent.com`)
   - ⚠️ **Important**: You only need the Client ID for this setup (not the Client Secret)
   - Click **"OK"**

## Step 2: Configure OAuth Client

1. Select **Web application** as the application type
2. Give it a name (e.g., "Expense Tracker")
3. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (for local development)
   - `https://your-production-domain.com` (for production)
4. Add **Authorized redirect URIs**:
   - `http://localhost:5173` (for local development)
   - `https://your-production-domain.com` (for production)
5. Click **Create**
6. Copy the **Client ID** (you'll need this)

## Step 3: Configure Backend Environment Variables

In Railway (or your deployment platform), add these environment variables to your **backend** service:

### Required Variables:

- `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID (from Step 2)
- `ALLOWED_EMAILS`: Comma-separated list of allowed email addresses
  - Example: `your-email@gmail.com,partner-email@gmail.com`
  - Only these emails will be able to sign in via Google OAuth

### Optional Variables:

- `SECRET_KEY`: Secret key for JWT tokens (auto-generated if not set, but recommended for production)

## Step 4: Configure Frontend Environment Variables

In Railway (or your deployment platform), add this environment variable to your **frontend** service:

- `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID (same as backend)

### For Local Development:

Create a `.env` file in the `frontend` directory:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
```

## Step 5: Run Database Migration

The backend includes a migration to add Google OAuth support. Run it:

```bash
cd backend
poetry run alembic upgrade head
```

Or if using the start script, it will run automatically.

## Step 6: Test the Setup

1. Start both backend and frontend services
2. Navigate to the login page
3. You should see a "Sign in with Google" button
4. Click it and sign in with one of your allowed email addresses
5. You should be redirected to the dashboard after successful authentication

## Troubleshooting

### "Invalid Google token" error
- Make sure `GOOGLE_CLIENT_ID` is set correctly in the backend
- Verify the Client ID matches between frontend and backend

### "Your email is not authorized" error
- Check that your email is in the `ALLOWED_EMAILS` environment variable
- Make sure emails are comma-separated with no spaces (or with spaces that will be trimmed)
- Example: `email1@gmail.com,email2@gmail.com`

### Google Sign-In button doesn't appear
- Check that `VITE_GOOGLE_CLIENT_ID` is set in the frontend
- Check browser console for errors
- Make sure the Google Identity Services script is loading

### "Wrong issuer" error
- This usually means the token verification failed
- Double-check your `GOOGLE_CLIENT_ID` is correct

## Security Notes

1. **Never commit** your Google Client ID or Client Secret to version control
2. Always use environment variables for sensitive configuration
3. The `ALLOWED_EMAILS` whitelist is important for security - don't leave it empty in production
4. Make sure your OAuth consent screen is properly configured
5. Use HTTPS in production (required for secure cookies)

## Adding More Users

To add more users, simply add their email addresses to the `ALLOWED_EMAILS` environment variable:

```
ALLOWED_EMAILS=user1@gmail.com,user2@gmail.com,user3@gmail.com
```

Then redeploy the backend service.
