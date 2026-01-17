# Google Cloud Console - Step-by-Step Visual Guide

Follow this checklist as you navigate through Google Cloud Console.

## ✅ Step 1: Create/Select Project

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Click the **project dropdown** at the top (shows current project name)
- [ ] Choose one:
  - [ ] **NEW PROJECT** → Enter name: `Expense Tracker` → Click **CREATE**
  - [ ] Select an **existing project** from the list
- [ ] Wait for project to be active (notification appears)

---

## ✅ Step 2: Configure OAuth Consent Screen

### 2.1 Navigate to OAuth Consent Screen
- [ ] Click **☰ menu icon** (top left) if sidebar is collapsed
- [ ] Click **"APIs & Services"** in the left sidebar
- [ ] Click **"OAuth consent screen"**

### 2.2 App Information (You are here!)
- [ ] **App name***: Type `Expense Tracker`
- [ ] **User support email***: Select your email from dropdown
- [ ] Click **"Next"** button (blue, bottom right)

### 2.3 Audience
- [ ] Select **"External"** (unless you have Google Workspace)
- [ ] Click **"CREATE"** button

### 2.4 Scopes (Optional - Can Skip)
- [ ] Click **"Save and Continue"** (or review scopes if needed)

### 2.5 Test Users (Important!)
- [ ] Click **"+ ADD USERS"** button
- [ ] Enter email address (e.g., `your-email@gmail.com`)
- [ ] Click **"Add"**
- [ ] Repeat for additional users if needed
- [ ] Click **"Save and Continue"**

### 2.6 Summary
- [ ] Review the information shown
- [ ] Click **"Back to Dashboard"**

---

## ✅ Step 3: Create OAuth Credentials

### 3.1 Navigate to Credentials
- [ ] In left sidebar, click **"APIs & Services"** → **"Credentials"**
- [ ] (Or click **"Credentials"** directly if visible)

### 3.2 Create OAuth Client ID
- [ ] Click **"+ CREATE CREDENTIALS"** button (top of page)
- [ ] Select **"OAuth client ID"** from dropdown

### 3.3 Configure OAuth Client Form

**Application type:**
- [ ] Select **"Web application"** ✅ (You already have this selected!)

**Name:**
- [ ] Enter: `Expense Tracker Web Client` ✅ (You have "AP Expenses Web Client" - that's fine!)

**Authorized JavaScript origins:**
- [ ] Click **"+ ADD URI"** button
- [ ] Enter: `http://localhost:5173`
- [ ] Press Enter or click outside the field
- [ ] (Optional) Click **"+ ADD URI"** again if you have a production URL

**Authorized redirect URIs:**
- [ ] Click **"+ ADD URI"** button
- [ ] Enter: `http://localhost:5173`
- [ ] Press Enter or click outside the field
- [ ] (Optional) Click **"+ ADD URI"** again if you have a production URL

**⚠️ IMPORTANT:** You must add at least one URI in each section before you can create the client!

### 3.4 Create and Copy Client ID
- [ ] Click **"Create"** button (bottom of the form)
- [ ] **A popup will appear** showing your credentials
- [ ] **Copy the Client ID** (looks like: `123456789-abc.apps.googleusercontent.com`)
  - ⚠️ You only need the Client ID, NOT the Client Secret
  - The Client ID is the long string ending in `.apps.googleusercontent.com`
- [ ] Click **"OK"** to close the popup
- [ ] **After closing, you'll see your credential listed** in the Credentials page

---

## ✅ Step 4: Configure Your Application

### 4.1 Backend Configuration
Set this environment variable in your backend (Railway, local `.env`, etc.):

```bash
GOOGLE_CLIENT_ID=your-copied-client-id-here.apps.googleusercontent.com
ALLOWED_EMAILS=your-email@gmail.com,partner-email@gmail.com
```

### 4.2 Frontend Configuration
Create `.env` file in `frontend/` directory:

```env
VITE_GOOGLE_CLIENT_ID=your-copied-client-id-here.apps.googleusercontent.com
```

**Important:** Use the SAME Client ID for both backend and frontend!

### 4.3 Restart Services
- [ ] Restart your backend server
- [ ] Restart your frontend server
- [ ] Navigate to login page
- [ ] You should see "Sign in with Google" button!

---

## 🎉 You're Done!

After completing these steps:
1. Your Google Sign-In button should appear on the login page
2. Users with emails in `ALLOWED_EMAILS` can sign in
3. New users are automatically created on first login

---

## 📝 Quick Reference

**What you need:**
- ✅ Google Cloud Project
- ✅ OAuth Consent Screen configured
- ✅ OAuth Client ID (Web application type)
- ✅ Client ID set in backend (`GOOGLE_CLIENT_ID`)
- ✅ Client ID set in frontend (`VITE_GOOGLE_CLIENT_ID`)
- ✅ Email whitelist set in backend (`ALLOWED_EMAILS`)

**Where to find things later:**
- OAuth Consent Screen: **APIs & Services** → **OAuth consent screen**
- Credentials: **APIs & Services** → **Credentials**
- Your Client ID: Click on the credential name to view/edit

---

## 🆘 Troubleshooting

**"Application name must not be empty" error:**
- Make sure you filled in the "App name" field in Step 2.2

**Can't find "OAuth consent screen":**
- Make sure you're in the correct project
- Look under **APIs & Services** in the left sidebar
- Click the ☰ menu icon to expand sidebar

**Client ID not working:**
- Verify you copied the entire Client ID (ends with `.apps.googleusercontent.com`)
- Make sure it's the same in both backend and frontend
- Check that authorized origins include your current URL
