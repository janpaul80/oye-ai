# OYE AI - Demo Script

Use this script for customer demonstrations and sales calls.

---

## Demo Setup

### Prerequisites
1. Open browser to http://localhost:3000
2. Use sandbox mode for demos (no real WhatsApp needed)

### Demo Organization
- Name: Café Delicioso
- WhatsApp: +593 99 888 7777 (demo)
- Mode: Sandbox (simulated)

---

## Demo Flow (30 minutes)

### Phase 1: Overview (3 min)

**Say:**
> "OYE AI is your autonomous customer assistant that lives in WhatsApp. It captures leads, manages conversations, books appointments, and hands off to your team when needed."

**Show:**
1. Landing page - emphasize WhatsApp integration
2. Login screen with demo option
3. Dashboard with live metrics

---

### Phase 2: Inbox & Conversations (5 min)

**Say:**
> "This is your command center. Every WhatsApp conversation appears here in real-time."

**Demo:**
1. Point out conversation list with customer names
2. Show sentiment badges (😊 positive, 😐 neutral, 😞 negative)
3. Show lead scores (🔥 85%)
4. Click a conversation to show message thread
5. Demonstrate AI responding vs manual mode

**Key features to highlight:**
- Real-time incoming messages
- AI/Manual toggle
- Sentiment badges
- Lead scoring

---

### Phase 3: Lead Management (5 min)

**Say:**
> "Every conversation becomes a lead. Track them from first contact to customer."

**Demo:**
1. Click "Leads" tab in sidebar
2. Show pipeline view with stages
3. Filter by stage (new, contacted, qualified)
4. Click a lead to show detail panel
5. Click "Advance to [next stage]" button

**Stages:**
1. 🆕 New → contacted
2. 📞 Contacted → qualified  
3. 📅 Qualified → appointment_scheduled
4. 👤 Appointment → customer
5. 💰 Customer → closed_won ❌ Customer → closed_lost

---

### Phase 4: AI Analysis (5 min)

**Say:**
> "OYE AI analyzes every conversation automatically."

**Demo:**
1. Show conversation with AI summary visible
2. Show sentiment badge
3. Show lead score
4. Show intent detection
5. Show suggested reply

**Data points:**
- AI Summary: "Cliente interesado en reservar mesa"
- Sentiment: 😊 positive
- Lead Score: 🔥 85%
- Intent: reserva
- Suggested: "Tenemos disponibilidad a las 5PM y 7:30PM"

---

### Phase 5: Business Knowledge (4 min)

**Say:**
> "Teach OYE AI about your business."

**Demo:**
1. Navigate to Setup or Settings
2. Show Services catalog
3. Show FAQ entries
4. Show Pricing packages
5. Show Policies

**Explain:**
> "The AI uses this knowledge to answer customer questions accurately."

---

### Phase 6: Bookings (4 min)

**Say:**
> "Appointments are tracked end-to-end."

**Demo:**
1. Show booking in conversation
2. Show appointment record
3. Demo: confirm/cancel/reschedule APIs exist
4. Show appointment timeline

---

### Phase 7: Analytics & Quality (4 min)

**Say:**
> "Understand your business at a glance."

**Demo:**
1. Show AI Operations → Telemetry tab
2. Show sentiment distribution
3. Show lead score distribution
4. Show conversion opportunities

---

## Demo Data

To reset demo data:

```bash
# Seed fresh demo data
POST /api/demo/seed
Body: { "orgId": "your-org-id" }
```

---

## Key Talking Points

| Feature | Value Proposition |
|---------|---------------|
| WhatsApp | Customers already use it - no adoption needed |
| AI Automation | 24/7 response, never miss a lead |
| Lead Tracking | Clear pipeline, no lost leads |
| Handoff | Seamless to human when needed |
| Analytics | Data-driven decisions |

---

## Objection Handling

| Objection | Response |
|----------|----------|
| "Can it handle Spanish?" | Yes, Spanish is primary, also English/Portuguese |
| "What about complex questions?" | AI escalates to your team automatically |
| "Is my data secure?" | Yes, RLS policies, role-based access |
| "How much does it cost?" | Let's discuss pricing after the demo |

---

## Demo End

**Say:**
> "Any questions? Would you like to see it integrated with your WhatsApp business number?"

**Next steps:**
1. Schedule technical deep-dive
2. Share pricing
3. Plan pilot

---

## Quick Demo Checklist

- [ ] Landing page loads
- [ ] Login works (sandbox mode)
- [ ] Dashboard shows metrics
- [ ] Inbox shows conversations
- [ ] Sentiment badges visible
- [ ] Lead scores visible
- [ ] Leads tab shows pipeline
- [ ] Stage progression works
- [ ] Knowledge base accessible
- [ ] Analytics show data