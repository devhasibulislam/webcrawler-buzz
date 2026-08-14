# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.8] - 2026-08-14

### Added
- Full modern favicon set: adaptive `favicon.svg`, multi-res `favicon.ico` (16/32/48), 180x180 `apple-touch-icon.png`, 192x192 and 512x512 PWA icons, Safari pinned-tab `mask-icon.svg`, and a `site.webmanifest`.
- `theme-color` meta tags per light/dark scheme so the mobile browser chrome matches the active theme.
- Preloader on every HTML page that sets `data-theme` synchronously from `localStorage` or `prefers-color-scheme` before first paint, then fades out on `load`.
- Lucide icon library CDN wired through `layout.js` and used in every card grid, brand mark, back-link, and export button.
- Live `cookieconsentchange` custom event so the cookie-policy page's status label updates the moment consent changes.
- CSS rule that stretches an orphaned last card across the whole row in `.grid-3` layouts.
- Mobile hamburger menu with a popover-style dropdown, anchored to the toggle, `min(60vw, 240px)` wide.
- Sticky footer via a body-level flex column so short pages (progress, empty results, 404) keep the footer at the viewport bottom.
- OG social preview image and full `og:image` / `twitter:card` meta on every page.
- Blog post section bodies now render as full Markdown via `marked` (fenced code blocks, tables, task lists, autolinks, hard breaks), with an auto-fence pass so legacy plain-text bodies containing raw JSON still render as `<pre><code>`.
- Scroll-spy on the `/api-docs-public` sidebar TOC so the endpoint currently in view stays highlighted and the URL hash follows.
- MCP server now advertises `serverInfo.icons[]`, `title`, `websiteUrl`, and the correct `version`, so Claude Connectors and other MCP clients pick up the new radar mark instead of a stale scraped favicon.
- Public-repo prep: `.env.example`, `.github/dependabot.yml`, `.github/workflows/codeql.yml`, structured issue templates, PR template, `FUNDING.yml` scaffold, 1280x640 social preview image, and [`deploy/scrub-secrets.sh`](deploy/scrub-secrets.sh) — a ready-to-run `git filter-repo` runbook that strips secret files and literal password/token strings from every commit.

