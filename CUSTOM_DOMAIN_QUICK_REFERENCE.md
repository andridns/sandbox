# Custom Domain Quick Reference

## Quick Cost Summary

| Item | Cost | Frequency |
|------|------|-----------|
| Domain Registration (`aphomeexpense.xyz`) | ~$2.06 | First year |
| Domain Renewal (`aphomeexpense.xyz`) | ~$11.84 ✅ | Per year |
| Railway Hobby Plan | $5 | Per month (already paying) |
| SSL Certificate | Free | Included with Railway |
| DNS | Free | Included with registrar |

**Total First Year**: ~$2.06 + existing Railway costs  
**5-Year Total**: ~$349 (domain + Railway)  
**Savings**: $55 over 5 years compared to .online!

## Your Domain

**Selected Domain**: `aphomeexpense.xyz` ⭐

**Recommended Registrar:**
- **Porkbun** (https://porkbun.com/) - ~$2.06 first year, ~$11.84 renewal ⭐
- **Spaceship** (https://www.spaceship.com/) - ~$2.06 first year, ~$12.52 renewal (alternative)

## Quick Setup Steps

1. **Register Domain** → Choose registrar, search and register
2. **Add Domain in Railway** → Settings → Networking → Custom Domain
3. **Configure DNS** → Add CNAME record at registrar
4. **Wait for Propagation** → 5 minutes to 48 hours
5. **Update Backend CORS** → Railway → Backend → Variables → `ALLOWED_ORIGINS`
6. **Update Google OAuth** → Google Cloud Console → Add authorized URIs
7. **Test** → Open domain in browser and verify everything works

## Key Configuration Points

### Railway Backend CORS
```
ALLOWED_ORIGINS=https://aphomeexpense.xyz,https://frontend-production-93f5.up.railway.app
```

### Google OAuth (if using)
- Authorized JavaScript origins: `https://aphomeexpense.xyz`
- Authorized redirect URIs: `https://aphomeexpense.xyz`

### DNS CNAME Record
- Name: `@` (or blank)
- Type: `CNAME`
- Value: Railway's CNAME (e.g., `g05ns7.up.railway.app`)

## Useful Links

- **Railway Dashboard**: https://railway.app
- **DNS Check Tool**: https://www.whatsmydns.net/
- **Railway Docs**: https://docs.railway.app/deploy/exposing-your-app
- **Railway Status**: https://status.railway.app

## Documentation Files

- **Personalized Setup Guide**: `APHOMEEXPENSE_SETUP.md` ⭐ **Start here!**
- **Renewal Cost Alternatives**: `DOMAIN_RENEWAL_ALTERNATIVES.md` ⭐ **Check this for cheaper options!**
- **Full Setup Guide**: `CUSTOM_DOMAIN_SETUP.md`
- **Checklist**: `CUSTOM_DOMAIN_CHECKLIST.md`
- **Google OAuth Guide**: `GOOGLE_OAUTH_SETUP.md`

## Current Configuration

- **Current Frontend URL**: `https://frontend-production-93f5.up.railway.app`
- **Your Custom Domain**: `aphomeexpense.xyz`
- **Full URL**: `https://aphomeexpense.xyz`
- **Railway Plan**: Hobby Plan ($5/month)
- **Custom Domains Allowed**: Up to 2 per service

---

**Next Step**: Register `aphomeexpense.xyz` at Porkbun and follow `APHOMEEXPENSE_SETUP.md`!
