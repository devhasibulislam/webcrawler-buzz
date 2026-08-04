# Copilot instructions, webcrawler-buzz

## Production VPS (Contabo, shared with smmcare.online)

- Hostname: `vmi3478000`
- IP: `169.58.104.249`
- SSH: `ssh -i ~/.ssh-webcrawler-buzz/deploy_key root@169.58.104.249`
- App dir: `/opt/webcrawler-buzz/`  (only `docker-compose.yaml` + `.env`)
- Runtime: Docker only. **No PM2, no host Node.js.**
- Shared reverse proxy: Traefik at `/opt/proxy/` on the `web` external network.
- Host services (shared across projects): Postgres 16 and Redis 7 installed via apt, reached from containers via `host.docker.internal` (mapped to docker `host-gateway`).

## Container

| Name | Image | Port | Purpose |
| ---- | ----- | ---- | ------- |
| `webcrawler-buzz-web` | `ghcr.io/devhasibulislam/webcrawler-buzz-web:<sha>` | `5005/tcp` | Express + BullMQ + cron in one process |

BullMQ workers run in-process (see ADR-0002). No separate worker container.

## Common ops

```bash
KEY=~/.ssh-webcrawler-buzz/deploy_key
VPS=169.58.104.249

# Status
ssh -i $KEY root@$VPS "docker ps | grep webcrawler"

# Logs
ssh -i $KEY root@$VPS "cd /opt/webcrawler-buzz && docker compose logs -f --tail=100 web"

# Force-restart after .env edit
ssh -i $KEY root@$VPS "cd /opt/webcrawler-buzz && docker compose up -d --force-recreate web"

# Traefik logs
ssh -i $KEY root@$VPS "cd /opt/proxy && docker compose logs -f --tail=100 traefik"
```

Or use the ops helper committed at `scripts/vps-ssh.sh`:
```bash
./scripts/vps-ssh.sh status
./scripts/vps-ssh.sh logs web
./scripts/vps-ssh.sh restart web
```

## Deploy pipeline

Every push to `master` triggers `.github/workflows/deploy.yml`:
1. `check`: `npm ci && npm run lint && npm test`
2. `build`: buildx → push `ghcr.io/devhasibulislam/webcrawler-buzz-web:<sha>` and `:latest`
3. `deploy`: scp compose over SSH, `docker compose pull && up -d`
4. `smoke test`: 24 attempts × 10s hitting `https://webcrawler.buzz/api/health`

**Do not run manual `pm2`, `npm`, or `node` on the VPS.** Everything goes through git push.

## Reference

Full reusable playbook: [docs/DEPLOYMENT_PLAYBOOK.md](../docs/DEPLOYMENT_PLAYBOOK.md).