### Changed
- Full monochrome, Vercel-style redesign of every public page: new design tokens, cards, hero, `.prose` typography, and consistent spacing across index, about, mcp, blogs, blog-post, results, 404, legal pages, `/api-docs-public`, and `/results`.
- Header brand mark and every card icon now render via Lucide instead of ad-hoc SVGs or emoji glyphs.
- Every unicode arrow (`<-`, `->`) and emoji glyph in link and button labels replaced with proper Lucide icons.
- `.prose` back-links and CTA buttons no longer inherit the underline / muted color from `.prose a`.
- `.prose ul` and `.prose ol` restore `list-style: disc` / `list-style: decimal` after Tailwind Preflight's global `list-style: none`, so the legal pages show proper bullets and numbers again.
- `.env.production` is no longer tracked in the repo. The deploy workflow materialises it from the `ENV_PRODUCTION` GitHub Actions secret at build time.
- `<link rel="stylesheet" href="/theme.css">` is baked directly into every HTML `<head>` (no longer injected by `layout.js`), so first paint is fully styled — Lighthouse CLS dropped from ~1.0 to 0.00.
- Header + footer HTML baked into every page for the same reason (no runtime injection = no layout shift).
- Static assets versioned with `?v=` query strings so a version bump busts every browser cache automatically; Express sends `Cache-Control: no-cache` on `.html` so browsers always revalidate.
- CSP allowed sources tightened but expanded to cover `fonts.googleapis.com` / `fonts.gstatic.com` (Geist), `unpkg.com` (Lucide), and Cloudflare Insights.
- Blog post server-render pipeline: intro, sections, and conclusion all go through `marked` rendering. Section bodies pass through `autoFenceCodeBlocks()` first so legacy JSON snippets get wrapped in ` ```json ` fences before being rendered.
- Cookie consent banner id renamed to `#wcb-notice-bar` so Brave shields and uBlock Origin's `easylist-cookie` stop hiding it. Banner redesigned as a floating card that uses theme tokens.
- Homepage MCP pill kept on one line on mobile: hides the long trailing "for Claude, Cursor & VS Code" segment below 640px so the pill shape stays pill-shaped.
- Hero form on mobile no longer balloons: the input's `flex: 1 1 240px` was interpreted as a 240px *height basis* under the column-direction media query; overridden to `flex: 0 0 auto; width: 100%`.
- Notify form on the homepage is now a single-column grid (input and Notify me both stretch to `max-width: 320px`), with a stricter email pattern than the plain `type="email"`.
- Notify form disables the input and locks the button label to "Notification set" after a successful subscribe, so the user cannot spam the endpoint.
- Cookie consent banner strong tags and paragraph get explicit `background-color: #1f2937`; theme.css `#cookie-consent-banner` overrides removed. Axe now reads correct contrast and the banner clears WCAG AA.
- Dark theme `--fg-muted` bumped from `#a1a1aa` to `#d4d4d8` and `--fg-subtle` from `#71717a` to `#a1a1aa` so kicker text, footer copyright, and every muted-tone span satisfy WCAG AA contrast.
- `/api-docs-public` fully rewritten to the monochrome design with an endpoint-anchored sidebar TOC, sticky above `1000px`, method chips using oklab color-mix, `<pre>` code blocks that scroll internally on narrow screens, a table of query params that also scrolls internally. Sample values use realistic UUIDs and `https://devhasibulislam.vercel.app` instead of `example.com` / `abc-123-def`.
- `/results` fully rewritten while preserving every existing flow: same `?job_id=` query, same 3 API calls, same 5 UI states, monochrome table with sticky monospace header, coloured status badges, Lucide check/x for indexability, compact numbered pagination, `role="dialog"` export modal with Esc-to-close and backdrop-click-to-close.
- Deploy job now sources `.env.production` from the `ENV_PRODUCTION` GitHub Actions secret at every run instead of copying a tracked file.

### Fixed
- Theme toggle no longer breaks under Helmet's CSP: moved from inline `onclick` to `addEventListener` in `layout.js`.
- Blog list and blog post pages read the correct JSON fields (`published_at`, `content.intro`, `content.sections`, `content.conclusion`).
- `<!-- {{OG_ARTICLE_TAGS}} -->` placeholder no longer leaks into the rendered HTML.
- Homepage crawl-progress polling: the API returns snake_case (`job_id`, `tracking_url`, `progress_percent`, `total_pages_found`) but the JS was reading camelCase, so the tracking link stayed blank, progress polled `/api/crawl/status/undefined`, and the UI showed "Lost connection. Retrying…" forever. Rewired to the actual server field names + endpoint path.
- Redirect from homepage-complete to `/results.html` used `?jobId=` but `results.html` reads `?job_id=`.
- Card-heavy pages (`/mcp`, `/api-docs-public`) no longer overflow horizontally on narrow viewports: grid children get `min-width: 0`, `<pre>` inside cards gets `max-width: 100%` + `overflow-x: auto`, inline `<code>` gets `overflow-wrap: anywhere`. No `overflow: hidden` used anywhere.
- Duplicate deployment of `/robots.txt` and `/sitemap.xml` handlers in `src/index.ts` and `src/routes/view.routes.ts` — the view.controller versions are unreachable dead code (not removed yet, flagged in ponytail audit).
- Hero headline balance: mobile `<h1>` floor lowered to `2rem` and `text-wrap: balance` added so "Crawl any website." and "Audit every page." both fit on one line without a 3-line wrap.

