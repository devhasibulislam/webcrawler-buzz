# Copilot Instructions, webcrawler-buzz

## VPS Access (Production Server)

- **Hostname**: vmi3273132
- **IP**: 167.86.124.99
- **Port**: 22
- **Username**: root
- **Password**: 9qUUc3FB9FDgr6aVdU0
- **SSH**: `ssh root@167.86.124.99` (key-based auth set up from devhasibulislam local machine)
- **App Dir**: `/root/webcrawler-buzz`
- **Process Manager**: PM2

### PM2 Processes

| Name                     | Role                      |
| ------------------------ | ------------------------- |
| `smmcare-online`         | Main app (Express server) |
| `smmcare-sync-worker`    | Sync worker               |
| `smmcare-email-worker`   | Email worker              |
| `smmcare-prices-worker`  | Prices worker             |
| `smmcare-balance-worker` | Balance worker            |

### Quick Commands

```bash
# Check status
ssh root@167.86.124.99 "pm2 status"

# Restart all
ssh root@167.86.124.99 "pm2 restart all"

# View logs
ssh root@167.86.124.99 "pm2 logs --lines 50"

# Restart specific process
ssh root@167.86.124.99 "pm2 restart smmcare-online"
```
