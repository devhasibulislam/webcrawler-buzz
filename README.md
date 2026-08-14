<p align="center">
  <img src="https://webcrawler.buzz/favicon.svg" alt="WebCrawler.buzz" width="88" />
</p>

<h1 align="center">WebCrawler.buzz</h1>

<p align="center">
  Free open-source website crawler and SEO auditor.<br/>
  Paste a URL, get every page with its title, status code, response time, and indexability.
</p>

<p align="center">
  <a href="https://webcrawler.buzz">Live app</a> ·
  <a href="https://webcrawler.buzz/api-docs-public">API docs</a> ·
  <a href="https://webcrawler.buzz/mcp">MCP server</a> ·
  <a href="https://webcrawler.buzz/blogs">Blog</a> ·
  <a href="CONTRIBUTING.md">Contributing</a> ·
  <a href="SECURITY.md">Security</a>
</p>

<p align="center">
  <a href="https://github.com/devhasibulislam/webcrawler-buzz/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-black.svg" alt="MIT" /></a>
  <a href="https://webcrawler.buzz/api/health"><img src="https://img.shields.io/badge/status-live-brightgreen.svg" alt="Live" /></a>
  <img src="https://img.shields.io/badge/node-%E2%89%A522-black.svg" alt="Node.js >=22" />
  <img src="https://img.shields.io/badge/typescript-strict-black.svg" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/lighthouse-100%2F100%2F100%2F100-black.svg" alt="Lighthouse 100" />
  <a href="https://webcrawler.buzz/mcp"><img src="https://img.shields.io/badge/MCP-supported-black.svg" alt="MCP" /></a>
</p>

## What it does

Paste any URL. WebCrawler.buzz walks the whole domain breadth-first and returns every discovered page with:

- URL, page title, meta description
- HTTP status code, response time, content type, page size
- Internal + external link counts, redirect destination
- Indexability (noindex / canonical / robots)

No signup, no page limits, no API key. Close the tab, come back later, your tracking URL still works. Get an email when a large crawl finishes. Export the whole thing as CSV.

**Who it's for**

- SEO folks auditing client sites
- Developers checking link health before a migration or release
- Content teams inventorying pages across a big site
- AI agents (Claude, Cursor, VS Code Copilot, Codex) via the built-in MCP server

## Features

