# OYE AI - Voice AI Roadmap

## Voice AI Stack

### Approved Technologies

| Component | Technology | Status |
|-----------|-----------|--------|
| **STT** | Faster Whisper | Planned |
| **TTS** | Kokoro TTS | Planned |
| **LLM** | Langdock (existing) | ✅ Active |

---

## Why This Stack?

### Faster Whisper
- Open source, no API costs
- Runs locally (or on cheap GPU)
- Supports 100+ languages
- High accuracy, especially for Spanish/LATAM
- Can fine-tune for domain-specific vocabulary

### Kokoro TTS  
- Natural-sounding, expressive
- Supports Spanish voices
- Lightweight, fast inference
- Open source (Apache 2.0)

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Voice Pipeline                    │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────┐    ┌───────────┐    ┌──────────┐     │
│  │WhatsApp │───▶│ Faster    │───▶│  Langdock │     │
│  │ Voice   │    │ Whisper   │    │  (GPT)   │     │
│  └─────────┘    └───────────┘    └──────────┘     │
│       ▲                            │            │
│       │                            ▼            │
│       │                    ┌──────────────┐          │
│       └───────────────────│  Kokoro    │◀─────────┘
│                          │   TTS      │
│                          └──────────────┘
│                               │
│                               ▼
│                          WhatsApp
```

---

## Flow

### 1. Incoming Voice Message
```
WhatsApp voice note
    ↓
Faster Whisper STT → "Hola, quiero una cita"
    ↓
Langdock (GPT) → Generate response
    ↓
Kokoro TTS → Audio
    ↓
WhatsApp → Send voice response
```

### 2. Voice Commands
- "Agenda una cita" → Book appointment
- "Muéstrame mis leads" → Show leads
- "Háblame con un agente" → Transfer to human

---

## Implementation

### Phase 1: Infrastructure
- [ ] Deploy Faster Whisper to cloud
- [ ] Deploy Kokoro TTS
- [ ] Test STT + TTS separately

### Phase 2: Integration
- [ ] Add voice message detection
- [ ] Add voice response generation
- [ ] Connect to conversation AI

### Phase 3: Voice Features
- [ ] Voice commands
- [ ] Voice search
- [ ] Voice notifications

---

## Cost Implications

| Component | Setup Cost | Per-Minute Cost |
|-----------|----------|-------------|
| Faster Whisper | ~$50 GPU | ~$0.003/min |
| Kokoro TTS | ~$10 CPU | ~$0.001/min |
| **Total** | **~$60** | **~$0.004/min** |

vs. OpenAI Whisper ($0.006/min) + ElevenLabs ($0.18/min)

---

## Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Infrastructure | 2-3 weeks | Deploy STT/TTS |
| Integration | 1-2 weeks | Connect pipeline |
| Features | 2-3 weeks | Commands + search |

---

## Not Implementing Yet

This is a proof of concept. Don't build until:
1. First paid customers acquired
2. Voice feature demand confirmed
3. Budget approved

EOF