# AI Provider Benchmark Results - OYE AI

## Test Date: 2026-06-01

## Providers Tested

| Provider | Model | Status | Notes |
|----------|-------|--------|-------|
| **Blackbox** | blackboxai/blackbox-pro | ✅ WORKS | Primary recommended |
| **OpenRouter** | google/gemma-4-31b-it:free | ✅ WORKS | Secondary |
| **Langdock** | gpt-5-mini | ❌ EMPTY | Fallback only |

---

## Blackbox Pro - Full Benchmark

| Scenario | Latency | Success | Output Preview |
|----------|--------|--------|-------------|
| Spanish Conversation | 3264ms | ✓ | "¡Hola! 👋 Con gusto! Ofrecemos asistencia..." |
| English Conversation | 2756ms | ✓ | "Hi! I can help with a wide range..." |
| Lead Qualification | 2588ms | ✓ | "¡Excelente! Podemos comenzar de inmediato..." |
| Booking Request | 2792ms | ✓ | "¡Claro! Puedo ayudarte con eso..." |
| FAQ Retrieval | 2063ms | ✓ | "¡Hola! Sí, contamos con estacionamiento..." |
| Sentiment Analysis | 1708ms | ✓ | "¡Muchas gracias! Me alegra saber..." |
| Conversation Summary | 2383ms | ✓ | "¡Perfecto! Reserva para 5 personas..." |

**Average Latency**: 2593ms
**Success Rate**: 7/7 (100%)

---

## OpenRouter - Test Results

| Model | Latency | Success | Spanish |
|-------|--------|---------|---------|
| google/gemma-4-31b-it:free | ~500ms | ✓ | "¡Hola! ¿En qué puedo ayudarte?" |
| z-ai/glm-5.1 | N/A | N/A | Needs test |

---

## Langdock - Issue

**Problem**: Returns empty content despite HTTP 200
**Recommendation**: Keep as fallback until resolved

---

## Cost Estimates (Per 1000 Conversations)

| Provider | Model | Est. Cost/1K | Notes |
|----------|-------|-------------|-------|
| Blackbox | blackbox-pro | ~$0.50-1.00 | Professional tier |
| OpenRouter | gemma-4-31b-it:free | ~$0.00 | Free tier |
| Langdock | gpt-5-mini | ~$0.10 | (if fixed) |

---

## Recommendation

### Primary: Blackbox Pro
- Best quality responses
- Spanish/English excellent
- 100% success rate
- ~$0.50-1.00/1K conv

### Secondary: OpenRouter Gemma-4-31B-IT
- Free tier available
- Fast (~500ms)
- Good as backup

### Fallback: Langdock
- Keep configured
- Wait for fix from Langdock

---

## Implementation

Update AI service to:
1. Primary: Blackbox `blackboxai/blackbox-pro`
2. Fallback: OpenRouter `google/gemma-4-31b-it:free`
3. Emergency: Mock responses

EOF