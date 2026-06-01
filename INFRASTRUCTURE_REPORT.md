# OYE AI - Infrastructure Report

## Current Status: Local Development

### Development Environment

The codebase shows **local development configuration** - this is run from `C:\Users\hartm\oye-ai` on a Windows machine (based on path).

```
Local Development Stack:
├── Next.js 16 (dev: npm run dev)
├── Supabase Local (port 54321)
├── Redis (port 6379 - local fallback)
└── Local file storage
```

---

## Production Deployment Requirements

### Not Yet Deployed

OYE AI is **NOT currently deployed to production**. The code is ready but needs a VPS/server to run.

---

## What's Needed for Production

### 1. VPS Requirements

| Component | Specification | Estimated Cost |
|-----------|-------------|--------------|
| **Server** | 2 CPU, 4GB RAM, 50GB SSD | ~$15/month |
| **Domain** | oye-ai.com | ~$12/year |
| **SSL** | Let's Encrypt (free) | $0 |
| **Evolution API** | Same or separate VPS | ~$15/month |

### 2. Docker-Compose Services Defined

```yaml
services:
  redis:           # Rate limiting + cache (256MB)
  web:            # Next.js app
  worker:         # Background queue (BullMQ)
  nginx:         # Reverse proxy + SSL
```

### 3. Environment Variables Required

```env
# Supabase (production)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers
BLACKBOX_API_KEY=
LANGDOCK_API_KEY=

# Stripe
STRIPE_SECRET_KEY=

# Evolution API (for WhatsApp)
EVOLUTION_API_URL=
EVOLUTION_API_KEY=

# Domain
NEXT_PUBLIC_APP_URL=https://oye-ai.com
```

---

## DNS Configuration Needed

When deploying to production:

| Record | Type | Target |
|--------|------|-------|
| oye-ai.com | A | Server IP |
| www.oye-ai.com | A | Server IP |

---

## Recommended Deployment Architecture

### Option A: Single VPS (Development → Pilot)

```
VPS ($15/mo):
├── OYE AI (Next.js + Redis + Worker)
├── Evolution API (Docker container)
└── Nginx (reverse proxy)
```

### Option B: Separate Evolution API (Production)

```
VPS 1 ($15/mo):
└── OYE AI (Next.js + Redis + Worker + Nginx)

VPS 2 ($15/mo):
└── Evolution API (Docker container)
```

---

## Next Steps to Deploy

1. **Provision VPS** (DigitalOcean/Linode/Vultr)
2. **Configure DNS** (A records for oye-ai.com)
3. **Deploy OYE AI** (docker-compose up)
4. **Deploy Evolution API** (docker run)
5. **Verify SSL** (certbot)
6. **Configure env vars** (production keys)

---

## Current Assets

| Asset | Location |
|--------|---------|
| Docker Compose | `docker-compose.yml` (ready) |
| Evolution Plan | `EVOLUTION_API_IMPLEMENTATION.md` |
| Server Checklist | `server_checklist.md` exists |
| Domain | oye-ai.com (needs DNS) |
| SSL | Not configured |

---

## Infrastructure Decision Required

**Question**: What VPS provider should we use for production/OYE AI deployment?

Once a server is provisioned, I can provide:
- Docker deployment commands
- Environment configuration
- DNS verification
- SSL setup

EOF