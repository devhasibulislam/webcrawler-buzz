# Deployment playbook, Contabo VPS + shared Traefik

Reusable recipe for shipping any Node.js / Express / Next.js project to the same VPS that already hosts `smmcare.online` and `webcrawler.buzz`. Copy this file into a new project, replace the placeholders, and run through the checklist. First deploy: about 20-30 minutes. Every subsequent `git push origin master` deploys automatically in about 3-5 minutes.

## VPS facts (constant across all projects)

- Host: `169.58.104.249` (Contabo, Ubuntu 24.04)
- SSH: `ssh root@169.58.104.249`
- Root password (initial bootstrap only): `KS8RQ8nrv87tqolDvN`
- Docker: 29.7 with Compose v5.3
- Shared reverse proxy: **Traefik** at `/opt/proxy/` (owns `:80` and `:443`)
- Shared Docker network: `web` (external, joined by every project + Traefik)
- Docker bridge gateway IP: `172.17.0.1` (used to reach host services from containers)

Already installed on the host:
- Postgres 16 (`systemctl status postgresql`)
- Redis 7 (`systemctl status redis-server`)

Each project shares the same Postgres + Redis instances with per-project isolation:
- Postgres: one role + one database per project (e.g. `webcrawler / webcrawler / webcrawler`).
- Redis: one ACL user per project with key-prefix isolation (`user webcrawler on >webcrawler@123 ~webcrawler:* &* +@all`). The `default` user stays `off`.

## Architecture

```
git push
  ├── GitHub Actions
  │     ├── check   (npm ci, lint, test)
  │     ├── build   (buildx → push to ghcr.io/<owner>/<repo>-web)
  │     └── deploy  (scp compose file, ssh into VPS, docker compose pull && up -d)
  │
  └── VPS (169.58.104.249)
        ├── /opt/proxy/          ← Traefik, shared, set up once per VPS
        ├── /opt/<yourapp>/      ← per project
        │     ├── docker-compose.yaml   (CI overwrites)
        │     └── .env                  (manually placed, chmod 600)
        │
        ├── postgres (host)      ← listens on 127.0.0.1 + 172.17.0.1
        └── redis    (host)      ← listens on 127.0.0.1 + 172.17.0.1
```

Container reaches the host via `extra_hosts: [ "host.docker.internal:host-gateway" ]`, so `DATABASE_URL` and `REDIS_URL` in `.env` use `host.docker.internal` as the hostname.

---

## Prerequisites (per project)

1. Cloudflare zone for the new domain, DNS **A record proxied** for apex and `www` pointing at `169.58.104.249`.
2. Cloudflare SSL/TLS mode: **Full (strict)**. Not "Full", not "Flexible".
3. Cloudflare Origin CA certificate + private key for the new domain (15-year validity, apex + `*.<domain>`).
4. Private GitHub repo. GitHub Actions gets `GITHUB_TOKEN` automatically; no PAT needed for GHCR pull if you use the deploy pattern below.
5. Local: `ssh`, `sshpass`, `scp`, `gh` CLI (authenticated with `repo, workflow` scopes).

---

## Files to add to the project repo

### 1. `Dockerfile` (Express + tsc example; adapt for Next.js)

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=<YOUR_PORT>
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache wget \
 && addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 app

COPY --chown=app:nodejs package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=builder --chown=app:nodejs /app/dist   ./dist
COPY --from=builder --chown=app:nodejs /app/public ./public

# Runtime writable dirs (create them at build time; the non-root user cannot
# mkdir under WORKDIR at runtime).
RUN mkdir -p /app/tmp/exports && chown -R app:nodejs /app/tmp

USER app
EXPOSE <YOUR_PORT>
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD wget -qO- http://127.0.0.1:<YOUR_PORT>/api/health >/dev/null 2>&1 || exit 1

CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
```

Key details that bit us during the first deploy:
- **Pre-create runtime writable dirs** (`tmp/exports`, etc.) and `chown` them to the app user. Non-root users cannot `mkdir` at container root at runtime.
- **`app.set('trust proxy', 1)`** in the Express app is mandatory. Behind Traefik + Cloudflare, `X-Forwarded-For` is set; without it, `express-rate-limit` throws `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`.
- **`HEALTHCHECK` must hit a real endpoint** (`/api/health`), not `/`, which may 404 depending on routing.

### 2. `.dockerignore` (allowlist model)

Prefer an **allowlist** over blacklist. New files added to the repo default to *excluded* from the build context; you never have to remember to blacklist them.

```dockerignore
# 1) Exclude everything
**

