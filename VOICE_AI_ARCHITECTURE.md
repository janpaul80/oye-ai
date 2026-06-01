# OYE AI - Voice AI Architecture

## Overview

Voice AI enables customers to send voice notes via WhatsApp and receive AI voice responses.

**Tier Access**: Pro ($49.99/month) only

---

## Workflow

```
WhatsApp Voice Note
    ↓
Faster Whisper (STT) → Text
    ↓
OYE AI Intelligence Engine → Intent + Response
    ↓
Kokoro TTS (TTS) → Audio
    ↓
WhatsApp Voice Reply
```

---

## Configuration

### Environment Variables
```env
# Voice AI (Pro only)
VOICE_ENABLED=false
VOICE_WHISPER_MODEL=base
VOICE_KOKORO_MODEL=af_sarah
VOICE_LANGUAGE=es
VOICE_STYLE=neutral
```

### Database Fields
```sql
ALTER TABLE organizations
    ADD COLUMN voice_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN voice_language TEXT DEFAULT 'es',
    ADD COLUMN voice_style TEXT DEFAULT 'neutral';
```

---

## Pricing

| Component | Setup | Per-Minute |
|----------|-------|----------|
| Faster Whisper | ~$10/month (VPS) | ~$0.003/min |
| Kokoro TTS | ~$10/month (VPS) | ~$0.001/min |
| **Total** | ~$20/month | ~$0.004/min |

vs. OpenAI Whisper ($0.006/min) + ElevenLabs ($0.18/min)

---

## Tier Access

| Plan | Voice Access |
|------|------------|
| Free Trial | Preview only (3 messages) |
| Basic | ❌ Text only |
| **Pro** | ✅ Full Voice AI |
| Business | ✅ Advanced voices |

---

## White Label

Customer-facing names only:
- "OYE AI Voice"
- "AI Voice Assistant"
- "Voice Replies"

---

## Implementation Timeline

1. Environment/config placeholders ← NOW
2. Database fields ← NOW  
3. Router check in message flow
4. STT/TTS infrastructure (Phase 2)
5. Pro feature flag validation (Phase 2)

---

## Not Implementing Yet

Voice AI infrastructure requires:
- Self-hosted STT/TTS servers
- Audio processing pipeline
- Rate limiting per tier

Focus first on Evolution API + pilot readiness.

EOF