### Security
- Rotated every production credential: Postgres role password, Redis `default` requirepass, Redis `webcrawler` ACL user password, Swagger basic-auth password, Gmail app password, VPS SSH deploy key. Old passwords now return `password authentication failed` / `WRONGPASS`. New values live in the `ENV_PRODUCTION` GitHub Actions secret and the VPS filesystem only.
- Redacted `webcrawler@123` plaintext from `COPILOT_CONTEXT.md` and `deploy/secrets/README.md` at HEAD.
- `.gitignore` hardened to block `.env*` (except `.env.example`), `deploy/secrets/`, `*.key`, `*.pem`, editor state.

### Note on git history
- Previous tags (`v2.2.7`, `v2.2.8`, and the earlier `v2.3.8` at commit `ab7b135`) still reference commits that contained `.env`, `.env.production`, `.vscode/mcp.json`, and `deploy/secrets/*`. Every credential in those files has been rotated (see Security above), so the leaked values no longer authenticate anywhere. The staged history rewrite ([`deploy/scrub-secrets.sh`](deploy/scrub-secrets.sh)) will strip these files from every past commit; run it before flipping the repo to Public.

## [2.2.8] - 2026-08-04

### Added
- Docker-based production deployment to Contabo VPS (169.58.104.249) behind shared Traefik reverse proxy, replacing the previous PM2/nvm setup.
- `docs/DEPLOYMENT_PLAYBOOK.md`: reusable, end-to-end playbook capturing the whole VPS shape (shared Traefik + host-installed Postgres 16 + Redis 7 + `host.docker.internal` bridge + GHCR-backed CI/CD).
- OCI `org.opencontainers.image.source` label on every image so `docker image prune` on the shared VPS only touches this project's dangling layers.
- Sparse-checkout in the deploy job: runner pulls only `deploy/` (about 2 KB) instead of the whole repo.

### Changed
- `.dockerignore` switched from blacklist to strict allowlist. Build context shrunk from about 30 MB to about 1.3 MB; new files added to the repo default to excluded.
- Traefik router now serves both `webcrawler.buzz` and `api.webcrawler.buzz` from the same container, with a `www.` -> apex 308 redirect.
- Express now sets `trust proxy = 1` so `req.ip` resolves to the real Cloudflare client IP and `express-rate-limit` keys by client instead of Traefik container IP.
- Dockerfile pre-creates `/app/tmp/exports` with `app:nodejs` ownership so the non-root runner can write CSVs on first boot.
- Export button on the results page now resets as soon as the worker moves past the `processing` status, instead of staying stuck on "Exporting..." for the 5-minute server-side cooldown.
- Footer no longer duplicates Home and MCP links that already appear in the header.
- Header logo uses natural aspect ratio (`class="h-10"` only, no forced width/height attributes).
- Humanized prose across all public pages, blogs, dev docs, and code comments: 693 em/en dashes replaced with commas, colons, or hyphens per Wikipedia's "Signs of AI writing" guide.

### Removed
- `VPS_DEPLOYMENT.md` (old PM2/nvm guide, superseded by `docs/DEPLOYMENT_PLAYBOOK.md`).
- `ecosystem.config.cjs` (PM2 config, no longer used).
- `.agents/` (430 vendor Copilot skill files), `skills-lock.json`, and other editor state removed from git history.
- `.env` file untracked from git; secrets are shipped to the VPS manually via `scp`.

### Fixed
- `EACCES: permission denied, mkdir '/app/tmp/exports'` on container startup.
- `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` from `express-rate-limit` behind Traefik.
- Redis on `172.17.0.1` initially refused connections until Docker's `docker0` bridge came up; documented the bind ordering fix in the playbook.

## [2.2.7] - 2026-07-20

### Added
- Public MCP (Model Context Protocol) server at `/mcp` with 7 tools: `start_crawl`, `decide_duplicate`, `get_crawl_progress`, `get_crawl_results`, `set_notify_email`, `request_csv_export`, `get_csv_export`
- MCP documentation page at `/mcp` with copy-paste install snippets for Claude, Cursor, VS Code, and Codex
- New blog post: "Connect WebCrawler.buzz to Claude, Cursor, and VS Code with One URL (MCP)"
- Hero section MCP promo pill on the home page linking to `/mcp`
- Per-IP anti-abuse guards on `set_notify_email` and email-based `request_csv_export` (max 5 per hour per IP)
- Sitemap entries for `/mcp` and the new blog post

