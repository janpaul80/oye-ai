# OYE AI - Evolution API Implementation Plan

## Overview

Evolution API is a self-hosted WhatsApp Business API that connects to WhatsApp without Meta approval requirements.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    OYE AI Platform                         │
├──────────────────────────────────────────────────────────┤
│  API Routes (Next.js)                                      │
│  ├── /api/webhooks/whatsapp ← Messages in                   │
│  ├── /api/whatsapp/connect ← Instance management            │
│  └── /api/messages ← Send messages out                    │
├──────────────────────────────────────────────────────────┤
│  Evolution API Client (lib/services/whatsapp.ts)                 │
│  ├── Instance Manager                                      │
│  ├── Session Manager                                    │
│  └── Message Handler                                   │
└────────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│              Evolution API (Docker)                          │
│  └── WhatsApp Sessions (One per organization)            │
└──────────────────────────────────────────────────────────┘
```

---

## Deployment Plan

### Step 1: Server Requirements
- **VPS**: 2 CPU, 4GB RAM, 50GB SSD (~$15/month)
- **Domain**: api.oye-ai.com (or subdomain)
- **SSL**: Let's Encrypt (auto)

### Step 2: Docker Installation
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Create volume
docker volume create evolution_data

# Run Evolution API
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -v evolution_data:/evolution/instance \
  -e SERVER_TYPE=embedded \
  -e DATABASE_ENABLED=true \
  -e DATABASE_PROVIDER=postgresql \
  -e POSTGRES_HOST=$POSTGRES_HOST \
  -e POSTGRES_USER=$POSTGRES_USER \
  -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  atendai/evolution-api:latest
```

### Step 3: Environment Variables
```env
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=your-generated-key
EVOLUTION_INSTANCE_LIMIT=100
```

---

## Integration Architecture

### File Structure
```
oye-ai/
├── src/
│   └── lib/
│       └── services/
│           ├── whatsapp-evolution.ts  (NEW)
│           └── whatsapp.ts       (UPDATE - add provider)
├── src/
│   └── app/
│       └── api/
│           └── whatsapp/
│               ├── connect/route.ts      (UPDATE)
│               ├── send/route.ts       (NEW)
│               └── instance/route.ts   (NEW)
```

### Instance Management

For each organization:
```typescript
interface WhatsAppInstance {
  orgId: string;
  instanceName: string;        // "oye-${orgId}"
  phoneNumber: string;       // "+593990000000"
  status: 'pending' | 'connected' | 'disconnected';
  qrCode?: string;
  connectedAt?: Date;
}
```

### QR Onboarding Flow
```
1. Org clicks "Connect WhatsApp"
2. POST /api/whatsapp/connect
3. Evolution API creates instance "oye-${orgId}"
4. Returns QR code URL
5. User scans with WhatsApp
6. Webhook receives connection event
7. Update status to "connected"
8. Start receiving messages
```

### Message Routing Flow
```
WhatsApp message received
    ↓
POST /api/webhooks/whatsapp
    ↓
- Lookup customer by phone
- Detect language
- Route to OYE AI
    ↓
Generate AI response
    ↓
POST /api/whatsapp/send
    ↓
Evolution API → WhatsApp
```

---

## Multi-Tenant Strategy

### Instance Isolation
- One Evolution instance per organization
- Instance name: `oye-${orgId}`
- API key per instance (generated)
- Database-level isolation in Supabase

### Rate Limits
- Per instance: 1000 messages/day
- Per organization: configurable in OYE AI settings

### Failover
- If Evolution API down → Show "Demo Mode" fallback
- Auto-reconnect on restore

---

## Production Deployment Checklist

### Pre-Deploy
- [ ] VPS provisioned with Docker
- [ ] Domain configured
- [ ] SSL certificate
- [ ] PostgreSQL database
- [ ] Evolution API deployed
- [ ] API keys generated

### Configuration
- [ ] EVOLUTION_API_URL in .env
- [ ] EVOLUTION_API_KEY in .env
- [ ] Webhook URL at Evolution API config

### Testing
- [ ] Single instance connect
- [ ] QR code scan
- [ ] Send message
- [ ] Receive message
- [ ] Multi-tenant isolation

### Production
- [ ] Monitoring setup
- [ ] Alerting configured
- [ ] Auto-restart policy
- [ ] Backup strategy

---

## Migration from Sandbox

Current: Demo Mode (simulated messages)
After: Real WhatsApp via Evolution API

Same dashboard, same AI, real messages.

---

## Cost

| Item | Cost |
|------|-----|
| VPS (DigitalOcean) | $15/month |
| Domain | $12/year |
| Evolution API | Free |
| **Total** | ~$27/month |

vs. WhatsApp Cloud API: $10K+/year

---

## Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Deploy Evolution | 1 day | Docker + config |
| Single Org Test | 1 day | Internal |
| Multi-Tenant | 2 days | Instance mgmt |
| Production | 2 days | Monitoring |

Total: ~1 week for full integration

---

## Fallback Strategy

If Evolution API unavailable:
- Enable Demo Mode
- Show banner to users
- Queue messages for retry

EOF