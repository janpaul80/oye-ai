# Oye AI: Server 234 Deployment & Verification Checklist

This checklist contains the concrete steps and exact shell commands to run on Server 234 (Ubuntu) to verify the infrastructure and prepare the production environment for Oye AI.

---

## 1. System Info & OS Verification
Run these commands to confirm the Ubuntu version and architecture:

```bash
# Check Ubuntu Version (Expected: Ubuntu 22.04 LTS or 24.04 LTS)
lsb_release -a

# Check system architecture (Expected: x86_64 or aarch64)
uname -m

# Check available CPU cores and memory
nproc
free -h
```

---

## 2. Dependency Health Check
Verify if the necessary runtime services are installed:

### A. Docker & Docker Compose (Recommended for queues & workers)
```bash
# Check Docker installation
docker --version

# Check Docker compose installation
docker compose version

# Verify Docker daemon is running
sudo systemctl status docker
```

### B. Node.js & NPM (If running bare-metal/PM2)
```bash
# Check Node.js version (Recommended: v20 LTS or v22 LTS)
node -v

# Check npm version
npm -v
```

### C. Nginx Reverse Proxy
```bash
# Check Nginx version
nginx -v

# Verify Nginx service is running
sudo systemctl status nginx
```

---

## 3. Firewall & Port Configurations
Oye AI requires external ports for web traffic and WhatsApp webhooks, and must block database/queue ports from public access.

```bash
# View active UFW rules
sudo ufw status verbose

# Required open ports:
# 80/tcp (HTTP for Let's Encrypt verification)
# 443/tcp (HTTPS for Next.js App, Dashboard & Webhooks)
# 22/tcp (SSH access)

# Enable required ports if missing:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp

# CRITICAL: Ensure ports 5432 (PostgreSQL) and 6379 (Redis) are NOT exposed publicly!
```

---

## 4. Domain & SSL Setup (`oye-ai.com`)
Before Meta will send WhatsApp webhooks, the domain `oye-ai.com` must have a valid SSL certificate (Self-signed certificates are rejected by Meta).

### Step A: Verify DNS Resolution
```bash
# Ensure A records for oye-ai.com and api.oye-ai.com point to Server 234's IP
dig +short oye-ai.com
dig +short api.oye-ai.com
```

### Step B: Generate Let's Encrypt Certificate
```bash
# Install Certbot and the Nginx plugin
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Obtain the SSL certificate (replace with your primary domain)
sudo certbot --nginx -d oye-ai.com -d www.oye-ai.com
```

---

## 5. PM2 vs. Docker Compose Decision Matrix
For background worker queues (Redis + BullMQ) and the Next.js production server, we can deploy via two patterns:

| Aspect | Docker Compose Deployment (Recommended) | PM2 Bare-Metal Deployment |
| :--- | :--- | :--- |
| **Command** | `docker compose up -d --build` | `pm2 start npm --name "web" -- start` |
| **Isolation** | 100% (Isolated file systems & nodes) | None (Shares global Node.js & packages) |
| **Updates** | Re-builds container cleanly. | `git pull && npm install && npm run build` |
| **Redis Setup** | Trivial (Installs official Redis container) | Needs manual `sudo apt install redis-server` |

---

## 6. Logs, Restart & Process Recovery
Ensure the services survive server reboots:

### For Docker Compose:
```bash
# View logs in real-time
docker compose logs -f --tail 100

# Set restart policy to 'unless-stopped' in docker-compose.yml
```

### For PM2:
```bash
# Make PM2 start on system boot
pm2 startup

# Save active process list
pm2 save

# View logs in real-time
pm2 logs --lines 100
```

---

## 7. Next.js App & Worker Health Verification
The server must expose standard HTTP `/api/health` endpoints so that external monitoring services can verify system status.

* **Dashboard Web app endpoint**: `https://oye-ai.com/api/health`
  * Checks: Connection to Supabase, local environment variables.
* **Worker Node endpoint** (if running separately):
  * Checks: Redis connection state, active BullMQ queue lengths.

---

## 8. Production Secrets Checklist & Emergency Revocation Procedure

### A. Production Secrets Audit Checklist
Before completing live cutover, verify the following configuration standards are applied to Server 234:
- [ ] **No Secrets in Source Control**: Verify `.env.production` is added to `.gitignore` and no secrets exist in the git history.
- [ ] **File Permissions**: Restrict read/write permissions of `.env.production` to the server root/deployer user:
  ```bash
  chmod 600 .env.production
  ```
- [ ] **Container Isolation**: Ensure that environment files are injected via Docker Compose `env_file` or direct mounting, rather than baked into images.
- [ ] **SSL Enforcement**: Verify HTTPS is active for all webhook receivers, since Meta refuses to dispatch payloads over plain HTTP.

### B. Emergency Key Revocation & Rotation Procedure
In the event of a credential leak, compromise, or system breach, execute the following actions immediately to isolate services and rotate secrets.

#### 🚨 Phase A: Immediate Lockdown & Isolation (T-Zero)
1. **Disable Inbound webhook processing**:
   Change `ENABLE_LIVE_WHATSAPP_WEBHOOKS=false` inside `.env.production` and restart next-app:
   ```bash
   # For Docker Compose:
   docker compose restart web
   # For PM2:
   pm2 restart web
   ```
   This stops webhook signature processing immediately.
2. **Engage Global Outbound Kill-Switch**:
   Immediately edit `.env.production` to set `DISABLE_OUTBOUND_WHATSAPP=true` and restart the services. This immediately stops all outbound API dispatching and typing indicators to prevent leaks or unwanted customer-facing spam.
3. **Force-terminate active worker queues**:
   Stop all BullMQ worker processes immediately:
   ```bash
   # For Docker Compose:
   docker compose stop worker
   # For PM2:
   pm2 stop worker
   ```

#### 🔄 Phase B: Secret Rotations & Re-issuing
1. **Meta WhatsApp permanent system user tokens**:
   - Navigate to Meta Business Suite -> Settings -> System Users.
   - Select the Oye AI System User and click **Revoke Token**.
   - Generate a new access token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
2. **Meta Webhook Verify Token & App Secret**:
   - Navigate to Meta App Dashboard -> Basic Settings.
   - Click **Reset** on the App Secret.
   - Update `WHATSAPP_VERIFY_TOKEN` and `WHATSAPP_APP_SECRET` to new values.
3. **Stripe secret keys**:
   - Navigate to Stripe Dashboard -> Developers -> API Keys.
   - Click **Revoke** on the compromised key. Stripe will allow a 24-hour grace period or instant revocation.
   - Navigate to Webhooks and delete the old endpoint, creating a new one to obtain a new `STRIPE_WEBHOOK_SECRET`.
4. **Supabase connection tokens**:
   - Navigate to Supabase Dashboard -> Settings -> API.
   - Rotate the `SUPABASE_SERVICE_ROLE_KEY` immediately using the dashboard controls.

#### 🚢 Phase C: Deployment & Recovery Verification
1. Update `.env.production` on Server 234 with the new rotated values.
2. Run safety verification test:
   ```bash
   npx tsx scripts/test-redis-recovery.ts
   ```
3. Restart all services:
   ```bash
   docker compose up -d --build
   ```
4. Verify `/api/health` returns status `200` and `healthy`.

