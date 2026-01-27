# Custom Domain Setup Guide

This guide will walk you through setting up a custom domain for your expense tracker app on Railway.

## Prerequisites

- Railway Hobby Plan ($5/month) - already active
- Domain registrar account (we'll help you choose one)

## Step 1: Choose and Register Your Domain

### Recommended Domain Names

Based on your preferences (AP + home + expense/finance), here are personalized suggestions:

**Your Chosen Domain:**

- `aphomeexpense.online` ⭐ **Selected** - Clear, descriptive, and affordable

**Pricing for `aphomeexpense.online`:**
- **First Year**: ~$1.18 (Spaceship) or ~$1.96 (Porkbun)
- **Renewal**: ~$26/year
- **5-Year Total**: ~$104

### Recommended Registrars

1. **Spaceship** ⭐ **Best Overall Value**
   - Website: https://www.spaceship.com/
   - `.xyz`: ~$2.06 first year, ~$12.52/year renewal
   - `.online`: ~$1.18 first year, ~$26/year renewal
   - Free WHOIS privacy included
   - Transparent pricing, no hidden fees

2. **Porkbun** (Great Alternative)
   - Website: https://porkbun.com/
   - `.xyz`: ~$2.06 first year (sale), ~$12.98/year renewal
   - `.online`: ~$1.96 first year (sale), ~$26.26/year renewal
   - Free WHOIS privacy included
   - Excellent customer support

3. **NameSilo** (Good for bulk)
   - Website: https://www.namesilo.com/
   - Free WHOIS privacy
   - Bulk discounts available

### Registration Steps

1. Visit one of the recommended registrars
2. Search for your preferred domain name
3. Check availability and pricing
4. Register the domain (minimum 1 year)
5. **Important**: Ensure WHOIS privacy protection is enabled (free at recommended registrars)
6. Complete the registration and payment

**Cost Estimate**: 
- `.xyz`: ~$2.06 first year, ~$12.52/year renewal (Spaceship)
- `.online`: ~$1.18-$1.96 first year, ~$26/year renewal (Spaceship/Porkbun)

## Step 2: Configure Custom Domain in Railway

1. Log into your Railway dashboard: https://railway.app
2. Select your project
3. Click on your **frontend service** (the one with URL `frontend-production-93f5.up.railway.app`)
4. Go to **Settings** → **Networking** → **Public Networking**
5. Click **"+ Custom Domain"** button
6. Enter your domain name: `aphomeexpense.online`
   - **Important**: Enter just the domain without `https://` (e.g., `aphomeexpense.online`, not `https://aphomeexpense.online`)
7. Click **"Add Domain"**
8. Railway will provide you with a **CNAME record value** (e.g., `g05ns7.up.railway.app`)
   - **Copy this value** - you'll need it in the next step
   - The domain status will show as "Pending" until DNS is configured

## Step 3: Configure DNS Records

### Option A: Using Your Registrar's DNS (Recommended for simplicity)

1. Log into your domain registrar's dashboard
2. Navigate to **DNS Management** or **DNS Settings**
3. Find the section for **DNS Records** or **DNS Zone**
4. Add a new **CNAME record**:
   - **Name/Host**: `@` (for root domain) or leave blank (depends on registrar)
   - **Type**: `CNAME`
   - **Value/Target**: Paste the CNAME value Railway provided (e.g., `g05ns7.up.railway.app`)
   - **TTL**: `3600` (or use default)
5. Save the DNS record

**Note**: Some registrars don't support CNAME records for root domains. If you encounter this issue, see Option B below.

### Option B: Using Cloudflare DNS (If your registrar doesn't support root domain CNAME)

If your registrar doesn't support CNAME flattening for root domains:

1. Sign up for a free Cloudflare account: https://cloudflare.com
2. Add your domain to Cloudflare
3. Cloudflare will provide you with nameservers (e.g., `ns1.cloudflare.com`, `ns2.cloudflare.com`)
4. Go back to your domain registrar
5. Update your domain's nameservers to Cloudflare's nameservers
6. Wait for nameserver propagation (can take up to 24 hours)
7. In Cloudflare dashboard, add a CNAME record:
   - **Name**: `@`
   - **Target**: Railway's CNAME value
   - **Proxy status**: Can be "DNS only" (gray cloud) or "Proxied" (orange cloud)
8. Save the record

## Step 4: Wait for DNS Propagation

- DNS changes typically take **5 minutes to 48 hours** to propagate
- You can check propagation status at: https://www.whatsmydns.net/
- Railway will automatically provision an SSL certificate via Let's Encrypt once DNS is verified
- In Railway dashboard, the domain status will change from "Pending" to "Active" when ready

## Step 5: Update Backend CORS Configuration

1. In Railway dashboard, go to your **backend service**
2. Navigate to **Variables** tab
3. Find the `ALLOWED_ORIGINS` variable
4. Update it to include your new custom domain:
   ```
   ALLOWED_ORIGINS=https://aphomeexpense.online,https://frontend-production-93f5.up.railway.app
   ```
   This allows both your custom domain and the Railway domain to work (you can remove the Railway domain later if desired)
   
   **Note**: Keep the old Railway domain in the list temporarily for testing, or remove it once you've verified the new domain works.

5. Railway will automatically redeploy the backend with the new CORS settings

## Step 6: Update Google OAuth Configuration (If Using Google OAuth)

If your app uses Google OAuth authentication, you need to update the authorized redirect URIs:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized JavaScript origins**, click **"+ ADD URI"** and add:
   ```
   https://aphomeexpense.online
   ```

6. Under **Authorized redirect URIs**, click **"+ ADD URI"** and add:
   ```
   https://aphomeexpense.online
   ```

7. Click **"SAVE"**

## Step 7: Test Your New Domain

1. Wait for DNS propagation to complete (check Railway dashboard - domain should show "Active")
2. Open your new domain in a browser: `https://aphomeexpense.online`
3. Verify:
   - ✅ The site loads correctly
   - ✅ SSL certificate is valid (green padlock in browser)
   - ✅ Login works
   - ✅ API calls work (check browser console for errors)
   - ✅ Google OAuth works (if enabled)

## Step 8: Optional - Update Frontend Environment Variables

The frontend uses environment variables that are set in Railway. You typically don't need to change these unless you're also setting up a custom domain for the backend.

If you want to use a custom backend domain later, update:
- `VITE_API_URL` in Railway frontend service variables

For now, the frontend will continue using the Railway backend URL, which is fine.

## Troubleshooting

### Domain Status Stays "Pending" in Railway

- Check that DNS records are configured correctly
- Verify DNS propagation: https://www.whatsmydns.net/
- Ensure CNAME record points to the exact value Railway provided
- Wait up to 48 hours for full propagation

### SSL Certificate Not Provisioning

- Railway automatically provisions SSL certificates via Let's Encrypt
- This happens automatically after DNS is verified
- If it takes more than a few hours, check Railway logs or contact Railway support

### CORS Errors After Domain Change

- Verify `ALLOWED_ORIGINS` includes your new domain (with `https://`)
- Ensure the backend has been redeployed after updating the variable
- Check browser console for specific CORS error messages

### Google OAuth Not Working

- Verify authorized redirect URIs are updated in Google Cloud Console
- Check that the domain matches exactly (including `https://`)
- Clear browser cache and cookies
- Check browser console for OAuth errors

### Domain Not Resolving

- Verify DNS records are saved correctly at your registrar
- Check DNS propagation status
- Try using a different DNS server (e.g., 8.8.8.8) to test
- Clear your local DNS cache:
  - macOS: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`
  - Windows: `ipconfig /flushdns`
  - Linux: `sudo systemd-resolve --flush-caches`

## Cost Summary

### One-Time Setup
- Domain registration (`aphomeexpense.online`): **~$1.18-$1.96** (first year at Spaceship/Porkbun)

### Ongoing Costs
- Domain renewal (`aphomeexpense.online`): **~$26/year** (Spaceship/Porkbun)
- Railway Hobby Plan: **$5/month** (already paying)
- SSL Certificate: **Free** (included with Railway)
- DNS: **Free** (included with domain registrar or Cloudflare)

### 5-Year Total Estimate
- Domain (`aphomeexpense.online`): ~$104 ($1.18-$1.96 first year + $26 × 4 years)
- Railway: $300 ($5/month × 60 months)
- **Total**: ~$404

## Next Steps

After your custom domain is set up and working:

1. ✅ Update any bookmarks or links you've shared
2. ✅ Update any documentation or README files
3. ✅ Consider setting up email forwarding (if needed)
4. ✅ Monitor Railway usage to stay within your plan limits

## Quick Reference

- **Current Frontend URL**: `https://frontend-production-93f5.up.railway.app`
- **Your Custom Domain**: `aphomeexpense.online`
- **Full URL**: `https://aphomeexpense.online`
- **Railway Dashboard**: https://railway.app
- **DNS Check Tool**: https://www.whatsmydns.net/
- **Railway Docs**: https://docs.railway.app/deploy/exposing-your-app

---

**Need Help?**
- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app
- Check Railway Status: https://status.railway.app
