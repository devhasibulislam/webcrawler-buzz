# Copilot instructions, webcrawler-buzz

## Production VPS (shared, alias `hamzen`)

- Host: `vmi3478000` (169.58.104.249) — also runs `fablo-online`
- SSH: `ssh hamzen`
- App dir: `/opt/webcrawler-buzz/` — `releases/<sha>/` folders with symlink `current`
- Runtime: **native Node 22 + PM2** (no Docker)
- Reverse proxy: shared host nginx, site at `/etc/nginx/sites-enabled/webcrawler-buzz.conf`
- SSL: Cloudflare Origin cert `/etc/ssl/webcrawler/webcrawler.buzz.{crt,key}` (valid to 2041)
- Data services (shared on host):
  - Postgres 16 on `127.0.0.1:5432` — user `webcrawler`, db `webcrawler`
  - Redis 7 on `127.0.0.1:6379` — ACL user `webcrawler` with `~webcrawler:*` keyspace
- BullMQ prefix in code: `webcrawler` (matches Redis ACL)

## PM2 process

| Name | Script | Port | Purpose |
| ---- | ------ | ---- | ------- |
| `webcrawler-buzz` | `dist/index.js` | `127.0.0.1:5005` | Express + BullMQ + cron in one process |

Workers run in-process (see ADR-0002).

## Common ops

```bash
ssh hamzen "pm2 status"
ssh hamzen "pm2 logs webcrawler-buzz --lines 100"
ssh hamzen "pm2 reload webcrawler-buzz"
ssh hamzen "nginx -t && systemctl reload nginx"

# Rollback
ssh hamzen 'prev=$(ls -1dt /opt/webcrawler-buzz/releases/*/ | sed -n 2p) && \
  ln -sfn "$prev" /opt/webcrawler-buzz/current && \
  cd /opt/webcrawler-buzz/current && \
  pm2 delete ecosystem.config.js || true && pm2 start ecosystem.config.js'
```

## Deploy pipeline

Every push to `master` triggers `.github/workflows/deploy.yml`:
1. `check`: `npm ci && npm run lint && npm test`
2. `deploy`: build → tar bundle (`dist/`, `public/`, `package*.json`, `ecosystem.config.js`, `.env.production` → `.env`) → scp to `/opt/webcrawler-buzz/releases/<sha>/` → `npm ci --omit=dev` → `node dist/db/migrate.js` → symlink `current` → `pm2 delete && pm2 start ecosystem.config.js` → prune to last 3 releases
3. Smoke test: 24 × 10s hitting `https://webcrawler.buzz/api/health`

`.env.production` is committed and copied to the release as `.env` at deploy time.

## Reference

Full reusable playbook: [docs/DEPLOYMENT_PLAYBOOK.md](../docs/DEPLOYMENT_PLAYBOOK.md).
