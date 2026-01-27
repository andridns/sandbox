# Setup Guide for aphomeexpense.xyz

This is your personalized setup guide for configuring `aphomeexpense.xyz` with your Railway deployment.

## Domain Information

- **Domain**: `aphomeexpense.xyz` ⭐
- **Full URL**: `https://aphomeexpense.xyz`
- **First Year**: ~$2.06
- **Renewal**: ~$11.84/year ✅ Great value!
- **5-Year Total**: ~$49 (saves $55 vs .online!)
- **Current Railway URL**: `https://frontend-production-93f5.up.railway.app`

## Step 1: Register the Domain

### Recommended Registrar: Porkbun ⭐

1. Visit **Porkbun**: https://porkbun.com/
2. Search for: `aphomeexpense.xyz`
3. **Expected Price**: ~$2.06 for first year
4. **Renewal**: ~$11.84/year ✅ Great value!
5. Add to cart and complete registration
6. **Important**: Ensure WHOIS privacy is enabled (should be free)
7. Complete payment

**Alternative**: Spaceship (https://www.spaceship.com/) - Similar pricing (~$2.06 first year, ~$12.52 renewal)

## Step 2: Add Domain to Railway

1. Log into Railway: https://railway.app
2. Select your project
3. Click on **frontend service** (`frontend-production-93f5`)
4. Go to **Settings** → **Networking** → **Public Networking**
5. Click **"+ Custom Domain"**
6. Enter: `aphomeexpense.xyz` (without `https://`)
7. Click **"Add Domain"**
8. **Copy the CNAME value** Railway provides (e.g., `g05ns7.up.railway.app`)
   - You'll need this for the next step

## Step 3: Configure DNS

### Option A: Using Your Registrar's DNS (Porkbun/Spaceship)

**Important**: If you see an error about CNAME on root domain, use **ALIAS record** instead!

1. Log into your domain registrar (Porkbun or Spaceship)
2. Go to **DNS Management** or **DNS Settings**
3. **Check for existing records**:
   - Look for any A, AAAA, ALIAS, or CNAME records with Name/Host = `@` (or blank)
   - If found, either **edit** it or **delete** it first
4. Add an **ALIAS record** (not CNAME):
   - **Type**: Select `ALIAS` (or `ANAME` if available)
   - **Name/Host**: `@` (for root domain) or leave blank
   - **Value/Target**: Paste the CNAME value from Railway (e.g., `sydsdrsm.up.railway.app`)
   - **TTL**: `3600` or default
5. Click **"Add"** or **"Save"**

**Note**: ALIAS records work like CNAME but can be used on root domains. If you get an error saying a record already exists, delete or edit the existing record first. See `REGISTRAR_DNS_SETUP.md` for troubleshooting.

### Option B: Use Cloudflare's Native Dashboard (For Orange Cloud Icon)

**If you want to use Cloudflare's native dashboard with the orange cloud icon:**

1. Sign up for free Cloudflare account: https://dash.cloudflare.com/
2. Add your domain `aphomeexpense.xyz` to Cloudflare
3. Cloudflare will provide nameservers (e.g., `ns1.cloudflare.com`)
4. Go back to your registrar (Porkbun/Spaceship)
5. Update your domain's nameservers to Cloudflare's nameservers
6. Wait for nameserver propagation (can take up to 24 hours)
7. In Cloudflare dashboard, go to **DNS** → **Records**
8. Add CNAME record with **orange cloud enabled** (see `CLOUDFLARE_DNS_SETUP.md`)

**Note**: This requires changing nameservers. Option A (ALIAS) is simpler if your registrar supports it.

### Option C: Use a Subdomain Instead

If ALIAS isn't available and you don't want to use Cloudflare:

1. Add a CNAME record for a subdomain:
   - **Type**: `CNAME`
   - **Name**: `www` (or `app`, `home`, etc.)
   - **Target**: `sydsdrsm.up.railway.app`
2. Update Railway to use `www.aphomeexpense.xyz` instead of `aphomeexpense.xyz`

**Note**: Your site will be at `https://www.aphomeexpense.xyz` instead of `https://aphomeexpense.xyz`.

## Step 4: Wait for DNS Propagation

- Wait **5 minutes to 48 hours** for DNS to propagate
- Check status at: https://www.whatsmydns.net/#CNAME/aphomeexpense.xyz
- In Railway, the domain status will change from "Pending" to "Active" when ready
- Railway will automatically provision SSL certificate via Let's Encrypt

## Step 5: Update Backend CORS

1. In Railway, go to your **backend service**
2. Navigate to **Variables** tab
3. Find `ALLOWED_ORIGINS` variable
4. Update it to:
   ```
   ALLOWED_ORIGINS=https://aphomeexpense.xyz,https://frontend-production-93f5.up.railway.app
   ```
5. Railway will automatically redeploy

## Step 6: Update Google OAuth (If Using)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized JavaScript origins**, add:
   ```
   https://aphomeexpense.xyz
   ```
6. Under **Authorized redirect URIs**, add:
   ```
   https://aphomeexpense.xyz
   ```
7. Click **"SAVE"**

## Step 7: Test Your Domain

1. Wait for DNS propagation (check Railway dashboard - domain should show "Active")
2. Open: `https://aphomeexpense.xyz`
3. Verify:
   - ✅ Site loads correctly
   - ✅ SSL certificate is valid (green padlock)
   - ✅ Login works
   - ✅ API calls work (no CORS errors in console)
   - ✅ Google OAuth works (if enabled)

## Quick Reference

- **Domain**: `aphomeexpense.xyz`
- **Full URL**: `https://aphomeexpense.xyz`
- **Railway Dashboard**: https://railway.app
- **DNS Check**: https://www.whatsmydns.net/#CNAME/aphomeexpense.xyz
- **Porkbun**: https://porkbun.com/ ⭐ Recommended registrar
- **Spaceship**: https://www.spaceship.com/ (alternative)

## Cost Summary

- **First Year**: ~$2.06 (domain registration)
- **Renewal**: ~$11.84/year ✅ Great value!
- **Railway**: $5/month (already paying)
- **5-Year Total**: ~$349 (domain + Railway)
- **Savings**: $55 over 5 years compared to .online!

## Troubleshooting

If you encounter issues, see the detailed troubleshooting section in `CUSTOM_DOMAIN_SETUP.md`.

Common issues:
- **Cloudflare CNAME error** → Enable orange cloud (proxy) - see `CLOUDFLARE_DNS_SETUP.md` ⚠️
- Domain status stays "Pending" → Check DNS records, ensure proxy is enabled if using Cloudflare
- CORS errors → Verify `ALLOWED_ORIGINS` includes `https://aphomeexpense.xyz`
- Google OAuth not working → Verify authorized URIs are updated

---

**Ready to start?** Begin with Step 1: Register `aphomeexpense.xyz` at Porkbun!
