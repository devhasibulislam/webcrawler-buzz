<p align="center">
  <img src="https://webcrawler.buzz/webcrawler-logo.png" alt="WebCrawler.buzz" width="280" />
</p>

<h3 align="center">Free & Open-Source Website Crawler</h3>

<p align="center">
  Crawl any website. Discover every page. Get SEO data, all from your browser, for free.
</p>

<p align="center">
  <a href="https://webcrawler.buzz">🌐 Live App</a> &nbsp;·&nbsp;
  <a href="https://webcrawler.buzz/api-docs-public">📖 API Docs</a> &nbsp;·&nbsp;
  <a href="https://webcrawler.buzz/about">ℹ️ About</a> &nbsp;·&nbsp;
  <a href="#-quick-start">🚀 Quick Start</a> &nbsp;·&nbsp;
  <a href="CONTRIBUTING.md">🤝 Contributing</a>
</p>

<p align="center">
  <a href="https://github.com/devhasibulislam/webcrawler/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://webcrawler.buzz/api/health"><img src="https://img.shields.io/badge/status-live-brightgreen.svg" alt="Status: Live" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg" alt="Node.js >= 20" />
  <img src="https://img.shields.io/badge/typescript-strict-blue.svg" alt="TypeScript Strict" />
  <a href="https://www.producthunt.com/products/webcrawler-buzz"><img src="https://img.shields.io/badge/Product%20Hunt-featured-orange.svg" alt="Product Hunt" /></a>
</p>

<p align="center">
  <a href="https://github.com/devhasibulislam/webcrawler">
    <img src="https://webcrawler.buzz/github-repository.png" alt="WebCrawler.buzz GitHub Repository" width="720" />
  </a>
</p>

---

## What is WebCrawler.buzz?

**WebCrawler.buzz** is a production-grade, open-source domain crawler that discovers every publicly accessible page on any website and extracts rich SEO data. Paste a URL, hit crawl, get a full report with page titles, meta descriptions, HTTP status codes, response times, indexability, and more.

- **No signup required**, just paste a URL and go
- **No page limits**, crawl entire domains, no matter the size
- **Background processing**, close the tab, come back later via your tracking link
- **Email notifications**, get notified when crawls complete
- **CSV export**, download your results as a spreadsheet

### Who is this for?

- **SEO professionals** auditing client websites
- **Developers** checking link health before deployments/migrations
- **Content teams** inventorying pages across large sites
- **Anyone** who wants to see what's really on a website

---

## ✨ Features

| Feature                    | Description                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 🔍 **BFS Crawling**        | Breadth-first search scoped to root domain, no depth limit                                                              |
| 📊 **Rich SEO Data**       | Title, meta description, status code, response time, content type, page size, link counts, redirect chains, indexability |
| 📈 **Real-Time Progress**  | Live progress bar polling every 5 seconds                                                                                |
| 🔗 **Tracking URLs**       | Shareable bookmarkable links to check progress/results anytime                                                           |
| 📧 **Email Notifications** | Optional email alerts when crawls complete                                                                               |
| 📥 **CSV Export**          | Export full results as CSV, delivered via email                                                                          |
| ♻️ **Duplicate Detection** | Already crawled that domain? Re-use results or re-crawl fresh                                                            |
| 🧹 **Auto-Cleanup**        | Ephemeral data, crawls auto-delete after 1 hour, exports after 5 min                                                    |
| 🔒 **Security**            | Helmet, CORS, rate limiting, input validation                                                                            |
| 📖 **API Docs**            | Full OpenAPI/Swagger documentation                                                                                       |
| 💚 **Health Check**        | `GET /api/health`, standard health endpoint                                                                             |
| 📊 **Public Stats**        | `GET /api/stats`, live transparency stats                                                                               |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                     │
│          Pure HTML/CSS/JS, Tailwind CSS CDN            │
└──────────────┬──────────────────────────┬───────────────┘
               │  POST /api/crawl         │  GET /api/crawl/:id/progress
               ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Express.js v5 Server                   │
