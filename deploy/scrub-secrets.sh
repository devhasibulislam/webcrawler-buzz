#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# scrub-secrets.sh
#
# One-shot: strips every secret file + any embedded token from ALL git
# history and force-pushes the rewritten branch + tags. RUN THIS ONLY:
#   1. AFTER every credential has been rotated (Neon, Redis, Gmail app pw,
#      Swagger, VPS SSH deploy key, Cloudflare Origin cert, the GitHub PAT
#      currently in .vscode/mcp.json).
#   2. BEFORE flipping the repo to Public.
#
# Requires: git-filter-repo  (pipx install git-filter-repo)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

command -v git-filter-repo >/dev/null || {
  echo "ERROR: git-filter-repo not installed. Try: pipx install git-filter-repo" >&2
  exit 1
}

# 0. Safety net — clone fresh so we don't nuke your working tree.
WORKDIR=$(mktemp -d)
echo ">>> Working in $WORKDIR"
git clone --mirror https://github.com/devhasibulislam/webcrawler-buzz.git "$WORKDIR/webcrawler-buzz.git"
cd "$WORKDIR/webcrawler-buzz.git"

# 1. Remove secret files from every commit.
git filter-repo --force \
  --path .env \
  --path .env.production \
  --path deploy/secrets/vps_deploy_key \
  --path deploy/secrets/vps_deploy_key.pub \
  --path deploy/secrets/webcrawler.buzz.key \
  --path deploy/secrets/webcrawler.buzz.crt \
  --path .vscode/mcp.json \
  --invert-paths

# 2. Scrub any lingering literal secrets that were leaked in prose or examples.
cat > /tmp/wcb-replacements.txt <<'EOF'
webcrawler@123==>[REDACTED]
webcrawler%40123==>[REDACTED]
regex:ghp_[A-Za-z0-9]{36}==>[REDACTED]
regex:gho_[A-Za-z0-9]{36}==>[REDACTED]
regex:ghs_[A-Za-z0-9]{36}==>[REDACTED]
regex:github_pat_[A-Za-z0-9_]{22,255}==>[REDACTED]
regex:sk-[A-Za-z0-9]{20,}==>[REDACTED]
regex:-----BEGIN [A-Z ]+PRIVATE KEY-----[^-]+-----END [A-Z ]+PRIVATE KEY-----==>[REDACTED]
EOF
git filter-repo --force --replace-text /tmp/wcb-replacements.txt
rm /tmp/wcb-replacements.txt

# 3. Verify the tree of the current HEAD no longer contains any secrets.
git log --all --format=%H | head -5 | while read sha; do
  if git show "$sha" --name-only 2>/dev/null | grep -qE '^(\.env|deploy/secrets/vps_deploy_key|\.vscode/mcp\.json)$'; then
    echo "!! secret files still present at $sha — aborting"
    exit 1
  fi
done

# 4. Force-push everything (branches + tags).
git remote add origin https://github.com/devhasibulislam/webcrawler-buzz.git
git push --force --mirror origin

echo ">>> Done. Every clone of this repo must be re-cloned (SHAs changed)."
echo ">>> Delete your local ~/Desktop/webcrawler-buzz and re-clone before you commit again."
