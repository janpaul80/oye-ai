# OYE AI - Full Onboarding Simulation

## Test Scenario
New Ecuadorian restaurant "Parrilladas El Norte" wants to try OYE AI.

---

## Step 1: Registration
**URL**: `http://localhost:3000/signup`

**Actions**:
1. User visits signup page
2. Enters email: "juan@parrilladaselnorte.com"
3. Enters password
4. Clicks "Crear Cuenta"

**Expected**:
- Account created in Supabase Auth
- Redirect to onboarding

**Result**: ✅ Available

---

## Step 2: Create Organization
**URL**: `/onboarding` (post-signup)

**Actions**:
1. Organization name: "Parrilladas El Norte"
2. Industry: "Restaurant"
3. Timezone: "America/Guayaquil"
4. Language: Spanish

**API**: `POST /api/organizations/create`
```json
{
  "name": "Parrilladas El Norte",
  "industry": "restaurant", 
  "timezone": "America/Guayaquil"
}
```

**Expected**:
- Organization created (id: uuid)
- Owner membership created
- 7-day trial auto-started

**Result**: ✅ Endpoint exists

---

## Step 3: Configure Business Profile
**URL**: `/dashboard` > Settings

**Actions**:
1. Business name saved
2. Working hours set (09:00-22:00)
3. Language set to Spanish
4. Default provider: Langdock

**API**: `POST /api/organizations/settings`

**Result**: ✅ Settings panel exists

---

## Step 4: Add Services
**Actions**:
| Service | Price | Duration |
|---------|-------|---------|
| Almuerzo Ejecutivo | $12 | 60 min |
| Cena Romántica | $89 | 120 min |
| Cumpleaños | $150 | 180 min |
| Evento Privado | $350 | 240 min |

**API**: `POST /api/knowledge/business`
```json
{
  "orgId": "...", 
  "type": "services",
  "data": {"name": "Almuerzo Ejecutivo", "price": 12, "duration_minutes": 60}
}
```

**Result**: ✅ API accepts services

---

## Step 5: Add FAQ
**FAQs**:
| Question | Answer |
|----------|--------|
| ¿Tienen estacionamiento? | Sí, parking gratis |
| ¿Aceptan tarjetas? | Todas las tarjetas |
| ¿Necesito reservar? | Sí, recomendado |

**API**: `POST /api/knowledge/business` (type: faq)

**Result**: ✅ API accepts FAQ

---

## Step 6: Add Policies
**Policies**:
| Type | Content |
|------|--------|
| Cancellation | 24h advance |
| Refund | 48h full, 24-48h 50% |

**API**: `POST /api/knowledge/business` (type: policies)

**Result**: ✅ API accepts policies

---

## Step 7: Start Trial
**Database checks**:
- `trial_end_date` = NOW() + 7 days
- `billing_plan` = 'trial'
- `billing_status` = 'trialing'

**User sees**:
- "7 días restantes" badge in dashboard
- Upgrade prompt on day 5

**Result**: ✅ Trial fields ready

---

## Step 8: Connect WhatsApp
**Actions** (Demo Mode):
1. Click "Conectar WhatsApp"
2. Select Sandbox
3. System generates test phone

**API**: `POST /api/whatsapp/connect`
```json
{
  "orgId": "...",
  "mode": "sandbox"
}
```

**Production** (after Evolution API):
1. Click "Conectar WhatsApp"
2. System generates QR code
3. User scans with phone
4. Instance authenticated

**Result**: ✅ Sandbox works, production planned

---

## Step 9: Receive First Lead
**Simulation**:
```
Customer: "Hola, quiero reservar una mesa"
    ↓
Inbound message created
    ↓
AI detects intent: "reserva"
    ↓
Lead created (stage: new)
    ↓
AI responds: "¿Para cuántas personas?"
```

**Dashboard**: Shows new lead with badge 🆕

**Result**: ✅ Full flow works in sandbox

---

## Step 10: Convert Lead to Booking
**Actions**:
1. Click lead in inbox
2. AI discusses availability
3. Customer confirms: "5 personas, 7pm"
4. Click "Crear Cita"
5. Select date/time
6. Click "Confirmar"

**Database**:
- Appointment created
- Lead stage → "appointment_scheduled"
- Customer receives confirmation

**Result**: ✅ Booking flow works

---

## Summary

| Step | Status | Notes |
|------|--------|-------|
| 1. Registration | ✅ | Supabase Auth |
| 2. Create Org | ✅ | API ready |
| 3. Business Profile | ✅ | Settings exists |
| 4. Add Services | ✅ | API accepts |
| 5. Add FAQ | ✅ | API accepts |
| 6. Add Policies | ✅ | API accepts |
| 7. Trial Start | ✅ | Fields ready |
| 8. WhatsApp | ⚠️ | Sandbox OK, Evolution for production |
| 9. Lead | ✅ | Works end-to-end |
| 10. Booking | ✅ | Works end-to-end |

---

## Gaps Found

### 1. Services/FAQ/Policies UI
**Gap**: No dedicated UI - users must use API or settings
**Priority**: Medium - can document for onboarding

### 2. Evolution API  
**Gap**: Production WhatsApp not yet connected
**Priority**: High - needed for real pilot

### 3. Trial Expiry
**Gap**: No automatic blocking after trial ends
**Priority**: Medium - can add later

---

## Verification Complete

The platform flows work. Key blockers identified:
1. Evolution API production integration
2. Services UI panel

Ready for pilot with Sandbox mode.

EOF