│     Routes → Controllers → Services → Database          │
│     Middleware: Helmet, CORS, Rate Limiter              │
└──────┬───────────────┬──────────────────┬───────────────┘
       │               │                  │
       ▼               ▼                  ▼
┌──────────┐   ┌──────────────┐   ┌──────────────┐
│  Neon    │   │ Redis +      │   │ Gmail SMTP   │
│  Postgres│   │ BullMQ       │   │ (Nodemailer) │
│          │   │              │   │              │
│ 3 tables │   │ Crawl Queue  │   │ Notifications│
│ crawl_   │   │ Export Queue │   │ CSV links    │
│ jobs     │   │ Workers x5+2 │   │              │
└──────────┘   └──────────────┘   └──────────────┘
```

### Tech Stack

| Layer     | Technology                                            |
| --------- | ----------------------------------------------------- |
| Runtime   | Node.js (v20+)                                        |
| Language  | TypeScript (strict mode)                              |
| Framework | Express.js v5                                         |
| Database  | PostgreSQL via [Neon](https://neon.tech) (serverless) |
| DB Client | `pg` (node-postgres), raw parameterized queries      |
| Job Queue | [BullMQ](https://docs.bullmq.io) + Redis              |
| Crawling  | `axios` + `cheerio`                                   |
| Email     | Nodemailer + Gmail SMTP                               |
| CSS       | Tailwind CSS (CDN)                                    |
| API Docs  | Swagger UI (OpenAPI 3.0)                              |
| Security  | `helmet`, `express-rate-limit`, `cors`                |
| Linting   | ESLint + `@typescript-eslint`                         |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v20 or higher
- **PostgreSQL** database (we use [Neon](https://neon.tech), free tier works)
- **Redis** instance (we use [Redis Cloud](https://redis.com/cloud/), free tier works)
- **Gmail** account with [App Password](https://support.google.com/accounts/answer/185833) for email notifications

### 1. Clone & Install

```bash
git clone https://github.com/devhasibulislam/webcrawler.git
cd webcrawler
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
PORT=5005
APP_BASE_URL=http://localhost:5005

# Neon PostgreSQL
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require

# Redis
REDIS_URL=redis://default:password@host:port

# Gmail SMTP
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Swagger Auth
SWAGGER_USERNAME=admin
SWAGGER_PASSWORD=your_strong_password

# CORS
ALLOWED_ORIGIN=http://localhost:5005
```

### 3. Run Migrations

```bash
npm run migrate
```

### 4. Start Development Server

```bash
npm run dev
```

The app will be running at `http://localhost:5005`.

### 5. Build for Production

```bash
npm run build
npm start
```

---

## 📡 API Reference

All endpoints are documented via Swagger at `/api-docs` (requires Basic Auth) and publicly at `/api-docs-public`.

### Core Endpoints

| Method | Endpoint                                 | Description                                        |
| ------ | ---------------------------------------- | -------------------------------------------------- |
| `POST` | `/api/crawl`                             | Start a new crawl                                  |
| `POST` | `/api/crawl/decide`                      | Handle duplicate domain (re-crawl or use existing) |
| `POST` | `/api/crawl/:job_id/notify`              | Register email for notification                    |
| `GET`  | `/api/crawl/:job_id/progress`            | Poll crawl progress                                |
| `GET`  | `/api/crawl/:job_id`                     | Get paginated results                              |
| `POST` | `/api/crawl/:job_id/export`              | Request CSV export                                 |
| `GET`  | `/api/crawl/:job_id/export/status`       | Check export status                                |
| `GET`  | `/api/crawl/:job_id/download/:export_id` | Download CSV file                                  |

### Operational Endpoints

| Method | Endpoint      | Description                      |
| ------ | ------------- | -------------------------------- |
| `GET`  | `/api/health` | Health check (DB + Redis status) |
| `GET`  | `/api/stats`  | Public usage statistics          |

### Example: Start a Crawl

