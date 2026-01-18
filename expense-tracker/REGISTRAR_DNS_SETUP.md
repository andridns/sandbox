# DNS Setup Using Registrar Interface (Porkbun/Spaceship)

If you're using your registrar's DNS interface (not Cloudflare's native dashboard), follow these instructions.

## The Problem

When you try to add a CNAME record for the root domain (`@`), you'll see this error:
> "Sorry, you can't have a CNAME on the root domain. It violates RFC... You probably want to use an ALIAS record instead."

This is because DNS standards don't allow CNAME records on root domains. However, your registrar likely supports **ALIAS records** which solve this problem.

## Solution: Use ALIAS Record

### Step-by-Step Instructions

1. **Log into your registrar** (Porkbun or Spaceship)
2. **Go to DNS Management**:
   - Porkbun: Domain → DNS Records
   - Spaceship: Domain → DNS Settings
3. **Add a new DNS record**:
   - **Type**: Select `ALIAS` (or `ANAME` if that's what your registrar calls it)
   - **Name/Host**: `@` (or leave blank for root domain)
   - **Value/Target**: Enter Railway's CNAME value (e.g., `sydsdrsm.up.railway.app`)
   - **TTL**: `3600` (or default)
4. **Click "Add" or "Save"**

### What is an ALIAS Record?

- ALIAS records work like CNAME records but can be used on root domains
- They automatically resolve to the correct IP addresses
- They're supported by many modern DNS providers
- They're perfect for pointing root domains to services like Railway

## Visual Guide

**Correct Setup:**
```
Type: ALIAS (or ANAME)
Name: @ (or blank)
Target: sydsdrsm.up.railway.app
TTL: 3600
```

**Incorrect (Will Cause Error):**
```
Type: CNAME ❌
Name: @
Target: sydsdrsm.up.railway.app
```

## Where is the Orange Cloud Icon?

**Important**: The orange cloud icon is only visible in Cloudflare's native dashboard (https://dash.cloudflare.com/), not in your registrar's interface.

If your registrar interface says "Powered by Cloudflare", it means:
- ✅ Cloudflare is handling DNS resolution
- ❌ But you're not in Cloudflare's dashboard
- ❌ So you won't see the orange cloud icon

## Alternative Solutions

### Option 1: Use ALIAS Record (Recommended) ✅
- Simplest solution
- Works with your current registrar
- No need to change anything

### Option 2: Switch to Cloudflare's Native Dashboard
- Requires changing nameservers
- Gives you access to orange cloud icon
- See `CLOUDFLARE_DNS_SETUP.md` for instructions

### Option 3: Use a Subdomain
- Use `www.aphomeexpense.xyz` instead of `aphomeexpense.xyz`
- Add CNAME record for `www` subdomain
- Update Railway to use the subdomain

## Troubleshooting

### Error: "An A, AAAA, ALIAS, or CNAME record with that host already exists"

**This means there's already a DNS record for the root domain (`@`).**

**Solution: Edit or Delete the Existing Record**

1. **Find the existing record:**
   - Look in your DNS records list for any record with:
     - **Name/Host**: `@` (or blank/root domain)
     - **Type**: A, AAAA, ALIAS, or CNAME

2. **Option A: Edit the existing record** (Recommended)
   - Click on the existing record to edit it
   - Change the **Type** to `ALIAS` (if it's not already)
   - Update the **Target/Value** to: `sydsdrsm.up.railway.app`
   - Update **TTL** to `3600` (if needed)
   - Click **"Save"** or **"Update"**

3. **Option B: Delete and recreate**
   - Delete the existing record
   - Wait a few minutes
   - Add the new ALIAS record as described in Step 3 above

**Common existing records to look for:**
- Default A record pointing to `127.0.0.1` or placeholder IP
- Default AAAA record (IPv6)
- Old CNAME record
- Previous ALIAS record

### I Don't See ALIAS as an Option

Some registrars call it different names:
- **ALIAS** (most common)
- **ANAME** (some registrars)
- **CNAME Flattening** (automatic in some cases)

If you don't see any of these options:
1. Check your registrar's documentation
2. Contact your registrar's support
3. Consider switching to Cloudflare's native dashboard
4. Or use a subdomain instead

### Domain Status Stays "Pending" in Railway

- Verify the ALIAS record is saved correctly
- Check that the target matches exactly: `sydsdrsm.up.railway.app`
- Wait 5-30 minutes for DNS propagation
- Check DNS propagation: https://www.whatsmydns.net/#CNAME/aphomeexpense.xyz

### Still Having Issues?

1. **Check for existing records** - Delete or edit any conflicting records
2. **Double-check the record type** - Must be ALIAS, not CNAME
3. **Verify the target** - Must match Railway's CNAME exactly
4. **Wait for propagation** - DNS changes can take up to 30 minutes
5. **Check Railway dashboard** - Domain should show "Active" when ready

## Quick Reference

- **Railway CNAME**: `sydsdrsm.up.railway.app` (from Railway dashboard)
- **Record Type**: `ALIAS` (not CNAME)
- **Name**: `@` (or blank)
- **DNS Check**: https://www.whatsmydns.net/#CNAME/aphomeexpense.xyz

---

**Remember**: Use ALIAS record, not CNAME, when setting up root domain DNS through your registrar!
