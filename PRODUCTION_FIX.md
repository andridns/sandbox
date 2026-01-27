# Production Fix Guide

## Issue: Cannot Login in Production

If you can login in development but not in production, follow these steps:

## Step 1: Push Updated Migration

The migration has been updated to fix both SQLite and PostgreSQL databases. Push the changes to GitHub:

```bash
git add backend/alembic/versions/097a50355fa4_fix_password_hash_nullable_for_sqlite.py
git commit -m "Fix password_hash nullable for PostgreSQL production database"
git push
```

Railway will automatically redeploy and run the migration.

## Step 2: Verify Environment Variables in Railway

### For Google OAuth Login:

1. Go to Railway Dashboard → Your Backend Service → **Variables** tab
2. Verify these variables are set:
   - `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
   - `ALLOWED_EMAILS` - Comma-separated list of allowed emails
     - Example: `your-email@gmail.com,partner-email@gmail.com`

### For Password Login:

1. Verify these variables are set:
   - `DEFAULT_USERNAME` - Admin username (default: `admin`)
   - `DEFAULT_PASSWORD` - Admin password (default: `23052020`)

**Important**: If `DEFAULT_PASSWORD` is not set, the default is `23052020`. Make sure this matches what you're trying to login with!

## Step 3: Check Migration Status

After Railway redeploys, check the deployment logs:

1. Go to Railway Dashboard → Your Backend Service → **Deployments** tab
2. Click on the latest deployment
3. Check the logs for:
   - `Running database migrations...`
   - `✓ Made password_hash nullable in PostgreSQL` (or similar success message)
   - Any migration errors

## Step 4: Manually Trigger Migration (If Needed)

If migrations didn't run automatically, you can trigger them manually:

### Option A: Via Railway CLI

```bash
# Install Railway CLI if you haven't
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run poetry run alembic upgrade head
```

### Option B: Via Railway Dashboard

1. Go to Railway Dashboard → Your Backend Service → **Settings** tab
2. Scroll to **"Deploy"** section
3. Click **"Redeploy"** button
4. This will trigger a new deployment and run migrations

## Step 5: Verify Database Schema

You can verify the database schema is correct by checking the backend logs:

1. Go to Railway Dashboard → Your Backend Service → **Deployments** tab
2. Click on the latest deployment → **View Logs**
3. Look for migration success messages

Or use the debug endpoint (if enabled in development mode):
- `https://your-backend.railway.app/api/v1/auth/debug`

## Step 6: Test Login

After migrations complete:

1. **Test Password Login:**
   - Username: `admin` (or your `DEFAULT_USERNAME`)
   - Password: `23052020` (or your `DEFAULT_PASSWORD`)

2. **Test Google Login:**
   - Click "Sign in with Google"
   - Use an email from your `ALLOWED_EMAILS` list

## Troubleshooting

### Still Can't Login with Password

1. **Check `DEFAULT_PASSWORD` variable:**
   - Go to Railway → Backend Service → Variables
   - Verify `DEFAULT_PASSWORD` is set correctly
   - If not set, add it with value `23052020` (or your desired password)
   - Redeploy the service

2. **Check backend logs:**
   - Look for "Invalid password" warnings
   - Look for "Syncing user credentials" messages
   - Verify the admin user was created/updated

3. **Verify password hash:**
   - The password is hashed on startup
   - If you change `DEFAULT_PASSWORD`, you must redeploy for it to take effect

### Still Can't Login with Google

1. **Check `GOOGLE_CLIENT_ID`:**
   - Verify it's set in Railway Variables
   - Must match the Client ID from Google Cloud Console
   - Must be the same in both backend and frontend

2. **Check `ALLOWED_EMAILS`:**
   - Verify your email is in the list
   - Format: `email1@gmail.com,email2@gmail.com` (comma-separated)
   - No spaces around commas

3. **Check frontend environment:**
   - Go to Railway → Frontend Service → Variables
   - Verify `VITE_GOOGLE_CLIENT_ID` is set
   - Must match backend `GOOGLE_CLIENT_ID`

4. **Check Google OAuth configuration:**
   - Go to Google Cloud Console → Your OAuth Client
   - Verify authorized origins include your production frontend URL
   - Verify authorized redirect URIs include your production frontend URL

### Migration Failed

If migration fails:

1. **Check database connection:**
   - Verify `DATABASE_URL` is set correctly
   - Verify PostgreSQL service is running

2. **Check migration logs:**
   - Look for specific error messages
   - Common issues:
     - Database connection timeout
     - Permission errors
     - Column already exists/doesn't exist

3. **Manual SQL fix (Last Resort):**

   If migrations keep failing, you can manually fix the database:

   ```sql
   -- Connect to your PostgreSQL database via Railway dashboard
   -- Go to PostgreSQL service → Connect → Use the connection string
   
   -- Make password_hash nullable
   ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
   
   -- Verify it worked
   SELECT column_name, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'users' AND column_name = 'password_hash';
   ```

## Quick Checklist

- [ ] Pushed updated migration to GitHub
- [ ] Railway redeployed successfully
- [ ] Migration logs show success
- [ ] `GOOGLE_CLIENT_ID` is set in backend variables
- [ ] `ALLOWED_EMAILS` is set in backend variables
- [ ] `VITE_GOOGLE_CLIENT_ID` is set in frontend variables
- [ ] `DEFAULT_PASSWORD` is set in backend variables (or using default `23052020`)
- [ ] Google OAuth authorized origins include production URL
- [ ] Tested password login
- [ ] Tested Google login

## Still Having Issues?

1. Check Railway deployment logs for errors
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Ensure Google OAuth is configured for production URLs
5. Try redeploying both backend and frontend services
