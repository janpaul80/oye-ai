# OYE AI - Strato VPS Deployment Plan

## Server Information

**Server IP**: `85.215.225.0`  
**SSH**: `ssh -i strato-private-225-0 root@85.215.225.0`  
**Domain**: `oye-ai.com`

---

## Step 1: Server Audit (Run First)

SSH into server and run:

```bash
# System info
uname -a
cat /etc/os-release

# Resources
nproc
free -h
df -h

# Docker
docker --version
docker compose version
docker ps -a

# Nginx
nginx -v
systemctl status nginx

# Ports in use
ss -tuln | grep LISTEN

# Certbot (if installed)
certbot --version 2>/dev/null || echo "Not installed"
```

---

## Step 2: DNS Configuration

Before deploying, ensure DNS points to server:

| Record | Type | Value |
|--------|------|-------|
| oye-ai.com | A | 85.215.225.0 |
| www.oye-ai.com | A | 85.215.225.0 |

Configure in Strato DNS panel, then verify:
```bash
dig oye-ai.com +short
dig www.oye-ai.com +short
```

---

## Step 3: Install Dependencies

```bash
# Update
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $(whoami)

# Install Docker Compose
apt install docker-compose -y

# Install Nginx
apt install nginx -y

# Install Certbot
apt install certbot python3-certbot-nginx -y
```

---

## Step 4: Prepare Directories

```bash
mkdir -p /opt/oye-ai/{app,redis,nginx,ssl}
cd /opt/oye-ai
```

---

## Step 5: Upload Application

Option A: Clone from GitHub
```bash
cd /opt/oye-ai
git clone https://github.com/janpaul80/oye-ai.git app
cd app
npm install
npm run build
```

Option B: Upload via scp (from your machine)
```bash
scp -r -i C:\Users\hartm\strato-private-225-0 oye-ai user@85.215.225.0:/opt/oye-ai/
```

---

## Step 6: Environment Variables

Create `/opt/oye-ai/app/.env.production`:

```env
# Supabase (production - NOT local!)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# AI Providers
BLACKBOX_API_KEY=sk-5cIi5HKplvz-kN4W5VggkA
BLACKBOX_ENDPOINT_URL=https://api.blackbox.ai

# Stripe (production keys)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Domain
NEXT_PUBLIC_APP_URL=https://oye-ai.com
```

---

## Step 7: Docker Compose

Create `/opt/oye-ai/docker-compose.yml`:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: oye_redis
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    networks:
      - oye_network

  web:
    image: node:20-alpine
    container_name: oye_web
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    env_file:
      - .env.production
    working_dir: /app
    command: npm start
    volumes:
      - ./app:/app
    depends_on:
      - redis
    networks:
      - oye_network

  nginx:
    image: nginx:alpine
    container_name: oye_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx:/etc/nginx/conf.d
      - ./ssl:/etc/nginx/ssl
      - /var/log/nginx:/var/log/nginx
    depends_on:
      - web
    networks:
      - oye_network

networks:
  oye_network:
    driver: bridge

volumes:
  redis_data:
```

---

## Step 8: Nginx Configuration

Create `/opt/oye-ai/nginx/oye-ai.conf`:

```nginx
server {
    listen 80;
    server_name oye-ai.com www.oye-ai.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name oye-ai.com www.oye-ai.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location / {
        proxy_pass http://oye_web:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://oye_web:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Step 9: SSL Certificate

```bash
# Stop nginx temporarily
docker compose stop nginx

# Get certbot certificate
certbot certonly --standalone -d oye-ai.com -d www.oye-ai.com

# Copy certificates
cp /etc/letsencrypt/live/oye-ai.com/fullchain.pem /opt/oye-ai/ssl/
cp /etc/letsencrypt/live/oye-ai.com/privkey.pem /opt/oye-ai/ssl/

# Start nginx
docker compose start nginx
```

---

## Step 10: Evolution API (Separate Container)

```bash
# Create Evolution API docker-compose.evolution.yml
version: '3.8'
services:
  evolution:
    image: atendai/evolution-api:latest
    container_name: oye_evolution
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:8080"
    environment:
      - SERVER_TYPE=embedded
      - DATABASE_ENABLED=true
      - AUTHENTICATION_API_KEY=yourEvolutionKey
    volumes:
      - evolution_data:/evolution/instance

volumes:
  evolution_data:
```

Connect to main docker-compose or run separately:
```bash
docker compose -f docker-compose.evolution.yml up -d
```

---

## Step 11: Start All Services

```bash
cd /opt/oye-ai
docker compose up -d

# Check status
docker compose ps
docker compose logs -f
```

---

## Step 12: Verify

```bash
# Health check
curl https://oye-ai.com/api/health

# DNS check
dig oye-ai.com +short
```

---

## Environment Variables Required

| Variable | Value | Source |
|----------|-------|--------|
| SUPABASE_URL | https://xxx.supabase.co | Supabase dashboard |
| SUPABASE_ANON_KEY | xxx | Supabase dashboard |
| SUPABASE_SERVICE_KEY | xxx | Supabase dashboard |
| BLACKBOX_API_KEY | `sk-5cIi5HKplvz-kN4W5VggkA` | Existing |
| STRIPE_SECRET_KEY | sk_live_xxx | Stripe dashboard |
| EVOLUTION_API_KEY | Generate new | strato cmd |

---

## Rollback Plan

If deployment fails:

```bash
# Stop containers
docker compose down

# Check logs
docker compose logs web
docker compose logs nginx

# Restart
docker compose restart
```

EOF