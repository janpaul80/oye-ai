#!/bin/bash
# =========================================================================
# ⚡ OYE AI - PRODUCTION DEPLOYMENT STARTUP ORCHESTRATOR
# =========================================================================
# Location: C:\Users\hartm\oye-ai\scripts\start-production.sh
# Target: Ubuntu / Debian server environments (Server 234)
# Usage: chmod +x start-production.sh && ./start-production.sh
# =========================================================================

set -e # Terminate script immediately upon error

echo "=============================================="
echo "🚀 [OYE AI] Initializing Production Spin-Up..."
echo "=============================================="

# 1. Verify that .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ ERROR: '.env.production' file is missing in the root directory!"
    echo "👉 Please copy '.env.production.example' to '.env.production' and fill in live keys."
    exit 1
fi
echo "✓ Confirmed '.env.production' is present."

# 2. Check for Docker and Docker Compose command dependencies
if ! [ -x "$(command -v docker)" ]; then
    echo "❌ ERROR: Docker command is missing. Please install Docker first."
    exit 1
fi
if ! [ -x "$(command -v docker-compose)" ] && ! docker compose version &>/dev/null; then
    echo "❌ ERROR: Docker Compose is missing. Please install docker-compose first."
    exit 1
fi
echo "✓ Confirmed Docker & Docker Compose runtimes are active."

# 3. Pull or compile production standalone packages
echo "📦 Building and starting multi-container orchestrator..."
if docker compose version &>/dev/null; then
    docker compose up -d --build
else
    docker-compose up -d --build
fi

echo "=============================================="
echo "⚡ [OYE AI] Container Stack Active!"
echo "=============================================="

# 4. Wait for database and services to reach healthy status
echo "🔍 Monitoring container health check cycles..."
sleep 5

if docker compose version &>/dev/null; then
    docker compose ps
else
    docker-compose ps
fi

echo "👉 View logs in real-time with: docker compose logs -f"
echo "=============================================="
