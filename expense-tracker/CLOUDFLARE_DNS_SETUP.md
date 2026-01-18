# Cloudflare DNS Setup for aphomeexpense.xyz

If you're using Cloudflare DNS and encountering the "CNAME on root domain" error, follow these steps.

## The Problem

Cloudflare (and DNS in general) doesn't allow CNAME records directly on root domains (`@`) because it violates RFC standards. However, Cloudflare has a solution!

## The Solution: Enable Cloudflare Proxy (CNAME Flattening)

Cloudflare automatically flattens CNAME records at the root domain when the **proxy is enabled** (orange cloud). This converts the CNAME to A/AAAA records automatically.

## Step-by-Step Instructions

### Step 1: Add the CNAME Record

1. Log into **Cloudflare Dashboard**: https://dash.cloudflare.com/
2. Select your domain: `aphomeexpense.xyz`
3. Go to **DNS** → **Records**
4. Click **"Add record"**

### Step 2: Configure the Record

Fill in the form:
- **Type**: Select `CNAME`
- **Name**: Enter `@` (for root domain)
- **Target**: Enter Railway's CNAME value (e.g., `sydsdrsm.up.railway.app`)
- **Proxy status**: **Click the orange cloud** ✅ **This is critical!**

**Important**: The orange cloud icon means "Proxied" - this enables Cloudflare's automatic CNAME flattening.

### Step 3: Save and Verify

1. Click **"Save"**
2. The record should appear with an **orange cloud** icon
3. Wait 5-30 minutes for DNS propagation
4. Check Railway dashboard - domain status should change to "Active"

## Visual Guide

**Correct Setup:**
```
Type: CNAME
Name: @
Target: sydsdrsm.up.railway.app
Proxy: 🟠 Orange Cloud (Proxied) ✅
```

**Incorrect Setup (Will Cause Error):**
```
Type: CNAME
Name: @
Target: sydsdrsm.up.railway.app
Proxy: ⚪ Gray Cloud (DNS only) ❌
```

## Why This Works

When you enable Cloudflare's proxy (orange cloud):
1. Cloudflare automatically flattens the CNAME record
2. It converts it to A/AAAA records behind the scenes
3. Your root domain works correctly
4. You get Cloudflare's CDN benefits (faster loading, DDoS protection)

## Troubleshooting

### Still Seeing the Error?

1. **Make sure the orange cloud is enabled** - This is the most common issue
2. **Delete any existing A or AAAA records** for `@` - They conflict with CNAME
3. **Wait a few minutes** - DNS changes take time to propagate
4. **Check Railway dashboard** - It should show "Active" once DNS is detected

### Domain Status Stays "Pending" in Railway

- Verify the CNAME record is saved correctly in Cloudflare
- Ensure the orange cloud (proxy) is enabled
- Check that the target matches exactly: `sydsdrsm.up.railway.app`
- Wait up to 30 minutes for DNS propagation
- Check DNS propagation: https://www.whatsmydns.net/#CNAME/aphomeexpense.xyz

### Want to Disable Cloudflare Proxy Later?

You can switch to gray cloud (DNS only) after setup, but Railway's CNAME flattening should work. However, keeping the proxy enabled gives you:
- ✅ Faster page loads (CDN)
- ✅ DDoS protection
- ✅ SSL/TLS encryption
- ✅ Better performance

## Alternative: Use a Subdomain

If you prefer not to use Cloudflare proxy, you can use a subdomain instead:

1. Add CNAME record:
   - **Type**: `CNAME`
   - **Name**: `www` (or any subdomain)
   - **Target**: `sydsdrsm.up.railway.app`
   - **Proxy**: Can be gray or orange

2. Update Railway to use `www.aphomeexpense.xyz` instead of `aphomeexpense.xyz`

**Note**: This means your site will be at `https://www.aphomeexpense.xyz` instead of `https://aphomeexpense.xyz`.

## Quick Reference

- **Railway CNAME**: `sydsdrsm.up.railway.app` (from Railway dashboard)
- **Cloudflare Dashboard**: https://dash.cloudflare.com/
- **DNS Check**: https://www.whatsmydns.net/#CNAME/aphomeexpense.xyz
- **Key**: Enable orange cloud (Proxied) for CNAME flattening!

---

**Remember**: The orange cloud icon is your friend! It enables CNAME flattening automatically.
