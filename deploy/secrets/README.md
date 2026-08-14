# deploy/secrets — webcrawler-buzz

All operational secrets and credentials for the production VPS. Committed to the
repo intentionally (user policy: single source of truth, accept the risk).

## Files

| File | Purpose |
| ---- | ------- |
| `webcrawler.buzz.crt` | Cloudflare Origin cert, installed at `/etc/ssl/webcrawler/webcrawler.buzz.crt` on the VPS |
| `webcrawler.buzz.key` | Matching private key, installed at `/etc/ssl/webcrawler/webcrawler.buzz.key` (chmod 600) |
| `vps_deploy_key` | ed25519 private key used by GitHub Actions to SSH the VPS. Also stored as the `VPS_DEPLOY_KEY` GitHub secret |
| `vps_deploy_key.pub` | Public half, appended to `/root/.ssh/authorized_keys` on the VPS |

## VPS

- Alias: `hamzen` (in `~/.ssh/config` on dev machines)
- Host: `169.58.104.249` (`vmi3478000`)
- User: `root`
- SSH port: `22`
- OS: Ubuntu 24.04 (Noble), Node 22, PM2 7, nginx 1.24
- Also hosts: `fablo-online`

## GitHub Actions secrets

```
VPS_HOST       = 169.58.104.249
VPS_USER       = root
VPS_SSH_PORT   = 22
VPS_DEPLOY_KEY = <contents of vps_deploy_key>
```

Rotate with:
```
gh secret set VPS_DEPLOY_KEY -R devhasibulislam/webcrawler-buzz < deploy/secrets/vps_deploy_key
```

## Data services on the VPS

### PostgreSQL 16 — listening on `127.0.0.1:5432`
- Root user: `postgres` / `19691`
- App user: `webcrawler` / `<REDACTED>`
- App database: `webcrawler` (owned by `webcrawler`)

Manual access:
```
ssh hamzen "PGPASSWORD='<REDACTED>' psql -h 127.0.0.1 -U webcrawler -d webcrawler"
```

### Redis 7 — listening on `127.0.0.1:6379`
- `requirepass`: `19691` (default user)
- ACL user: `webcrawler` / `<REDACTED>`, keyspace `~webcrawler:*`, categories `+@all`
- BullMQ prefix in code: `webcrawler` (matches ACL)

Manual access:
```
ssh hamzen "redis-cli -a 19691 --no-auth-warning ACL LIST"
ssh hamzen "redis-cli --user webcrawler -a '<REDACTED>' --no-auth-warning KEYS 'webcrawler:*' | head"
```

## App runtime credentials

Full `.env.production` (committed at repo root) reflects all of the above plus:
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` (Nodemailer)
- `SWAGGER_USERNAME` / `SWAGGER_PASSWORD` (Basic Auth on `/api-docs`)

## Installing cert/key on the VPS (first time only)

```
scp deploy/secrets/webcrawler.buzz.crt hamzen:/etc/ssl/webcrawler/
scp deploy/secrets/webcrawler.buzz.key hamzen:/etc/ssl/webcrawler/
ssh hamzen "chmod 600 /etc/ssl/webcrawler/*.key /etc/ssl/webcrawler/*.crt && nginx -t && systemctl reload nginx"
```

Cert validity: 2026-05-02 → 2041-04-28 (15 years, Cloudflare Origin CA).
