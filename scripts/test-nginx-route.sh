#!/bin/sh
set -eux

# Simple route validation script
# 1) Check whatsapp-api health on port 3006
# 2) Check nextjs health on port 3005
# 3) Send a sample Twilio-form POST to the whatsapp-api route

echo "==> 1) whatsapp-api health (direct)"
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3006/health || true

echo "==> 2) nextjs health (direct)"
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3005/api/health || true

echo "==> 3) POST webhook (simulate Twilio form POST)"
curl -sS -X POST http://127.0.0.1:3006/api/twilio/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+15551234567" \
  --data-urlencode "Body=Hello from curl test" \
  -v || true

exit 0
