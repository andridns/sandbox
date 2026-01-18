# Custom Domain Setup Checklist

Use this checklist to track your progress when setting up a custom domain.

## Pre-Setup

- [ ] Reviewed domain options and pricing in `CUSTOM_DOMAIN_SETUP.md`
- [ ] Decided on domain name and TLD (.xyz, .online, .site, etc.)
- [ ] Chose domain registrar (Spaceship, Porkbun, or NameSilo recommended)

## Domain Registration

- [ ] Registered domain with chosen registrar
- [ ] Enabled WHOIS privacy protection (free at recommended registrars)
- [ ] Saved domain registrar login credentials securely
- [ ] Confirmed domain registration email

## Railway Configuration

- [ ] Logged into Railway dashboard
- [ ] Selected frontend service
- [ ] Navigated to Settings → Networking → Public Networking
- [ ] Added custom domain in Railway
- [ ] Copied Railway's CNAME record value
- [ ] Domain shows as "Pending" in Railway (expected until DNS is configured)

## DNS Configuration

- [ ] Logged into domain registrar's DNS management panel
- [ ] Added CNAME record:
  - [ ] Name/Host: `@` or blank (for root domain)
  - [ ] Type: `CNAME`
  - [ ] Value: Railway's CNAME value (e.g., `g05ns7.up.railway.app`)
  - [ ] TTL: 3600 or default
- [ ] Saved DNS record
- [ ] (If needed) Set up Cloudflare DNS for root domain CNAME support

## DNS Propagation

- [ ] Waited for DNS propagation (5 minutes to 48 hours)
- [ ] Checked DNS propagation status at https://www.whatsmydns.net/
- [ ] Verified Railway domain status changed from "Pending" to "Active"
- [ ] Confirmed SSL certificate is provisioned (green padlock in browser)

## Backend Configuration

- [ ] Logged into Railway backend service
- [ ] Navigated to Variables tab
- [ ] Updated `ALLOWED_ORIGINS` to include new custom domain:
  ```
  ALLOWED_ORIGINS=https://your-new-domain.xyz,https://frontend-production-93f5.up.railway.app
  ```
- [ ] Verified backend redeployed automatically
- [ ] (Optional) Removed old Railway domain from `ALLOWED_ORIGINS` after testing

## Google OAuth Configuration (If Using)

- [ ] Logged into Google Cloud Console
- [ ] Selected correct project
- [ ] Navigated to APIs & Services → Credentials
- [ ] Opened OAuth 2.0 Client ID
- [ ] Added custom domain to Authorized JavaScript origins
- [ ] Added custom domain to Authorized redirect URIs
- [ ] Saved changes

## Testing

- [ ] Opened new custom domain in browser: `https://your-new-domain.xyz`
- [ ] Verified site loads correctly
- [ ] Verified SSL certificate is valid (green padlock)
- [ ] Tested login functionality
- [ ] Checked browser console for errors
- [ ] Verified API calls work (no CORS errors)
- [ ] Tested Google OAuth (if enabled)
- [ ] Tested all major app features

## Post-Setup

- [ ] Updated any bookmarks
- [ ] Updated any shared links
- [ ] Updated documentation/README if needed
- [ ] Verified old Railway domain still works (if kept in CORS)
- [ ] Monitored Railway usage and costs

## Troubleshooting (If Needed)

- [ ] Checked DNS records are correct
- [ ] Verified DNS propagation completed
- [ ] Checked Railway domain status
- [ ] Verified `ALLOWED_ORIGINS` includes new domain
- [ ] Checked Google OAuth URIs are updated
- [ ] Cleared browser cache and cookies
- [ ] Checked Railway logs for errors
- [ ] Consulted `CUSTOM_DOMAIN_SETUP.md` troubleshooting section

---

**Current Status**: 
- Domain: _______________________
- Registrar: _______________________
- Railway Domain Status: _______________________
- SSL Certificate: _______________________
- Testing Status: _______________________

**Notes**:
_________________________________________________
_________________________________________________
_________________________________________________
