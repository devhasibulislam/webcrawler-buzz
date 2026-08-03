#!/usr/bin/env bash
# webcrawler.buzz VPS ops helper.
# Usage:
#   ./scripts/vps-ssh.sh                     # interactive shell
#   ./scripts/vps-ssh.sh status              # docker ps
#   ./scripts/vps-ssh.sh logs [web|proxy]    # tail logs
#   ./scripts/vps-ssh.sh restart web         # force-recreate web
#   ./scripts/vps-ssh.sh 'df -h && free -h'  # arbitrary command
set -euo pipefail

VPS_HOST="${VPS_HOST:-169.58.104.249}"
VPS_USER="${VPS_USER:-root}"
KEY="${VPS_KEY:-$HOME/.ssh-webcrawler-buzz/deploy_key}"
APP_DIR="/opt/webcrawler-buzz"

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
  restart)
    target="${2:-web}"
    ssh_run "cd $APP_DIR && docker compose up -d --force-recreate $target"
    ;;
  *)       ssh_run "$@" ;;
esac