# 2) Whitelist only what `npm run build` actually reads
!package.json
!package-lock.json
!tsconfig.json
!tailwind.config.js
!src/**
!public/**

# 3) Prune inside allowed dirs
public/*.bak
public/**/*.map
src/**/*.test.ts
src/**/*.spec.ts

# 4) Belt-and-suspenders: never leak these even if a rule catches them
.env
.env.*
.git
.gitignore
.github
.vscode
.agents
node_modules
dist
tmp
coverage
test-results
playwright-report
deploy
scripts
docs
tests
*.log
*.bak
skills-lock.json
```

Result on `webcrawler.buzz`: build context = ~1.3 MB (just `src/`, `public/`, and 4 configs). Nothing else reaches Docker, so nothing extraneous can end up in a layer.

### 3. `deploy/docker-compose.yaml`

Replace `<yourapp>` and `<YOUR_PORT>`. Add `api.<yourdomain>` to the router rule if you use an API subdomain.

```yaml
name: <yourapp>

services:
  web:
    image: ghcr.io/<owner>/<repo>-web:${IMAGE_TAG:-latest}
    container_name: <yourapp>-web
    restart: unless-stopped
    env_file:
      - /opt/<yourapp>/.env
    expose:
      - "<YOUR_PORT>"
    extra_hosts:
      - "host.docker.internal:host-gateway"    # for Postgres/Redis on host
    networks:
      - <yourapp>-net
      - web
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:<YOUR_PORT>/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 45s
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=web"

      - "traefik.http.routers.<yourapp>.rule=Host(`<yourdomain>`) || Host(`api.<yourdomain>`)"
      - "traefik.http.routers.<yourapp>.entrypoints=websecure"
      - "traefik.http.routers.<yourapp>.tls=true"
      - "traefik.http.routers.<yourapp>.service=<yourapp>"
      - "traefik.http.services.<yourapp>.loadbalancer.server.port=<YOUR_PORT>"

      - "traefik.http.routers.<yourapp>-www.rule=Host(`www.<yourdomain>`)"
      - "traefik.http.routers.<yourapp>-www.entrypoints=websecure"
      - "traefik.http.routers.<yourapp>-www.tls=true"
      - "traefik.http.routers.<yourapp>-www.middlewares=<yourapp>-www-redirect"
      - "traefik.http.middlewares.<yourapp>-www-redirect.redirectregex.regex=^https://www\\.<yourdomain>/(.*)$$"
      - "traefik.http.middlewares.<yourapp>-www-redirect.redirectregex.replacement=https://<yourdomain>/$${1}"
      - "traefik.http.middlewares.<yourapp>-www-redirect.redirectregex.permanent=true"

networks:
  <yourapp>-net:
    driver: bridge
  web:
    external: true
    name: web
```

### 4. `.github/workflows/deploy.yml`

```yaml
name: Deploy to VPS

on:
  push:
    branches: [master]
  workflow_dispatch:

concurrency:
  group: deploy-production
  cancel-in-progress: false

env:
  IMAGE_WEB: ghcr.io/${{ github.repository_owner }}/<repo>-web

