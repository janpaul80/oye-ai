# OYE AI - Evolution API Integration Plan

## Overview
Evolution API is a WhatsApp Business API that runs self-hosted. It provides full WhatsAppCloud API functionality without Meta approval requirements.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     OYE AI Platform                        │
├─────────────────────────────────────────────────────────────┤
│  Dashboard  │  API Routes  │  AI Services               │
├─────────────────────────────────────────────────────────────┤
│              Webhook Handler (POST /api/webhooks/whatsapp)        │
├─────────────────────────────────────────────────────────────┤
│              Evolution API Client                          │
├──────────────┬──────────────┬────────────────────────────┤
│   Instance   │   Instance  │   Instance (per org)      │
│   Manager   │   Manager   │                          │
└──────┬──────┴─────┬──────┴──────────┬─────────────────┘
       │            │                 │
       ▼            ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Evolution API (Docker)                            │
│              WhatsApp Business Connection                       │
│              - Send/Receive Messages                        │
│              - Media Upload/Download                        │
│              - Groups, Labels, Reactions                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Deployment Plan

### 1. Docker Setup
```yaml
# docker-compose.yml
version: '3.8'
services:
  evolution:
    image: atendai/evolution-api:latest
    ports:
      - "8080:8080"
    environment:
      - SERVER_TYPE=embedded
      - AUTHENTICATION_API_KEYS=[your-api-keys]
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
    volumes:
      - evolution_data:/evolution/instance

volumes:
  evolution_data:
```

### 2. Single Instance (MVP)
- One Evolution API instance
- Multiple authenticated sessions (one per organization)
- Simple API key authentication

### 3. Production Scale
- Multiple Evolution API instances (one per 10 orgs)
- Load balancer
- PostgreSQL for state

---

## Webhook Integration

### Incoming Messages
```
WhatsApp → Evolution API → Webhook → OYE AI Processing
                      ↓
              POST /api/webhooks/whatsapp
                      ↓
        - Detect customer (phone number lookup)
        - Detect intent
        - Route to AI/Agent
        - Generate response
        - Send back via Evolution API
```

### OYE AI → Evolution API
```typescript
// Sending a message
POST /api/send-message
{
  instanceId: "org-123",
  phone: "+593990000000",
  message: "Hola, bienvenido a..."
}
```

---

## Multi-Tenant Strategy

### Per-Organization Instance
Each organization gets:
- Unique `instanceId` 
- API key for authentication
- QR code for phone pairing
- Independent session storage

### Instance Manager
```typescript
interface InstanceManager {
  async createInstance(orgId: string): Promise<Instance>;
  async getInstance(orgId: string): Promise<Instance | null>;
  async deleteInstance(orgId: string): Promise<void>;
  async reconnectInstance(orgId: string): Promise<void>;
}
```

### QR Onboarding Flow
```
1. Org connects WhatsApp in Settings
2. System creates Evolution instance  
3. System returns QR code
4. User scans with WhatsApp
5. Instance becomes authenticated
6. Ready for messages
```

---

## Integration Points

### 1. WhatsApp Connect API
- POST /api/whatsapp/connect
- Creates Evolution instance
- Returns QR code URL

### 2. Send Message API  
- POST /api/webhooks/whatsapp (existing)
- Uses Evolution API to send

### 3. Webhook Handler
- POST /api/webhooks/whatsapp (existing)
- Receives from Evolution API
- Processes and responds

### 4. Instance Management
- GET /api/whatsapp/status - Connection status
- POST /api/whatsapp/logout - Disconnect

---

## Supported Features

| Feature | Status |
|---------|-------|
| Send/Receive Text | ✅ |
| Media (Image/Audio/Video) | ✅ |
| Location Messages | ✅ |
| Message Reactions | ✅ |
| Group Management | ✅ |
| Rich Templates | ✅ |
| Quick Replies | ✅ |
| Labels | ✅ |

---

## Cost Estimation

### Self-Hosted (MVP)
- **VPS**: $10-20/month (DigitalOcean)
- **Evolution API**: Free (open source)
- **Total**: ~$15/month

### Managed Option
- **Mana AI**: ~$15/month per instance
- Includes hosting + support

---

## Implementation Timeline

### Phase 1: MVP (Week 1)
- [ ] Deploy Evolution API to VPS
- [ ] Implement instance management
- [ ] Connect webhook to OYE AI
- [ ] Test send/receive

### Phase 2: Multi-Tenant (Week 2)  
- [ ] Instance isolation
- [ ] QR code flow
- [ ] Connection status UI
- [ ] Error handling

### Phase 3: Production (Week 3)
- [ ] Monitoring
- [ ] Rate limiting
- [ ] Failover
- [ ] Scaling plan

---

## Migration from Sandbox

Currently: Sandbox mode simulates WhatsApp
After: Real WhatsApp via Evolution API

Same dashboard, same AI, real messages.

EOF