### Changed
- BullMQ queues now use `webcrawler:` key prefix to align with Redis ACL isolation on shared Redis instances
- MCP transport switched to sessioned Streamable HTTP for Claude Desktop / Claude.ai compatibility
- Nginx `/mcp` location added with `proxy_buffering off` for SSE support
- CI/CD workflow now packages `package-lock.json` and runs DB migrations on the VPS after deploy
- Rate limit for `/mcp` set to 300 requests per 15 min per IP
- CSV export `email` column made nullable (MCP export flow allows email-less exports)
- Version bump from 1.2.7 to 2.2.7

### Fixed
- `.env` URL-encoding for `@` in `DATABASE_URL` and `REDIS_URL` (`%40`)
- BullMQ `IRedisClient` type cast for `.ping()` in health check
- `/mcp` docs page now includes the site-standard header, footer, and responsive styling to match the rest of the site

## [1.2.7] - 2026-05-07

### Fixed
- Content Security Policy updated to allow Cloudflare Web Analytics beacon (`static.cloudflareinsights.com`)
- Best Practices Lighthouse score restored to 100/100

### Changed
- Version bump from 1.2.6 to 1.2.7

## [1.2.6] - 2026-05-02

### Added
- Testing framework with Vitest (unit) and Playwright (e2e) including initial test suites
- Database performance indexes on `crawl_jobs`, `crawled_pages`, and `csv_exports` tables
- Compression middleware (gzip/brotli) for all HTTP responses
- VPS deployment guide (`VPS_DEPLOYMENT.md`) with detailed setup instructions
- PM2 ecosystem configuration (`ecosystem.config.cjs`)
- `CONTEXT.md` with project architecture and domain context
- ADR documentation (`docs/adr/`) for key architectural decisions

### Changed
- Rewrote GitHub Actions deployment workflow with build-on-CI, artifact packaging, and zero-downtime deploy
- Strengthened Content Security Policy with explicit directives replacing blanket disable
- Added HSTS with `includeSubDomains` and `preload` flags
- Redis configuration updated to support ACL authentication
- Improved `content-type` header handling to ensure string coercion
- Updated blog post timestamp color for better readability (`text-gray-400` → `text-gray-500`)
- Version bump from 1.2.5 to 1.2.6

### Fixed
- Redis URL format corrected for ACL-based authentication
- `content-type` header type safety in crawler service

## [1.2.5] - 2026-04-07

### Changed
- SEO keyword optimization across all HTML pages based on Google Search Console data
- Updated title tags, meta descriptions, OG tags, Twitter tags, H1s, H2s, and body content to highlight high-impression and high-CTR keywords
- Prioritized keywords: web crawler online, domain crawler online, web crawl online, website crawler online free, crawl website online, free web crawler
- Updated JSON-LD alternateName with additional keyword variants
- Updated llms.txt and llms-full.txt with refreshed keyword positioning
- Version bump from 1.2.4 to 1.2.5

## [1.2.4] - 2026-04-06

### Changed
- Inlined CSS into all HTML pages to eliminate render-blocking stylesheet request
- Self-hosted Google Sans fonts with `font-display: optional` replacing external Google Fonts loading
- Optimized logo to WebP with `<picture>` element and srcset (66 KB → 3.5 KB)
- Shortened homepage title (75 → 58 chars) and meta description (228 → 154 chars)
- Added WebSite + SearchAction JSON-LD structured data on homepage
- Added `<main>` landmark and aria-labels for improved accessibility
- Unique alt texts on all Product Hunt badge images
- Removed deprecated `<meta name="keywords">` from all pages
- Rewrote keyword-stuffed about page section into natural helpful content
- Added all three Product Hunt badges (review, follow, featured) to every page footer
- Version bump from 1.2.3 to 1.2.4

