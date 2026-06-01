# OYE AI - Pricing Strategy (Launch)

## Launch Pricing

### Free Trial - 7 Days
- No credit card required
- Full platform access
- Inbox, Leads, AI Responses, Knowledge Base, Bookings, Analytics
- Demo organizations pre-loaded
- After 7 days → prompt to upgrade

### Basic - $25/month
- 1 Business organization
- Lead Management
- AI Responses (limit: 200/month)
- Inbox
- Booking Management
- Business Knowledge Base
- Basic Analytics

### Pro - $49.99/month
Everything in Basic +:
- Unlimited AI Responses
- Advanced Analytics
- Lead Scoring
- Sentiment Analysis
- Priority Support
- Voice AI eligibility (future)

### Business - Coming Soon
- Not launching yet
- Show "Coming Soon" placeholder

---

## Stripe Integration

### Products (to create)
- Basic Plan: price_basic_xxx ($25/month)
- Pro Plan: price_pro_xxx ($49.99/month)

### Trial Support
- 7-day free trial in Stripe
- No credit card: track in database, not Stripe

### Billing Flow
1. User signs up → Free tier
2. 7-day trial starts
3. Day 5 → Prompt to upgrade
4. Day 7 without upgrade → Read-only mode
5. User subscribes → Full access restored

---

## Implementation

### Database
- `organizations.trial_end_date` - When trial expires
- `organizations.trial_converted` - If converted to paid
- `organizations.stripe_customer_id` - Stripe customer
- `organizations.stripe_subscription_id` - Active sub

### API Endpoints
- POST /api/billing/subscribe - Create subscription
- POST /api/billing/cancel - Cancel subscription
- GET /api/billing/status - Current status

### Webhook
- POST /api/webhooks/stripe - Handle subscription events

EOF