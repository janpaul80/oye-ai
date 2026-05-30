#!/bin/bash
# =========================================================================
# ⚡ OYE AI - PRODUCTION DEPLOYMENT SHUTDOWN ORCHESTRATOR
# =========================================================================
# Location: C:\Users\hartm\oye-ai\scripts\stop-production.sh
# Target: Ubuntu / Debian server environments (Server 234)
# Usage: chmod +x stop-production.sh && ./stop-production.sh
# =========================================================================

echo "=============================================="
echo "🛑 [OYE AI] Stopping Production Stack..."
echo "=============================================="

if docker compose version &>/dev/null; then
    docker compose down
else
    docker-compose down
fi

echo "=============================================="
echo "✓ [OYE AI] Production containers successfully halted."
echo "👉 Redis data volume has been preserved."
echo "=============================================="