| | |
|---|---|
| **BFS crawl** | Scoped to the root domain, no depth limit |
| **Live progress** | Server-sent progress polled every 2 s on the homepage |
| **Bookmarkable tracking URL** | Close the tab, come back any time |
| **Email notifications** | Optional. Get pinged when the crawl finishes |
| **CSV export** | Full report by email, signed link valid for 5 min |
| **Duplicate detection** | Already crawled? Re-use or re-crawl fresh |
| **Auto-cleanup** | Crawls expire after 1 hour, exports after 5 min |
| **MCP server** | Streamable HTTP MCP at `/mcp` — 7 tools for AI agents |
| **REST API** | Every button on the site is backed by a public JSON endpoint |
| **Lighthouse 100** | Accessibility · Best Practices · SEO · Agentic Browsing, mobile + desktop |
| **Security** | Helmet CSP, CORS, rate limiting, parameterised SQL, CodeQL SAST |

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser or MCP client (Claude, Cursor, VS Code, Codex, …)       │
└─────┬──────────────────────────────────┬─────────────────────────┘
      │  REST /api/crawl/**              │  MCP /mcp (Streamable HTTP)
      ▼                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  Express v5  ·  Helmet CSP  ·  compression  ·  express-rate-limit│
│  routes → controllers → services → BullMQ producers               │
└─────┬────────────────────┬────────────────────┬─────────────────┘
      ▼                    ▼                    ▼
┌───────────┐        ┌──────────────┐    ┌─────────────────┐
│ Postgres  │        │ Redis + BullMQ│   │ Gmail SMTP      │
│ 3 tables  │        │ crawler workers│   │ notify + export │
│ crawl_jobs│        │ export workers │   │ links           │
│ pages     │        │ auto-retries   │   │                 │
│ csv_exports│       └──────────────┘    └─────────────────┘
└───────────┘
```

Single Node process on prod (PM2 on the shared VPS). Workers, cron, and HTTP all live in-process — see [ADR-0002](docs/adr/ADR-0002-single-process-architecture.md) for the rationale.

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Language | TypeScript 5.9, strict mode |
| Framework | Express v5 |
| Database | PostgreSQL 16 (self-hosted on VPS) |
| DB client | `pg` with parameterised queries |
| Queue | BullMQ 5 on Redis 7 |
| Crawling | `axios` + `cheerio` |
| Email | Nodemailer + Gmail app password |
| Markdown | `marked` (blog SSR) |
| MCP | `@modelcontextprotocol/sdk` 1.30, Streamable HTTP |
| API docs | Swagger UI (OpenAPI 3) |
| Security | Helmet, `express-rate-limit`, CORS |
| Testing | Vitest, Playwright |
| CI/CD | GitHub Actions → shared VPS with PM2 |
| Design system | Monochrome tokens in `public/theme.css`, Lucide icons via CDN |

## Quick start

```bash
git clone https://github.com/devhasibulislam/webcrawler-buzz.git
cd webcrawler-buzz
npm install
cp .env.example .env
# edit .env with your local Postgres and Redis URLs
npm run migrate
npm run dev
```

The app runs at http://localhost:5005. See [`.env.example`](.env.example) for the full list of required environment variables.

## REST API

All endpoints are documented at [webcrawler.buzz/api-docs-public](https://webcrawler.buzz/api-docs-public) (rendered from OpenAPI). Quick reference:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/crawl` | Start a crawl. Returns `job_id` + `tracking_url` |
| `POST` | `/api/crawl/decide` | Decide re-crawl vs. use existing when a domain is a duplicate |
| `GET`  | `/api/crawl/:job_id/progress` | Polling endpoint for the progress bar |
| `GET`  | `/api/crawl/:job_id?page=1&limit=50` | Paginated results |
| `POST` | `/api/crawl/:job_id/notify` | Register an email for crawl-complete notification |
| `POST` | `/api/crawl/:job_id/export` | Kick off a CSV export |
| `GET`  | `/api/crawl/:job_id/export/status` | Poll export status |
| `GET`  | `/api/health` | Health check (Postgres + Redis) |
| `GET`  | `/api/stats` | Public usage counters |

Example:

```bash
curl -X POST https://webcrawler.buzz/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://devhasibulislam.vercel.app"}'
```

```json
{
  "status": "started",
  "job_id": "9c8b4d20-1a5e-4f2c-b7a1-3e8d9c0f5a11",
  "tracking_url": "https://webcrawler.buzz/results?job_id=9c8b4d20-1a5e-4f2c-b7a1-3e8d9c0f5a11",
  "message": "Crawl started! Use tracking_url to follow progress."
}
```

## MCP server

Model Context Protocol (Streamable HTTP) at `https://webcrawler.buzz/mcp`. No auth, no API key.

Add it once, and any MCP client can call the crawler from a conversation:

```json
{
  "mcpServers": {
    "webcrawler-buzz": {
      "url": "https://webcrawler.buzz/mcp"
    }
  }
}
```

Seven tools available: `start_crawl`, `decide_duplicate`, `get_crawl_progress`, `get_crawl_results`, `set_notify_email`, `request_csv_export`, `get_csv_export`. Full setup for Claude Desktop, Claude Code, Cursor, VS Code, Copilot, Codex, Windsurf, and Zed is on the [/mcp page](https://webcrawler.buzz/mcp).

## Project structure

```
webcrawler-buzz/
├── src/
│   ├── index.ts                # Express + workers + cron in one process
│   ├── routes/                 # crawler / operational / view (HTML)
│   ├── controllers/            # crawler.controller · view.controller (blog SSR)
│   ├── services/               # crawler · job · email · export
│   ├── queue/                  # BullMQ producers + workers
│   ├── cron/                   # export-cleanup
│   ├── mcp/                    # MCP server + 7 tools
│   ├── middleware/             # helmet CSP · swagger basic auth
│   ├── db/                     # client · migrate
│   ├── utils/                  # url.utils (BFS-safe URL handling)
│   ├── swagger/                # OpenAPI spec
│   └── types/                  # shared TypeScript interfaces
├── public/
│   ├── *.html                  # 11 static pages, header/footer baked in for CLS 0
│   ├── theme.css               # design system tokens (monochrome, light/dark)
│   ├── layout.js               # theme init · toggle · mobile menu · Lucide bootstrap
│   ├── cookie-consent.js       # GDPR banner (styled with theme tokens)
│   ├── blogs.json              # blog content (Markdown section bodies)
│   ├── favicon.svg + PNGs      # Lucide radar mark, monochrome
│   ├── og-image.png            # 1200x630 social preview
│   └── site.webmanifest        # PWA manifest
├── docs/adr/                   # ADR-0001 BullMQ · ADR-0002 single-process · ADR-0003 SSL
├── deploy/nginx/               # webcrawler-buzz.conf (shared host)
├── .github/                    # dependabot · codeql · issue + PR templates
└── tests/                      # unit (vitest) + e2e (Playwright)
```

## Deploy

Push to `master` → `.github/workflows/deploy.yml` runs `check` (lint + tests) → `deploy` (build → tarball → scp → `npm ci --omit=dev` → `node dist/db/migrate.js` → symlink → PM2 restart → smoke test). `.env.production` is materialised in the runner from the `ENV_PRODUCTION` repo secret; nothing sensitive lives in the tree. Full details: [.github/copilot-instructions.md](.github/copilot-instructions.md).

## Security

- **Helmet CSP** with an explicit `script-src`, `style-src`, `img-src`, `font-src`, `connect-src`, `frame-src`
- **CORS** restricted to `ALLOWED_ORIGIN`
- **Rate limit**: 200 POST per 15 min per IP; MCP `/mcp` has its own limiter (300 / 15 min)
- **Parameterised queries** for every SQL statement, no string concat
- **CodeQL** SAST on every push and weekly
- **Dependabot** grouped minor/patch npm + `github-actions` upgrades weekly
- **Secret scanning + push protection** enabled automatically on the public repo
- **Auto-cleanup**: crawls expire in 1 hour, exports in 5 min, no persistent user data

Report a vulnerability privately via [GitHub security advisories](https://github.com/devhasibulislam/webcrawler-buzz/security/advisories/new) — see [SECURITY.md](SECURITY.md).

## Contributing

PRs welcome. Every PR runs the same `lint + test + build` gate as the deploy job. See [CONTRIBUTING.md](CONTRIBUTING.md) for the flow, and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations.

## License

[MIT](LICENSE).

## Author

**Hasibul Islam** · Full-Stack Developer

- GitHub · [@devhasibulislam](https://github.com/devhasibulislam)
- Email · [devhasibulislam@gmail.com](mailto:devhasibulislam@gmail.com)
- Web · [webcrawler.buzz](https://webcrawler.buzz)
