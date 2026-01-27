# Quick Start: Google Login & Email Whitelisting

## Google Login Setup (5 minutes)

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google Identity Services** API
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth client ID**
6. Select **Web application**
7. Add authorized origins:
   - `http://localhost:5173` (for development)
   - `https://your-production-domain.com` (for production)
8. Copy your **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)

### Step 2: Configure Backend

Set environment variable in your backend (Railway, local `.env`, etc.):

```bash
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

### Step 3: Configure Frontend

Create `.env` file in `frontend/` directory:

```env
VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

**Note:** Use the same Client ID for both backend and frontend.

### Step 4: Restart Services

Restart both backend and frontend. The Google Sign-In button will appear on the login page.

---

## Email Whitelisting

### How It Works

Only emails in the `ALLOWED_EMAILS` list can sign in via Google OAuth.

### Adding Users (Current Method)

Set the `ALLOWED_EMAILS` environment variable in your backend:

```bash
ALLOWED_EMAILS=user1@gmail.com,user2@gmail.com,user3@gmail.com
```

**Important:**
- Emails are comma-separated
- Spaces are automatically trimmed
- Case-insensitive matching
- Must restart/redeploy backend after changes

### Example: Adding More Users

**Before:**
```bash
ALLOWED_EMAILS=john@gmail.com,jane@gmail.com
```

**After (add 2 more users):**
```bash
ALLOWED_EMAILS=john@gmail.com,jane@gmail.com,bob@gmail.com,alice@gmail.com
```

Then restart/redeploy your backend service.

---

## Testing

1. Start your development servers:
   ```bash
   ./start-dev.sh
   ```

2. Navigate to `http://localhost:5173`

3. You should see:
   - Username/password login form
   - "Or continue with" divider
   - Google Sign-In button (if configured)

4. Login with default credentials:
   - Username: `admin`
   - Password: `23052020`

5. Or click "Sign in with Google" and use an email from your `ALLOWED_EMAILS` list

6. If successful, you'll be redirected to the dashboard

---

## Troubleshooting

### Google Sign-In button doesn't appear
- ✅ Check `VITE_GOOGLE_CLIENT_ID` is set in frontend `.env`
- ✅ Restart frontend server
- ✅ Check browser console for errors

### "Invalid Google token" error
- ✅ Verify `GOOGLE_CLIENT_ID` matches between frontend and backend
- ✅ Check the Client ID is correct (no typos)
- ✅ Ensure authorized origins include your current URL

### "Your email is not authorized" error
- ✅ Check your email is in `ALLOWED_EMAILS` environment variable
- ✅ Verify format: `email1@gmail.com,email2@gmail.com` (comma-separated)
- ✅ Restart backend after updating `ALLOWED_EMAILS`

### Login works but user not created
- ✅ Check database migrations are run: `poetry run alembic upgrade head`
- ✅ Check backend logs for errors

### Cannot login with default credentials
- ✅ Verify you're using the correct password: `23052020` (not `admin123`)
- ✅ If you changed the default password, update it using the password update script:
  ```bash
  poetry run python scripts/update_admin_password.py
  ```
- ✅ Check backend logs for "Invalid password" warnings
- ✅ Ensure the admin user exists: Check `/api/v1/auth/debug` endpoint (development only)

### Need to update admin password
See the [Backend README](../backend/README.md#updating-admin-password) for detailed instructions on updating passwords.

---

## Security Notes

1. **Never commit** `.env` files or Client IDs to git
2. Always use environment variables for sensitive data
3. In production, use HTTPS (required for secure cookies)
4. Keep `ALLOWED_EMAILS` restricted - don't leave it empty in production
5. Regularly review and update the whitelist

---

## Next Steps

- Users are automatically created on first Google login
- Username is generated from email (e.g., `john@gmail.com` → username `john`)
- If username exists, a number is appended (`john1`, `john2`, etc.)
- Users can access all features immediately after first login
