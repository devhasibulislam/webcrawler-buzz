# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-03-18

### Added
- `/about` page with project transparency, tech stack, and author info
- `/api-docs-public` — public read-only API documentation page
- `GET /api/health` — health check endpoint (DB + Redis status)
- `GET /api/stats` — public usage statistics endpoint
- Custom 404 error page
- `/.well-known/security.txt` — security contact file
- `/humans.txt` — humans.txt standard
- `LICENSE` — MIT License file
- `CONTRIBUTING.md` — contribution guidelines
- `CODE_OF_CONDUCT.md` — community code of conduct
- `SECURITY.md` — security policy and vulnerability reporting
- `CHANGELOG.md` — this file
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