## [1.2.3] - 2026-04-05

### Added
- Retroactive email notifications: if a crawl completes before the user submits their email, the notification is sent immediately
- SMTP connection verification on startup with status logging
- Product Hunt badge added to the 404 page footer
- Redis username support and URL-decoded password handling across all queue/worker configurations

### Changed
- Complete homepage redesign with gradient hero banner, capabilities grid, who-it's-for personas, FAQ accordion, CTA section, and FAQPage JSON-LD structured data
- Sticky header and improved semantic HTML structure with proper heading hierarchy
- Footer redesigned with Product Hunt badges (review, follow, featured) across pages
- Improved error handling on crawl submission form (handles all non-OK responses)
- Redis URL switched to local configuration for development
- Version bump from 1.2.2 to 1.2.3

## [1.2.2] - 2026-03-31

### Changed
- Complete homepage redesign with gradient hero banner, capabilities, all-features grid, who-it's-for personas, FAQ accordion, and CTA section
- Added FAQPage JSON-LD structured data for rich snippets and AEO visibility
- Sticky header for better navigation
- Footer now includes all three Product Hunt badges (review, follow, featured)
- Improved semantic HTML structure with proper heading hierarchy
- Version bump from 1.2.1 to 1.2.2

## [1.2.1] - 2026-03-21

### Fixed
- Google Search Console "Couldn't fetch" errors for `/sitemap.xml`, `/llms.txt`, and `/llms-full.txt`
- Added explicit Express routes for `/sitemap.xml`, `/llms.txt`, `/llms-full.txt` with correct `Content-Type` headers (`application/xml` and `text/plain`)
- Files were previously only served via `express.static`, requests could fall through to the catch-all 404 handler behind Cloudflare + Nginx

### Changed
- Version bump from 1.2.0 to 1.2.1

## [1.2.0] - 2026-03-18

### Added
- `/about` page with project transparency, tech stack, and author info
- `/api-docs-public`, public read-only API documentation page
- `GET /api/health`, health check endpoint (DB + Redis status)
- `GET /api/stats`, public usage statistics endpoint
- Custom 404 error page
- `/.well-known/security.txt`, security contact file
- `/humans.txt`, humans.txt standard
- `LICENSE`, MIT License file
- `CONTRIBUTING.md`, contribution guidelines
- `CODE_OF_CONDUCT.md`, community code of conduct
- `SECURITY.md`, security policy and vulnerability reporting
- `CHANGELOG.md`, this file
- Navigation links to About page across all pages
- Updated sitemap.xml with new pages

### Changed
- Comprehensive `README.md` overhaul with architecture diagram, full API reference, setup guide, and badges
- Updated `package.json` license field to MIT
- Footer now includes About link on all pages

## [1.1.0] - 2026-03-10

### Added
- Blog system with server-side rendered posts from `blogs.json`
- Blog listing page (`/blogs`) with SEO-optimized cards
- Individual blog post pages (`/blogs/:slug`) with JSON-LD structured data
- Product Hunt badge in footer
- `llms.txt` and `llms-full.txt` for LLM discoverability
- Google Analytics integration

### Changed
- Updated sitemap.xml with blog URLs

## [1.0.0] - 2026-01-15

### Added
- Initial release
- BFS domain crawler with no depth limit
- Real-time progress tracking with polling
- Tracking URLs for bookmarking/sharing
- Email notifications on crawl completion (Nodemailer + Gmail)
- CSV export with email delivery
- Duplicate domain detection (re-crawl or use existing)
- Auto-cleanup: exports after 5 minutes, jobs after 1 hour
- Swagger API documentation (Basic Auth protected)
- Security: Helmet, CORS, rate limiting, input validation
- Database migrations for PostgreSQL (Neon)
- BullMQ job queues with Redis
- Static HTML frontend with Tailwind CSS
- Privacy Policy, Terms of Service, Cookie Policy pages
- robots.txt and sitemap.xml