jobs:
  check:
    runs-on: ubuntu-latest
    env:
      HUSKY: "0"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test

  build:
    needs: check
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    outputs:
      image_tag: ${{ steps.meta.outputs.image_tag }}
    steps:
      - uses: actions/checkout@v4
      - id: meta
        run: echo "image_tag=${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: |
            ${{ env.IMAGE_WEB }}:${{ steps.meta.outputs.image_tag }}
            ${{ env.IMAGE_WEB }}:latest
          # OCI label lets the deploy step prune ONLY this project's dangling
          # images on the shared VPS instead of every project's.
          labels: |
            org.opencontainers.image.source=https://github.com/${{ github.repository }}
          cache-from: type=gha,scope=web
          cache-to: type=gha,scope=web,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      # Sparse-checkout the deploy dir only. Deploy job doesn't need src/,
      # tests, docs, or anything else on the runner. Saves ~30 MB on cold cache.
      - uses: actions/checkout@v4
        with:
          sparse-checkout: |
            deploy
          sparse-checkout-cone-mode: false
      - uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_DEPLOY_KEY }}
          port: ${{ secrets.VPS_SSH_PORT }}
          source: "deploy/docker-compose.yaml"
          target: "/opt/<yourapp>/"
          strip_components: 1
      - uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_DEPLOY_KEY }}
          port: ${{ secrets.VPS_SSH_PORT }}
          script: |
            set -euo pipefail
            cd /opt/<yourapp>
            docker network inspect web >/dev/null 2>&1 || docker network create web
            echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            export IMAGE_TAG=${{ needs.build.outputs.image_tag }}
            docker compose pull
            docker compose up -d --remove-orphans
            # Scoped prune: only THIS project's dangling images.
            docker image prune -f --filter "label=org.opencontainers.image.source=https://github.com/${{ github.repository }}"
      - name: Smoke test
        run: |
          for i in {1..24}; do
            sleep 10
            code=$(curl -sk -o /dev/null -w "%{http_code}" https://<yourdomain>/api/health || echo "000")
            echo "attempt $i → $code"
            [[ "$code" =~ ^(200|301|302|307|308)$ ]] && exit 0
          done
          echo "smoke test failed after 24 attempts"
          exit 1
```

### 5. `.gitignore` additions

```
.env
.env.*
!.env.example
deploy/certs/*.crt
deploy/certs/*.key
```

### 6. (Optional) `scripts/vps-ssh.sh` ops helper

```bash
#!/usr/bin/env bash
set -euo pipefail
VPS_HOST="${VPS_HOST:-169.58.104.249}"
VPS_USER="${VPS_USER:-root}"
KEY="${VPS_KEY:-$HOME/.ssh-<yourapp>/deploy_key}"
APP_DIR="/opt/<yourapp>"
ssh_run() { ssh -i "$KEY" "$VPS_USER@$VPS_HOST" "$@"; }

case "${1:-shell}" in
  shell)   ssh -i "$KEY" "$VPS_USER@$VPS_HOST" ;;
  status)  ssh_run "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" ;;
  logs)
    target="${2:-web}"
    case "$target" in
      web)   ssh_run "cd $APP_DIR && docker compose logs -f --tail=100 web" ;;
      proxy) ssh_run "cd /opt/proxy && docker compose logs -f --tail=100 traefik" ;;
      *)     echo "unknown target: $target" && exit 1 ;;
    esac
    ;;
  restart) target="${2:-web}"; ssh_run "cd $APP_DIR && docker compose up -d --force-recreate $target" ;;
  *)       ssh_run "$@" ;;
esac
```

---

## Bootstrap sequence (once per new project)

### Step 1: Generate a per-project SSH deploy key

```bash
mkdir -p ~/.ssh-<yourapp>
ssh-keygen -t ed25519 -N "" -C "github-actions@<yourdomain>" -f ~/.ssh-<yourapp>/deploy_key
```

### Step 2: Install the deploy pubkey on the VPS

```bash
PUBKEY=$(cat ~/.ssh-<yourapp>/deploy_key.pub)
sshpass -p 'KS8RQ8nrv87tqolDvN' ssh -o StrictHostKeyChecking=accept-new root@169.58.104.249 bash <<EOF
set -e
mkdir -p /opt/<yourapp>
mkdir -p /root/.ssh && chmod 700 /root/.ssh
touch /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys
grep -qxF "$PUBKEY" /root/.ssh/authorized_keys || echo "$PUBKEY" >> /root/.ssh/authorized_keys
EOF

# Verify key-based SSH works
ssh -i ~/.ssh-<yourapp>/deploy_key root@169.58.104.249 "hostname && echo OK"
```

### Step 3: Create the Postgres role + database

```bash
ssh -i ~/.ssh-<yourapp>/deploy_key root@169.58.104.249 bash -s <<'REMOTE'
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE USER <yourapp> WITH PASSWORD '<yourapp>@123';"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE <yourapp> OWNER <yourapp>;"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE <yourapp> TO <yourapp>;"

# Grant docker-bridge access if not already open (one-time per VPS).
PG_HBA=/etc/postgresql/16/main/pg_hba.conf
grep -qE "^host\s+<yourapp>\s+<yourapp>\s+172\.16" "$PG_HBA" || \
  echo "host    <yourapp>    <yourapp>    172.16.0.0/12    scram-sha-256" >> "$PG_HBA"
systemctl reload postgresql

PGPASSWORD='<yourapp>@123' psql -U <yourapp> -d <yourapp> -h 172.17.0.1 -c "SELECT current_user;"
REMOTE
```

Postgres already listens on `172.17.0.1` from the first project's bootstrap. If you're deploying to a fresh VPS with no Postgres tuned yet, also edit `/etc/postgresql/16/main/postgresql.conf`:
`listen_addresses = 'localhost,172.17.0.1'` then `systemctl restart postgresql`.

### Step 4: Add a Redis ACL user

```bash
ssh -i ~/.ssh-<yourapp>/deploy_key root@169.58.104.249 "
sed -i '/^user <yourapp> /d' /etc/redis/redis.conf
echo 'user <yourapp> on ><yourapp>@123 ~<yourapp>:* &* +@all' >> /etc/redis/redis.conf
systemctl restart redis-server
sleep 1
redis-cli -h 172.17.0.1 --user <yourapp> -a '<yourapp>@123' --no-auth-warning ping
redis-cli -h 172.17.0.1 --user <yourapp> -a '<yourapp>@123' --no-auth-warning SET <yourapp>:_probe ok
redis-cli -h 172.17.0.1 --user <yourapp> -a '<yourapp>@123' --no-auth-warning SET foreign:_probe ok  # must be NOPERM
"
```

Also make sure your BullMQ Queue/Worker use `prefix: '<yourapp>'` in code so all keys land under `<yourapp>:*`.

### Step 5: Ship the Cloudflare Origin cert + `.env`

Save the cert PEMs locally at `deploy/certs/<yourdomain>.{crt,key}` (gitignored). Then:

```bash
KEY=~/.ssh-<yourapp>/deploy_key
VPS=169.58.104.249

# .env for the app
cat > /tmp/<yourapp>.env <<'ENV'
NODE_ENV=production
PORT=<YOUR_PORT>
APP_BASE_URL=https://<yourdomain>
DATABASE_URL=postgresql://<yourapp>:<yourapp>%40123@host.docker.internal:5432/<yourapp>
REDIS_URL=redis://<yourapp>:<yourapp>%40123@host.docker.internal:6379
# ... app-specific vars
ENV
scp -i $KEY /tmp/<yourapp>.env root@$VPS:/opt/<yourapp>/.env
rm /tmp/<yourapp>.env

# Cert into the shared Traefik cert dir
scp -i $KEY deploy/certs/<yourdomain>.crt root@$VPS:/opt/proxy/certs/
scp -i $KEY deploy/certs/<yourdomain>.key root@$VPS:/opt/proxy/certs/
ssh -i $KEY root@$VPS "chmod 600 /opt/<yourapp>/.env /opt/proxy/certs/<yourdomain>.key"
```

Note the `%40` in the DB/Redis URLs. That's the URL-encoded `@` for passwords containing `@`.

### Step 6: Wire Traefik to the new cert

```bash
ssh -i $KEY root@$VPS "cat >> /opt/proxy/dynamic/tls.yml" <<EOF
    - certFile: /etc/traefik/certs/<yourdomain>.crt
      keyFile: /etc/traefik/certs/<yourdomain>.key
EOF
# Traefik's file provider hot-reloads. Verify:
ssh -i $KEY root@$VPS "docker exec traefik traefik healthcheck --ping"
```

Alternatively edit `/opt/proxy/dynamic/tls.yml` locally and `scp` the whole file to the same path (the current file has an "Example for adding another project" comment block that just needs the leading `#` removed).

### Step 7: GitHub Actions secrets

```bash
gh secret set VPS_HOST       --repo <owner>/<repo> --body "169.58.104.249"
gh secret set VPS_USER       --repo <owner>/<repo> --body "root"
gh secret set VPS_SSH_PORT   --repo <owner>/<repo> --body "22"
gh secret set VPS_DEPLOY_KEY --repo <owner>/<repo> < ~/.ssh-<yourapp>/deploy_key
```

### Step 8: First push

```bash
git add Dockerfile .dockerignore .gitignore deploy/ scripts/ .github/
git commit -m "infra: dockerize + Traefik CI/CD"
git push origin master
gh run watch --exit-status
```

Watch for: `check` → `build` → `deploy` → `smoke test` all green. On first push, expect about 5-7 minutes total; later pushes are about 3 minutes because of layer cache.

---

## Verification checklist

Run these locally after `gh run watch` finishes:

```bash
KEY=~/.ssh-<yourapp>/deploy_key
VPS=169.58.104.249

# 1) Only two files should live at /opt/<yourapp>/
ssh -i $KEY root@$VPS "ls -la /opt/<yourapp>/"
# expected: exactly `.env` (chmod 600) and `docker-compose.yaml`. Nothing else.

# 2) The running container image should carry only runtime bits
ssh -i $KEY root@$VPS "docker exec <yourapp>-web ls /app"
# expected: dist, node_modules, package.json, package-lock.json, public, tmp
# NOT expected: src, docs, tests, .env, .git, .github, .agents, .vscode

ssh -i $KEY root@$VPS "docker ps | grep <yourapp>"
# expected: <yourapp>-web  Up ... (healthy)

curl -s https://<yourdomain>/api/health | jq .
# expected: {"status":"ok","services":{"database":{"status":"ok"},"redis":{"status":"ok"}}}

curl -skI https://www.<yourdomain>/  | head -3
# expected: HTTP/2 308 (redirect to apex)

ssh -i $KEY root@$VPS "docker logs <yourapp>-web --tail=30"
# expected: no crash loops, migrations complete, SMTP verified if email is used
```

### VPS filesystem discipline

The **only** files that live on the VPS per project are:

```
/opt/<yourapp>/
├── docker-compose.yaml   ← CI overwrites on every deploy
└── .env                  ← manually placed once, chmod 600
```

Nothing else. No `src/`, no cloned repo, no build tools, no dev dependencies, no Node.js installed on the host. Everything runs inside the container image pulled from GHCR. If the VPS dies, rebuilding takes about 10 minutes: run the bootstrap sequence, drop the same two files, `docker compose up -d`.

The **CI/CD workflow enforces this**:
- `scp` step ships only `deploy/docker-compose.yaml`.
- The `ssh` step never `git clone`s anything.
- Container images are built on GitHub's ephemeral runners, not on the VPS.

---

## Common failures and fixes

| Symptom | Cause | Fix |
| --- | --- | --- |
| Cloudflare 526 | SSL/TLS mode wrong | Cloudflare SSL/TLS overview: set to Full (strict) |
| Cloudflare 521 | Traefik down or ufw blocked | `docker ps` on VPS, `ufw status` |
| Cloudflare 404 from Traefik | Container missing `traefik.enable=true` or not on `web` network | Fix compose labels + networks |
| Container `Restarting (1)` with `EACCES: permission denied, mkdir '/app/tmp/...'` | Non-root user cannot mkdir at container root | `RUN mkdir -p /app/tmp/... && chown -R app:nodejs /app/tmp` in Dockerfile |
| `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` in Express logs | Missing `trust proxy` | `app.set('trust proxy', 1)` |
| Redis returns `NOPERM` even for own prefix | ACL user misconfigured | Verify `user <app> on ><pw> ~<app>:* &* +@all` in `/etc/redis/redis.conf` |
| Redis on 172.17.0.1 first refuses connections then works | `bind` line didn't include the bridge, but redis started before docker0 was up | Ensure `bind 127.0.0.1 172.17.0.1 ::1` in redis.conf, then restart. Docker must be running first. |
| GitHub Actions "smoke test failed" but site is live | Cloudflare propagation lag on cert changes | Re-run the failed job. If the container is healthy and `curl` from your machine returns 200, the deploy itself succeeded. |
| Deploy hangs at `docker compose up -d` | Healthcheck path returns 404 | Point HEALTHCHECK at a real endpoint (`/api/health`), not `/`. |

---

## Adding project #3, #4, #N

Everything except Traefik itself is per-project. So for a new project:

1. Reuse the shared `web` network (already exists).
2. Pick an unused internal port (smmcare=5004, webcrawler=5005; next available = 5006).
3. Run Steps 1-8 above. Skip Step 6 if the domain uses a subdomain of an already-configured origin cert.
4. Push.

Traefik hot-reloads and routes new `Host()` labels the moment the container comes up. No downtime for other apps.

---

## Real-world proof

- **smmcare.online** deployed with this pattern (Next.js standalone + BullMQ workers).
- **webcrawler.buzz** deployed with this pattern (Express + BullMQ workers in-process).

Both share the same VPS, the same Traefik proxy, the same Postgres + Redis instances (with per-project role and ACL isolation). Zero downtime on either app while adding the other.
