# VPS Deployment Guide — webcrawler.buzz

> Ubuntu 24.04 on Contabo VPS (167.86.124.99)

## Architecture

```
User → HTTPS → Cloudflare (SSL termination, CDN, DDoS)
     → HTTPS → Nginx (port 443, Origin Certificate, reverse proxy)
     → HTTP  → Node.js app (localhost:5005, PM2 managed)
              → Redis (localhost:6379, BullMQ queues)
              → PostgreSQL (localhost:5432)
```

---

## Prerequisites

- Domain DNS (Cloudflare): A records for `webcrawler.buzz` + `www` → VPS IP (Proxied)
- Cloudflare Origin Certificate + Private Key generated
- GitHub Secrets configured: `VPS_HOST`, `VPS_USERNAME`, `VPS_PASSWORD`, `VPS_PORT`

---

## Step 1: System Update

```bash
apt update && apt upgrade -y
```

---

## Step 2: Install Node.js via NVM

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 20
nvm alias default 20
node -v   # v20.x
npm -v
```

---

## Step 3: Install PM2

```bash
npm install -g pm2
pm2 startup   # enables auto-start on reboot
```

---

## Step 4: Install Redis

```bash
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
```

### Configure Redis ACL

```bash
nano /etc/redis/redis.conf
```

In the SECURITY section, set a default password and create an ACL user for the app:

```
requirepass 19691

user default on >19691 ~* &* +@all
user webcrawler on >webcrawler@123 ~webcrawler:* ~bull:* &* +@all
```

> The `webcrawler` user needs access to both `webcrawler:*` (app keys) and `bull:*` (BullMQ queue keys).

Restart:

```bash
systemctl restart redis-server
redis-cli -u 'redis://webcrawler:webcrawler@123@localhost:6379' ping   # PONG
```

---

## Step 5: Install PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

### Create Database & User

```bash
sudo -u postgres psql
```

Inside psql:

```sql
CREATE USER webcrawler WITH PASSWORD 'webcrawler@123';
CREATE DATABASE webcrawler OWNER webcrawler;
GRANT ALL PRIVILEGES ON DATABASE webcrawler TO webcrawler;
\q
```

Verify:

```bash
psql -U webcrawler -d webcrawler -h localhost -W
# Enter: webcrawler@123
# Should connect. Type \q to exit.
```

---

## Step 6: Install Nginx

```bash
apt install -y nginx
systemctl enable nginx
```

---

## Step 7: Cloudflare Origin Certificate

```bash
mkdir -p /etc/ssl/cloudflare
nano /etc/ssl/cloudflare/webcrawler-buzz.pem
# Paste the certificate, save

nano /etc/ssl/cloudflare/webcrawler-buzz.key
# Paste the private key, save