```bash
curl -X POST https://webcrawler.buzz/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Response:**

```json
{
  "status": "started",
  "job_id": "abc-123-def",
  "tracking_url": "https://webcrawler.buzz/results?job_id=abc-123-def",
  "message": "Crawl started! Use tracking_url to follow progress."
}
```

---

## 📁 Project Structure

```
webcrawler.buzz/
├── src/
│   ├── index.ts                    # Express entry, middleware, routes, workers, crons
│   ├── routes/
│   │   ├── crawler.routes.ts       # /api/crawl/** API routes (Swagger-documented)
│   │   └── view.routes.ts          # HTML page routes
│   ├── controllers/
│   │   ├── crawler.controller.ts   # API request/response handlers
│   │   └── view.controller.ts      # HTML page serving + blog SSR
│   ├── services/
│   │   ├── crawler.service.ts      # BFS crawl engine (axios + cheerio)
│   │   ├── job.service.ts          # DB operations for jobs + pages
│   │   ├── email.service.ts        # Nodemailer email templates
│   │   └── export.service.ts       # CSV export DB operations
│   ├── queue/
│   │   ├── crawler.queue.ts        # BullMQ crawl queue (producer)
│   │   ├── crawler.worker.ts       # BullMQ crawl worker (consumer, concurrency: 5)
│   │   ├── export.queue.ts         # BullMQ export queue (producer)
│   │   └── export.worker.ts        # BullMQ export worker (consumer, concurrency: 2)
│   ├── cron/
│   │   └── export-cleanup.ts       # Scheduled cleanup: exports (5 min) + jobs (1 hour)
│   ├── middleware/
│   │   ├── security.middleware.ts   # Helmet, CORS, rate limiter
│   │   └── swagger-auth.middleware.ts  # HTTP Basic Auth for Swagger
│   ├── db/
│   │   ├── client.ts               # PostgreSQL connection pool
│   │   └── migrate.ts              # Table creation migrations
│   ├── utils/
│   │   └── url.utils.ts            # URL normalization, validation, resolution
│   ├── swagger/
│   │   └── swagger.ts              # OpenAPI spec configuration
│   └── types/
│       └── index.ts                # Shared TypeScript interfaces
├── public/                         # Static HTML pages + SEO assets
├── tmp/exports/                    # Temporary CSV files (auto-cleaned)
├── CONTRIBUTING.md                 # Contribution guidelines
├── CHANGELOG.md                    # Version history
├── SECURITY.md                     # Security policy + vulnerability reporting
├── CODE_OF_CONDUCT.md              # Community code of conduct
├── LICENSE                         # MIT License
└── package.json
```

---

## 🔒 Security

- **Helmet**, HTTP security headers on every response
- **CORS**, restricted to configured origin
- **Rate Limiting**, 200 POST requests per 15 minutes per IP
- **Input Validation**, all user inputs validated before processing
- **Parameterized Queries**, no SQL injection possible
- **Auto-Cleanup**, no persistent user data; crawls expire in 1 hour
- **Responsible Disclosure**, see [SECURITY.md](SECURITY.md)

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

This project is licensed under the **MIT License**, see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Hasibul Islam**, Full-Stack Developer

- GitHub: [@devhasibulislam](https://github.com/devhasibulislam)
- Email: [devhasibulislam@gmail.com](mailto:devhasibulislam@gmail.com)
- Website: [webcrawler.buzz](https://webcrawler.buzz)

---

## 🔗 Links

- **Live App**: [webcrawler.buzz](https://webcrawler.buzz)
- **API Health**: [webcrawler.buzz/api/health](https://webcrawler.buzz/api/health)
- **API Docs**: [webcrawler.buzz/api-docs-public](https://webcrawler.buzz/api-docs-public)
- **Product Hunt**: [webcrawler.buzz on Product Hunt](https://www.producthunt.com/products/webcrawler-buzz)
- **Blog**: [webcrawler.buzz/blogs](https://webcrawler.buzz/blogs)
