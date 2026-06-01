# OYE AI - Developer Handoff Document

## Overview

OYE AI is an AI-powered business communication and customer management platform that handles customer conversations via WhatsApp, manages leads through a complete lifecycle, and provides AI-powered assistance to human operators.

---

## Architecture

### Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16 (App Router) |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Queue | BullMQ + Redis |
| AI | Langdock + OpenAI + Anthropic + Gemini failover |
| WhatsApp | Meta Cloud API |

### Project Structure

```
oye-ai/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes (46 endpoints)
│   │   ├── dashboard/         # Main dashboard
│   │   ├── admin/           # Admin panel
│   │   └── (pages)         # Landing, login, signup, etc.
│   ├── components/           # React components
│   ├── lib/
│   │   ├── services/        # Core services (AI, queue, WhatsApp)
│   │   ├── supabase/       # Supabase clients
│   │   └── auth/          # Auth utilities
│   └── styles/             # Global styles
├── supabase/
│   └── migrations/         # Database migrations
└── tests/                  # Playwright tests
```

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant businesses |
| `profiles` | User profiles |
| `memberships` | Org-user relationships with roles |
| `customers` | Customer records |
| `conversations` | WhatsApp conversation threads |
| `messages` | Individual messages |
| `conversation_notes` | Internal operator notes |
| `conversation_events` | Audit timeline |

### Lead Management

| Table | Purpose |
|-------|---------|
| `leads` | Lead records with lifecycle stages |
| `lead_notes` | Internal lead notes |
| `lead_events` | Lead activity history |

### Knowledge Base

| Table | Purpose |
|-------|---------|
| `business_info` | Organization profile |
| `services` | Service catalog |
| `pricing_packages` | Pricing tiers |
| `faq_knowledge` | FAQ entries |
| `business_policies` | Policies |

### Quality Metrics

| Table | Purpose |
|-------|---------|
| `conversation_quality` | AI analysis results |
| `appointments` | Booking records |

---

## API Routes (46 Total)

### Leads (6)
- `POST /api/leads/create` - Create lead
- `GET /api/leads/list` - List leads
- `GET /api/leads/[id]` - Get lead details
- `POST /api/leads/update-stage` - Move stage
- `POST /api/leads/notes` - Add note
- `GET /api/leads/history` - Activity timeline

### Conversations (8)
- `POST /api/conversations/claim` - Claim conversation
- `POST /api/conversations/reassign` - Reassign agent
- `POST /api/conversations/takeover` - Human takeover
- `POST /api/conversations/resolve` - Close conversation
- `POST /api/conversations/[id]/analyze` - AI analysis
- `GET /api/conversations/metrics` - Quality metrics

### Appointments (2)
- `PATCH /api/appointments/[id]/status` - Confirm/cancel
- `POST /api/appointments/[id]/reschedule` - Reschedule

### Knowledge (1)
- `GET/POST /api/knowledge/business` - CRUD business data

### Demo (1)
- `POST /api/demo/seed` - Seed demo data

### Admin (3)
- `GET /api/admin/organizations`
- `POST /api/admin/organizations/update-status`

### Webhooks (4)
- `POST /api/webhooks/whatsapp`
- `POST /api/webhooks/stripe`
- `POST /api/whatsapp/connect`

### Other (21)
- Auth, onboarding, billing, security, telemetry, queues, etc.

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
LANGDOCK_API_KEY=

# WhatsApp
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Redis
REDIS_URL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Key Features

### 1. Lead Lifecycle
- 7 stages: new → contacted → qualified → appointment_scheduled → customer → closed_won/closed_lost
- Stage progression with timeline tracking
- Lead scoring (0-100)

### 2. Conversation Quality
- AI-generated summaries
- Sentiment analysis (positive/neutral/negative/mixed)
- Lead scoring
- Intent detection
- Suggested replies

### 3. Operator Workflow
- AI/Manual mode toggle
- SLA monitoring
- Agent assignment
- Takeover from AI

### 4. Business Knowledge
- Services catalog
- Pricing packages
- FAQ knowledge base
- Policies

### 5. Booking Workflow
- Create appointments
- Confirm/cancel/reschedule
- Timeline integration

---

## Running the Project

```bash
# Install dependencies
npm install

# Run development
npm run dev

# Build for production
npm run build

# Run tests
npx playwright test

# Run migrations
npx supabase db push
```

---

## Support Contacts

- **Project Owner**: Paul Hartmann
- **Documentation**: See README.md
- **Issues**: GitHub Issues

---

## Next Steps

See `OYE_AI_NEXT_STEPS.md` for planned features and improvements.