chmod 644 /etc/ssl/cloudflare/webcrawler-buzz.pem
chmod 600 /etc/ssl/cloudflare/webcrawler-buzz.key
```

---

## Step 8: Configure Nginx

```bash
cat > /etc/nginx/sites-available/webcrawler-buzz << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name webcrawler.buzz www.webcrawler.buzz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name webcrawler.buzz www.webcrawler.buzz;

    ssl_certificate /etc/ssl/cloudflare/webcrawler-buzz.pem;
    ssl_certificate_key /etc/ssl/cloudflare/webcrawler-buzz.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Large CSV exports may take time to start streaming
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;

    location / {
        proxy_pass http://127.0.0.1:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

Enable and test:

```bash
ln -sf /etc/nginx/sites-available/webcrawler-buzz /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t            # must say "syntax is ok"
systemctl restart nginx
```

---

## Step 9: Cloudflare SSL Mode

In Cloudflare dashboard → **SSL/TLS** → **Overview** → Set to **"Full (Strict)"**

---

## Step 10: Firewall (UFW)

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable          # type 'y' to confirm
ufw status
```

> PostgreSQL (5432) and Redis (6379) are NOT exposed — localhost only.

---

## Step 11: Create App Directory & .env

```bash
mkdir -p /root/webcrawler-buzz/logs
mkdir -p /root/webcrawler-buzz/tmp/exports
nano /root/webcrawler-buzz/.env
```

Paste:

```env
PORT=5005
APP_BASE_URL=https://webcrawler.buzz
DATABASE_URL=postgresql://webcrawler:webcrawler@123@localhost:5432/webcrawler
REDIS_URL=redis://webcrawler:webcrawler@123@localhost:6379
GMAIL_USER=devhasibulislam@gmail.com
GMAIL_APP_PASSWORD=xrnc oaay pfjc dlrd
SWAGGER_USERNAME=devhasibulislam
SWAGGER_PASSWORD=devhasibulislam@123
ALLOWED_ORIGIN=https://webcrawler.buzz
```

Save (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## Step 12: First Deploy

Push a commit to `master` on GitHub, or trigger manually from **Actions → Deploy Crawler → Run workflow**.

The GitHub Actions workflow will:

1. Lint + Build (TypeScript + Tailwind CSS) on GitHub runner
2. Package `dist/` + `public/` + `package.json` + `ecosystem.config.cjs` into tarball
3. SCP tarball to VPS `/tmp`
4. SSH into VPS: extract, restore .env, install production deps, restart PM2

---

## Step 13: Run Database Migration (first time only)

After the first deploy completes:

```bash
cd /root/webcrawler-buzz
node dist/db/migrate.js
```

---

## Step 14: Verify

```bash
# Check PM2
pm2 status
pm2 logs webcrawler-buzz --lines 30

# Check app responds
curl -I http://127.0.0.1:5005

# Check Nginx proxies correctly
curl -I https://webcrawler.buzz
```

---

## Useful Commands

| Command                                         | Purpose              |
| ----------------------------------------------- | -------------------- |
| `pm2 status`                                    | Check app status     |
| `pm2 logs webcrawler-buzz`                      | View app logs        |
| `pm2 restart webcrawler-buzz`                   | Restart app          |
| `systemctl status redis-server`                 | Check Redis          |
| `systemctl status postgresql`                   | Check PostgreSQL     |
| `systemctl status nginx`                        | Check Nginx          |
| `nginx -t`                                      | Test Nginx config    |
| `ufw status`                                    | Check firewall rules |
| `psql -U webcrawler -d webcrawler -h localhost` | Connect to DB        |
| `redis-cli -u 'redis://webcrawler:webcrawler@123@localhost:6379' ping` | Test Redis |

---

## Troubleshooting

### App won't start

```bash
pm2 logs webcrawler-buzz --err --lines 50
# Check .env is in /root/webcrawler-buzz/.env
cat /root/webcrawler-buzz/.env
```

### Nginx 502 Bad Gateway

```bash
# App not running on port 5005
pm2 status
curl http://127.0.0.1:5005
```

### Database connection refused

```bash
systemctl status postgresql
# Check pg_hba.conf allows local md5 auth
sudo -u postgres nano /etc/postgresql/16/main/pg_hba.conf
# Ensure: local all all md5
# And: host all all 127.0.0.1/32 md5
sudo systemctl restart postgresql
```

### Redis connection refused

```bash
systemctl status redis-server
redis-cli -u 'redis://webcrawler:webcrawler@123@localhost:6379' ping
```

### Deploy fails at SCP step

- Verify GitHub secrets match: `VPS_HOST`, `VPS_USERNAME`, `VPS_PASSWORD`
- Ensure SSH works: `ssh root@167.86.124.99`

---

## Service Summary

| Service           | Port    | Auth                        | Public?        |
| ----------------- | ------- | --------------------------- | -------------- |
| Nginx             | 80, 443 | Cloudflare Origin Cert      | Yes            |
| Node.js (Express) | 5005    | —                           | No (localhost) |
| PostgreSQL        | 5432    | webcrawler / webcrawler@123 | No (localhost) |
| Redis             | 6379    | ACL user: webcrawler / webcrawler@123 | No (localhost) |
