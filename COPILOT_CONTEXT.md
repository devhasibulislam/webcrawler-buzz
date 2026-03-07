# 🕷️ Domain Crawler — VS Code Copilot Context File

> Place this file in your project root as `COPILOT_CONTEXT.md`
> OR copy contents into `.github/copilot-instructions.md` so Copilot always reads it automatically.

---

## 📌 Project Overview

A **production-grade background domain crawler** built with **Express.js + TypeScript**.
Serves both the **REST API** and **pure HTML/CSS frontend** from the same server.
Backed by **Neon PostgreSQL** for storage and **Redis + BullMQ** for persistent job queueing.

### Core User Flow

1. User pastes any URL on the homepage and clicks "Start Crawl"
2. Server immediately creates a job and returns a **tracking URL** (e.g. `/results?job_id=abc-123`)
3. That tracking URL is shown on screen right away — user can copy/bookmark it immediately
4. BullMQ pushes the crawl job into Redis queue — crawl starts in background
5. Frontend polls for progress every 5 seconds — shows real-time progress bar (0→100%)
6. If crawl takes longer than a random 5–10 seconds → UI shows "Notify me" email form
7. When crawl finishes → if email was given, send notification with the **same tracking URL**
8. User can close the browser at any time — crawl keeps running on the server
9. User returns via tracking URL (bookmarked or from email) → sees full results table

---

## 🧱 Tech Stack

| Layer      | Technology                                               |
| ---------- | -------------------------------------------------------- |
| Runtime    | Node.js (v20+)                                           |
| Language   | TypeScript (strict mode)                                 |
| Framework  | Express.js v5 (API + static HTML)                        |
| Styling    | Tailwind CSS (CDN) + Google Sans (Google Fonts CDN)      |
| Database   | PostgreSQL via Neon (serverless)                         |
| DB Client  | `pg` (node-postgres) — raw parameterized queries         |
| Job Queue  | BullMQ + Redis (RedisLabs)                               |
| Crawling   | `axios` + `cheerio`                                      |
| Email      | Nodemailer + Gmail SMTP (App Password)                   |
| API Docs   | Swagger UI — protected by HTTP Basic Auth                |
| Security   | `helmet`, `express-rate-limit`, `cors`, input validation |
| CSV Export | BullMQ export queue + worker, `node-cron` cleanup        |
| Linting    | ESLint + `@typescript-eslint`                            |
| Env Config | `dotenv`                                                 |

---

## 🔌 Environment Variables (.env)

```env
# Server
PORT=5005
APP_BASE_URL=http://your-vps-ip:5005

# Neon PostgreSQL
DATABASE_URL=postgresql://neondb_owner:npg_Q9XoxGikB1zh@ep-lively-wind-aig1wf10-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Redis (RedisLabs)
REDIS_URL=redis://default:HAVAwCLzvP72FeBSbTYkNEARuGwLiRuL@redis-18584.c325.us-east-1-4.ec2.cloud.redislabs.com:18584

# Gmail (Nodemailer)
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Swagger Basic Auth
SWAGGER_USERNAME=admin
SWAGGER_PASSWORD=your_strong_swagger_password

# CORS — your VPS domain/IP for production, localhost for dev
ALLOWED_ORIGIN=http://localhost:5005
```

> ⚠️ Gmail App Password: Google Account → Security → 2-Step Verification → App Passwords
> ⚠️ Never commit .env to git — add it to .gitignore

---

## 🗄️ Database Schema (Neon PostgreSQL)

### Table: `crawl_jobs`

```sql
CREATE TABLE IF NOT EXISTS crawl_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL,
  input_url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | running | completed | failed
  total_pages_found INT DEFAULT 0,
  total_pages_queued INT DEFAULT 0,               -- used for progress bar calculation
  notify_email VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `crawled_pages`

```sql
CREATE TABLE IF NOT EXISTS crawled_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  page_title TEXT,
  meta_description TEXT,
  status_code INT,
  response_time_ms INT,
  content_type VARCHAR(255),
  page_size_bytes INT,
  internal_links_count INT DEFAULT 0,
  external_links_count INT DEFAULT 0,
  redirect_url TEXT,
  is_indexable BOOLEAN DEFAULT TRUE,
  discovered_at TIMESTAMPTZ DEFAULT NOW()
);
```

> `total_pages_queued` tracks how many URLs have been discovered and queued total.
> Progress = `total_pages_found ÷ total_pages_queued × 100`

### Table: `csv_exports`

```sql
CREATE TABLE IF NOT EXISTS csv_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  file_path TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'processing',  -- processing | completed | sent
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

> CSV exports are ephemeral — a cron job deletes files + records older than 5 minutes.

---

## 📁 Project Folder Structure

```
domain-crawler/
├── src/
│   ├── index.ts                          # Express entry — registers middleware, routes, BullMQ workers, cron
│   ├── routes/
│   │   ├── crawler.routes.ts             # /api/crawl/** API routes
│   │   └── view.routes.ts                # HTML page routes
│   ├── controllers/
│   │   ├── crawler.controller.ts         # API request/response logic
│   │   └── view.controller.ts            # res.sendFile for HTML pages
│   ├── services/
│   │   ├── crawler.service.ts            # BFS crawl logic — runs inside BullMQ worker
│   │   ├── job.service.ts                # DB CRUD for crawl_jobs + crawled_pages
│   │   ├── email.service.ts              # Nodemailer send logic
│   │   └── export.service.ts             # DB CRUD for csv_exports table
│   ├── queue/
│   │   ├── crawler.queue.ts              # BullMQ Queue definition — crawl jobs (producer)
│   │   ├── crawler.worker.ts             # BullMQ Worker — crawl jobs (consumer, concurrency: 5)
│   │   ├── export.queue.ts               # BullMQ Queue definition — CSV export jobs (producer)
│   │   └── export.worker.ts              # BullMQ Worker — CSV export jobs (consumer, concurrency: 2)
│   ├── cron/
│   │   └── export-cleanup.ts             # node-cron job — deletes expired exports every minute
│   ├── middleware/
│   │   ├── security.middleware.ts        # Helmet, CORS, rate limiter
│   │   └── swagger-auth.middleware.ts    # HTTP Basic Auth for /api-docs
│   ├── db/
│   │   ├── client.ts                     # pg Pool from DATABASE_URL
│   │   └── migrate.ts                    # Creates tables if not exist (crawl_jobs, crawled_pages, csv_exports)
│   ├── utils/
│   │   └── url.utils.ts                  # extractRootDomain(), normalizeUrl(), isValidUrl()
│   ├── swagger/
│   │   └── swagger.ts                    # swagger-jsdoc config + OpenAPI spec
│   └── types/
│       └── index.ts                      # Shared TypeScript interfaces
├── public/
│   ├── index.html                        # Home page — main crawler UI
│   ├── results.html                      # Results table (tracking URL page)
│   ├── privacy-policy.html               # Privacy Policy (dummy content)
│   ├── terms-of-service.html             # Terms of Service (dummy content)
│   └── cookie-policy.html               # Cookie Policy (dummy — for future AdSense)
├── tmp/
│   └── exports/                          # Temporary CSV files (auto-cleaned by cron)
├── .env
├── .env.example
├── .gitignore
├── eslint.config.cjs                     # ESLint v9 flat config for TypeScript
├── tsconfig.json
├── package.json
└── COPILOT_CONTEXT.md
```

---

## 🌐 API Endpoints

### `POST /api/crawl`

Validates URL, creates job in DB, pushes to BullMQ queue, returns tracking URL immediately.

**Request:**

```json
{ "url": "https://amplifying.ai/research/some-page" }
```

**Response — new domain (HTTP 201):**

```json
{
  "status": "started",
  "job_id": "abc-123-xyz",
  "tracking_url": "http://your-vps-ip:5005/results?job_id=abc-123-xyz",
  "message": "Crawl started! Use tracking_url to follow progress."
}
```

**Response — domain already crawled (HTTP 200):**

```json
{
  "status": "exists",
  "job_id": "abc-123-xyz",
  "domain": "amplifying.ai",
  "crawled_at": "2025-01-01T00:00:00Z",
  "total_pages": 42,
  "tracking_url": "http://your-vps-ip:5005/results?job_id=abc-123-xyz",
  "prompt": "Send action 're-crawl' or 'use-existing' to POST /api/crawl/decide"
}
```

---

### `POST /api/crawl/decide`

User decision for duplicate domain.

**Request:**

```json
{ "domain": "amplifying.ai", "action": "re-crawl" }
```

- `use-existing` → returns existing tracking URL immediately
- `re-crawl` → creates new job, pushes to BullMQ, returns new tracking URL

---

### `POST /api/crawl/:job_id/notify`

Saves email to `crawl_jobs.notify_email`. Called after 5–10s threshold on frontend.

**Request:**

```json
{ "email": "user@example.com" }
```

**Response:**

```json
{ "message": "Got it! We'll send results to user@example.com when done." }
```

---

### `GET /api/crawl/:job_id/progress`

Lightweight polling endpoint — called every 5 seconds by frontend.

**Response (running):**

```json
{
  "job_id": "abc-123-xyz",
  "status": "running",
  "total_pages_found": 23,
  "total_pages_queued": 61,
  "progress_percent": 37
}
```

**Response (completed):**

```json
{
  "job_id": "abc-123-xyz",
  "status": "completed",
  "total_pages_found": 54,
  "total_pages_queued": 54,
  "progress_percent": 100
}
```

> `progress_percent = Math.round((total_pages_found / total_pages_queued) * 100)`
> If `total_pages_queued` is 0 (job just started), return `progress_percent: 0`

---

### `GET /api/crawl/:job_id`

Full paginated results — called once crawl is complete to load results table.

**Query Parameters:**

- `page` — page number (default: 1)
- `limit` — rows per page: `50` | `100` | `500` | `1000` (default: 50)

**Response:**

```json
{
  "job_id": "abc-123-xyz",
  "domain": "amplifying.ai",
  "status": "completed",
  "total_pages_found": 54,
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_count": 54,
    "total_pages": 2
  },
  "pages": ["...array of crawled_pages rows..."]
}
```

---

### `POST /api/crawl/:job_id/export`

Request a CSV export — generates CSV in background, emails download link to user.

**Request:**

```json
{ "email": "user@example.com" }
```

**Response (HTTP 202):**

```json
{
  "status": "processing",
  "export_id": "export-uuid",
  "message": "CSV export started. Download link will be sent to user@example.com."
}
```

**Response — already in progress (HTTP 200):**

```json
{
  "status": "already_processing",
  "export_id": "export-uuid",
  "message": "An export is already in progress or was recently sent. Please wait for it to expire."
}
```

---

### `GET /api/crawl/:job_id/export/status`

Check export status — used by frontend to control export button state.

**Response (active):**

```json
{
  "active": true,
  "export_id": "export-uuid",
  "status": "processing",
  "email": "user@example.com",
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Response (no active export):**

```json
{ "active": false }
```

---

### `GET /api/crawl/:job_id/download/:export_id`

Download the generated CSV file. Returns `404` if not found, `410` if expired/deleted.

---

## 🖥️ Frontend Pages (Pure HTML — served by Express)

### `/` → `public/index.html` — Home Page

- Google Sans + Tailwind CSS via CDN
- Large centered URL input box
- "Start Crawl" button
- On submit → `POST /api/crawl`:
  - **Immediately show the tracking URL** on screen in a highlighted box:
    > 🔗 Your tracking link: `http://your-domain:5005/results?job_id=abc-123`
    > "Bookmark this! You can come back anytime even if you close the tab."
  - Show live progress bar (0→100%) — polls `GET /api/crawl/:job_id/progress` every 5 seconds
  - Show live counter: "23 of 61 pages crawled..."
- **After random 5–10 seconds, if still running** → animated card slides in:
  > "⏳ This might take a while. Want an email when it's done?"
  > `[email input]` `[Notify Me]` button → calls `POST /api/crawl/:job_id/notify`
- When progress hits 100% → auto-redirect to `/results?job_id=abc-123`
- Duplicate domain modal: "Already crawled! Re-crawl fresh or view existing results?"
- Footer: links to Privacy Policy, Terms of Service, Cookie Policy

### `/results` → `public/results.html` — Results / Tracking Page

- Reads `?job_id=xxx` from URL query string
- **Works at any time** — if crawl is still running, shows live progress bar (polls every 5s)
- When complete → renders full 12-column **paginated** results table
- Rows-per-page selector: 50 / 100 / 500 / 1000
- Pagination controls with page numbers
- "📥 Export CSV" button → opens modal → user enters email → download link emailed (5-min expiry)
- Export button disables while export is processing, polls status every 3s, re-enables after expiry
- "← New Crawl" link back to Home
- This is the page the tracking URL points to AND what the email links to

### `/privacy-policy` → `public/privacy-policy.html`

### `/terms-of-service` → `public/terms-of-service.html`

### `/cookie-policy` → `public/cookie-policy.html`

- All three have dummy placeholder content — user replaces later
- Cookie Policy is for future Google AdSense compliance
- Consistent header/footer with Home page

---

## 📊 Results Table — 12 Columns

| #   | Column           | Source                                        |
| --- | ---------------- | --------------------------------------------- |
| 1   | URL              | Full crawled URL (clickable link)             |
| 2   | Page Title       | `<title>` tag                                 |
| 3   | Meta Description | `<meta name="description">` content           |
| 4   | HTTP Status      | Response status code (200, 301, 404, 500...)  |
| 5   | Response Time    | Milliseconds taken to fetch the page          |
| 6   | Content Type     | From `Content-Type` response header           |
| 7   | Page Size        | Response body size in KB                      |
| 8   | Internal Links   | Count of same-domain `<a>` links on the page  |
| 9   | External Links   | Count of links going to other domains         |
| 10  | Redirect URL     | Final destination URL if 301/302 redirect     |
| 11  | Is Indexable     | ✅ / ❌ based on `noindex` in meta robots tag |
| 12  | Discovered At    | Timestamp when the page was crawled           |

---

## ⚙️ BullMQ + Redis — Job Queue Architecture

### Why BullMQ?

- Crawl jobs survive VPS restarts — they live in Redis, not memory
- If worker crashes mid-crawl, BullMQ automatically retries the job
- Jobs are processed one at a time per domain (no duplicate crawls)

### Redis Connection (`src/queue/crawler.queue.ts`)

Redis URL is manually parsed with `new URL()` and passed as `{host, port, password}` config to BullMQ's built-in connection (no `ioredis` dependency).

```typescript
import { Queue } from "bullmq";

export const crawlerQueue = new Queue("crawler", {
  connection: {
    host: new URL(process.env.REDIS_URL!).hostname,
    port: parseInt(new URL(process.env.REDIS_URL!).port, 10) || 6379,
    password: new URL(process.env.REDIS_URL!).password || undefined,
    maxRetriesPerRequest: null, // required by BullMQ
  },
});
```

### Crawler Worker (`src/queue/crawler.worker.ts`)

```typescript
import { Worker } from "bullmq";
import { crawlerService } from "../services/crawler.service";

function getRedisConfig() {
  const url = new URL(process.env.REDIS_URL!);
  return {
    host: url.hostname,
    port: parseInt(url.port, 10) || 6379,
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
}

export const crawlerWorker = new Worker(
  "crawler",
  async (job) => {
    const { jobId, startUrl, domain } = job.data;
    await crawlerService.crawl(jobId, startUrl, domain);
  },
  {
    connection: getRedisConfig(),
    concurrency: 5, // max 5 crawl jobs running at same time
  },
);
```

### Export Queue + Worker (`src/queue/export.queue.ts` + `export.worker.ts`)

Separate BullMQ queue `csv-export` with concurrency 2. Worker generates CSV from all crawled pages, saves to `tmp/exports/`, emails download link via `emailService.sendExportReadyEmail()`, marks export as `sent`.

### Adding a Job (inside `crawler.controller.ts`)

```typescript
await crawlerQueue.add(
  "crawl-job",
  {
    jobId: newJob.id,
    startUrl: inputUrl,
    domain: rootDomain,
  },
  {
    attempts: 3, // retry up to 3 times on failure
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false, // keep failed jobs in Redis for debugging
  },
);
```

---

## 📈 Progress Bar — Accurate Calculation

**Formula:**

```
progress_percent = Math.round((total_pages_found / total_pages_queued) * 100)
```

**How `total_pages_queued` is updated during crawl:**

- Every time the crawler discovers NEW URLs and adds them to the BFS queue,
  it also increments `crawl_jobs.total_pages_queued` in the DB by that count
- Every time a URL is fully processed and saved, `total_pages_found` increments

**Edge cases:**

- Job just created, nothing queued yet → return `0`
- `total_pages_queued` is 0 (divide by zero guard) → return `0`
- Job completed → always return `100` regardless of math

**Frontend polling:**

```javascript
// Poll every 5 seconds
const interval = setInterval(async () => {
  const res = await fetch(`/api/crawl/${jobId}/progress`);
  const data = await res.json();
  updateProgressBar(data.progress_percent);
  updateCounter(
    `${data.total_pages_found} of ${data.total_pages_queued} pages crawled`,
  );
  if (data.status === "completed") {
    clearInterval(interval);
    window.location.href = `/results?job_id=${jobId}`;
  }
}, 5000);
```

---

## 📧 Email Notification Flow

```
1. Crawl starts → tracking URL shown on screen immediately
2. Frontend timer: Math.floor(Math.random() * 5000) + 5000 ms (5–10 seconds)
3. Timer fires, status still "running" → show email notification card
4. User enters email → POST /api/crawl/:job_id/notify
5. Backend saves email to crawl_jobs.notify_email
6. BullMQ worker finishes crawl → checks if notify_email is set
7. If yes → Nodemailer sends HTML email
8. Email subject: "✅ Your crawl for [domain] is complete!"
9. Email body: domain, total pages found, time taken
10. Email CTA button: "View Full Results →" → APP_BASE_URL/results?job_id=:id
    (this is the SAME tracking URL the user already has)
```

### CSV Export Email Flow

```
1. User clicks "📥 Export CSV" on results page → enters email in modal
2. POST /api/crawl/:job_id/export → creates csv_exports record, pushes to BullMQ `csv-export` queue
3. Export worker fetches all crawled pages, generates CSV, saves to tmp/exports/
4. Worker updates export status to 'completed', builds download URL
5. Worker sends email via emailService.sendExportReadyEmail() with download link
6. Worker marks export status as 'sent'
7. Email subject: "📥 Your CSV export for [domain] is ready!"
8. Email CTA button: "Download CSV →" (link valid for 5 minutes)
9. Cron job (every minute) deletes expired exports (>5 min) from disk + DB
10. After expiry, export button re-enables on frontend for a new export
```

### Nodemailer Setup (`src/services/email.service.ts`)

```typescript
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // App Password only — NOT real Gmail password
  },
});
```

---

## 🕷️ Crawler — BFS Algorithm (`src/services/crawler.service.ts`)

```
crawl(jobId, startUrl, domain):
  1. Set crawl_jobs.status = "running"
  2. queue = [startUrl], visited = new Set(), queued = new Set([startUrl])
  3. UPDATE crawl_jobs SET total_pages_queued = 1 (first URL)
  4. While queue not empty:
       a. Dequeue URL — skip if already in visited
       b. Mark as visited, record start time
       c. Fetch with axios (follow redirects, capture redirect_url)
       d. Record: status_code, content_type, page_size_bytes, response_time_ms
       e. If content is HTML → parse with cheerio:
            - page_title from <title>
            - meta_description from <meta name="description">
            - is_indexable: false if <meta name="robots"> contains "noindex"
            - Find all <a href="..."> links
            - Count internal vs external links
            - For each new internal href not in queued:
                * Resolve absolute URL, normalize
                * Add to queue + queued set
                * INCREMENT crawl_jobs.total_pages_queued += 1
       f. INSERT row into crawled_pages
       g. UPDATE crawl_jobs SET total_pages_found = total_pages_found + 1
  5. UPDATE crawl_jobs SET status = "completed", total_pages_queued = total_pages_found
  6. If notify_email → send email
```

> Incrementing `total_pages_queued` in real-time as new URLs are discovered
> ensures the progress bar formula always has an accurate denominator.

---

## 🔐 API Security — 4 Layers

### 1. Helmet.js — HTTP Security Headers

```typescript
import helmet from "helmet";
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled to allow CDN scripts (Tailwind, Google Fonts)
  }),
);
```

### 2. CORS — Restrict to Own Domain

```typescript
import cors from "cors";
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
```

### 3. Rate Limiting — 200 POST requests / 15 min / IP

```typescript
import rateLimit from "express-rate-limit";
app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: "Too many requests, please try again later." },
    skip: (req) => req.method === "GET", // Skip rate limit for GET (progress polling)
  }),
);
```

### 4. Input Validation — on `POST /api/crawl`

- Must be a non-empty string
- Must start with `http://` or `https://`
- Must parse with `new URL()` without throwing
- Must have a valid hostname (no raw IPs in v1)
- Return `400 Bad Request` with descriptive message if any check fails

---

## 📖 Swagger UI — Protected Docs

- URL: `http://your-vps-ip:5005/api-docs`
- Protected by HTTP Basic Auth — browser shows login popup
- Credentials stored in `.env` as `SWAGGER_USERNAME` and `SWAGGER_PASSWORD`

### Middleware (`src/middleware/swagger-auth.middleware.ts`)

```typescript
import { Request, Response, NextFunction } from "express";

export function swaggerAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Swagger Docs"');
    return res.status(401).send("Authentication required.");
  }
  const [user, pass] = Buffer.from(authHeader.split(" ")[1], "base64")
    .toString()
    .split(":");
  if (
    user === process.env.SWAGGER_USERNAME &&
    pass === process.env.SWAGGER_PASSWORD
  ) {
    return next();
  }
  res.setHeader("WWW-Authenticate", 'Basic realm="Swagger Docs"');
  return res.status(401).send("Invalid credentials.");
}
```

### Register in `src/index.ts`

```typescript
app.use(
  "/api-docs",
  swaggerAuth,
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec),
);
```

---

## 🔒 Domain Rules

- Strip `www.` before any comparison — `www.amplifying.ai` === `amplifying.ai`
- ✅ Crawl: `amplifying.ai/*` and `www.amplifying.ai/*`
- ❌ Skip: `blog.amplifying.ai` (subdomain — blocked in v1)
- ❌ Skip: external domains, `mailto:`, `tel:`, `javascript:`, `#`-only hrefs
- ❌ Skip: already visited URLs (Set-based dedup)
- ❌ Don't follow links inside non-HTML responses (images, PDFs) — record metadata only

---

## 🔧 TypeScript Types (`src/types/index.ts`)

```typescript
export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface CrawlJob {
  id: string;
  domain: string;
  input_url: string;
  status: JobStatus;
  total_pages_found: number;
  total_pages_queued: number;
  notify_email?: string;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CrawledPage {
  id: string;
  job_id: string;
  url: string;
  page_title?: string;
  meta_description?: string;
  status_code?: number;
  response_time_ms?: number;
  content_type?: string;
  page_size_bytes?: number;
  internal_links_count: number;
  external_links_count: number;
  redirect_url?: string;
  is_indexable: boolean;
  discovered_at: Date;
}

export interface StartCrawlRequest {
  url: string;
}
export interface DecideRequest {
  domain: string;
  action: "re-crawl" | "use-existing";
}
export interface NotifyRequest {
  email: string;
}
export interface ExportRequest {
  email: string;
}

export type ExportStatus = "processing" | "completed" | "sent";

export interface CsvExport {
  id: string;
  job_id: string;
  email: string;
  file_path?: string;
  status: ExportStatus;
  created_at: Date;
}

export interface ProgressResponse {
  job_id: string;
  status: JobStatus;
  total_pages_found: number;
  total_pages_queued: number;
  progress_percent: number;
}
```

---

## ⚙️ tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 📦 package.json

```json
{
  "dependencies": {
    "axios": "^1.13.6",
    "bullmq": "^5.70.4",
    "cheerio": "^1.2.0",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "express-rate-limit": "^8.3.0",
    "helmet": "^8.1.0",
    "node-cron": "^4.2.1",
    "nodemailer": "^8.0.1",
    "pg": "^8.20.0",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.1",
    "uuid": "^13.0.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/node": "^25.3.5",
    "@types/node-cron": "^3.0.11",
    "@types/nodemailer": "^7.0.11",
    "@types/pg": "^8.18.0",
    "@types/swagger-jsdoc": "^6.0.4",
    "@types/swagger-ui-express": "^4.1.8",
    "@types/uuid": "^10.0.0",
    "@typescript-eslint/eslint-plugin": "^8.56.1",
    "@typescript-eslint/parser": "^8.56.1",
    "eslint": "^10.0.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.9.3"
  },
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "migrate": "ts-node src/db/migrate.ts",
    "lint": "eslint --config eslint.config.cjs src/**/*.ts"
  }
}
```

---

## 🖥️ VS Code Setup Guide — Start to End

### Step 1 — Install VS Code Extensions

Open Extensions panel (`Ctrl+Shift+X`) and install:

- **GitHub Copilot** — AI inline code suggestions
- **GitHub Copilot Chat** — chat with Copilot (`Ctrl+Shift+I`)
- **ESLint** — catches TypeScript errors while typing
- **Prettier** — auto-formats code on save
- **REST Client** — test APIs inside VS Code without Postman

---

### Step 2 — Create Your Project

```bash
mkdir domain-crawler && cd domain-crawler
git init
npm init -y
```

---

### Step 3 — Give Copilot Your Context

**Option A — Automatic (recommended):**

```bash
mkdir .github
cp COPILOT_CONTEXT.md .github/copilot-instructions.md
```

Copilot reads this file automatically for every suggestion in the project. No extra steps.

**Option B — Manual via Copilot Chat:**

- Open Copilot Chat (`Ctrl+Shift+I`)
- Click paperclip 📎 → attach `COPILOT_CONTEXT.md`
- Ask: _"Based on this context file, generate `src/index.ts`"_

---

### Step 4 — Set Up Neon MCP Server in VS Code

The Neon MCP lets Copilot Chat **talk to your database directly** — run queries, check schema, debug issues without leaving VS Code.

**4a. Create `.vscode/mcp.json` in your project root:**

```json
{
  "servers": {
    "neon": {
      "command": "npx",
      "args": ["-y", "@neondatabase/mcp-server-neon"],
      "env": {
        "NEON_API_KEY": "your_neon_api_key_here"
      }
    }
  }
}
```

**4b. Get your Neon API Key:**

- Go to [console.neon.tech](https://console.neon.tech)
- Top right → Account Settings → API Keys → **Create new key**
- Paste it in `mcp.json` above

**4c. Enable MCP in VS Code:**

- Open Settings (`Ctrl+,`) → search `mcp`
- Turn ON: `Chat > MCP: Enabled`

**4d. Restart VS Code**, then open Copilot Chat and try:

> "Using Neon MCP, show me all tables in my database"
> "Create the crawl_jobs table in my Neon database"
> "How many completed jobs are there?"

---

### Step 5 — Install All Dependencies

```bash
npm install axios bullmq cheerio cors dotenv express express-rate-limit helmet node-cron nodemailer pg swagger-jsdoc swagger-ui-express uuid

npm install -D @types/cors @types/express @types/node @types/node-cron @types/nodemailer @types/pg @types/swagger-jsdoc @types/swagger-ui-express @types/uuid @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint ts-node-dev typescript
```

---

### Step 6 — Configure `.env`

```bash
cp .env.example .env
# Fill in all values — see Environment Variables section above
```

---

### Step 7 — Run DB Migration

```bash
npm run migrate
# Creates crawl_jobs and crawled_pages tables in Neon
```

---

### Step 8 — Start Dev Server

```bash
npm run dev
# App: http://localhost:5005
# Swagger: http://localhost:5005/api-docs  (login with SWAGGER_USERNAME/PASSWORD)
```

---

### Step 9 — Test APIs with REST Client

Create `test.http` in project root:

```http
### Start a crawl
POST http://localhost:5005/api/crawl
Content-Type: application/json

{
  "url": "https://amplifying.ai"
}

###

### Poll progress (replace JOB_ID)
GET http://localhost:5005/api/crawl/JOB_ID/progress

###

### Register email notification
POST http://localhost:5005/api/crawl/JOB_ID/notify
Content-Type: application/json

{
  "email": "test@example.com"
}

###

### Get full results
GET http://localhost:5005/api/crawl/JOB_ID
```

Click **"Send Request"** above each block to test directly in VS Code.

---

## ✅ Copilot Rules — Always Follow These

1. **Port is always 5005** — never 3000 or any other
2. **Tracking URL returned immediately** on `POST /api/crawl` — before crawl even starts
3. **Same tracking URL sent in email** — it's always `/results?job_id=:id`
4. **BullMQ + Redis for all jobs** — never use in-memory queues or setTimeout for crawling
5. **Redis connection** — URL manually parsed with `new URL()`, passed as `{host, port, password}` config to BullMQ (no `ioredis` dependency). `maxRetriesPerRequest: null` required by BullMQ
6. **Progress formula** — `Math.round((total_pages_found / total_pages_queued) * 100)`
7. **Guard divide-by-zero** — if `total_pages_queued === 0` return `progress_percent: 0`
8. **`total_pages_queued` updates in real-time** — increments as new URLs are discovered during crawl
9. **Parameterized SQL only** — never string-concatenated DB queries
10. **www. normalization** — always strip `www.` before domain comparison
11. **Subdomains blocked** — `blog.domain.com` is out of scope in v1
12. **Duplicate domain check** — always query DB first, prompt user before starting new crawl
13. **Email threshold** — `Math.floor(Math.random() * 5000) + 5000` ms on frontend
14. **Nodemailer + Gmail App Password** — never real Gmail password
15. **Swagger behind Basic Auth** — credentials always from `.env`
16. **All 4 security layers** — Helmet, CORS, rate limit, input validation always active
17. **12 metadata columns** — always collect all fields per crawled page
18. **Fail gracefully** — page fetch error → record `status_code = 0`, continue crawl
19. **Frontend is pure HTML** — Tailwind CDN + Google Sans CDN, no build step, no React
20. **5 HTML pages** — Home, Results, Privacy Policy, Terms of Service, Cookie Policy
21. **Polling interval is 5 seconds** — both `index.html` and `results.html` poll progress every 5s
22. **Rate limit skips GET** — only POST requests are rate-limited (200/15min). GET requests (progress polling) are exempt
23. **Helmet CSP disabled** — `contentSecurityPolicy: false` to allow CDN scripts
24. **CSV export pipeline** — separate BullMQ queue (`csv-export`), worker (concurrency: 2), `csv_exports` DB table, 5-min expiry, cron cleanup every minute
25. **Results are paginated** — `GET /api/crawl/:job_id` accepts `?page=` and `?limit=` (50/100/500/1000)
26. **ESLint configured** — `eslint.config.cjs` (flat config) with `@typescript-eslint`, run via `npm run lint`
27. **Express v5** — project uses Express `^5.2.1`, not v4

---

## 🐛 Known Minor Deviations (Code vs. This Spec)

| #   | Area                              | Spec Says                                                                                                                                                         | Code Does                                                                                                                                                                                                                                                                                             | Severity                         |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 1   | **Crawler worker `removeOnFail`** | `removeOnFail: false` on the `.add()` call (keep failed jobs in Redis for debugging)                                                                              | The `.add()` call correctly uses `removeOnFail: false`, but the **Worker constructor** in `src/queue/crawler.worker.ts` sets `removeOnFail: true` — this overrides the per-job setting and **deletes failed jobs from Redis**, defeating debug retention. Same issue in `src/queue/export.worker.ts`. | **Medium**                       |
| 2   | **`getActiveExportForJob` scope** | Export button should disable while processing **and re-enable after 5-min expiry** (implying both `'processing'` and `'sent'` statuses should block a new export) | `src/services/export.service.ts` → `getActiveExportForJob()` only checks `status = 'processing'` — once marked `'sent'`, the button immediately re-enables (before the 5-min file expiry).                                                                                                            | **Low**                          |
| 3   | **Extra content not in spec**     | Spec doesn't mention Google Analytics, SEO meta tags, Open Graph, Twitter Cards, JSON-LD, or favicon                                                              | All HTML pages include GA4 tracking (`G-PLBX971LYL`), comprehensive SEO meta, Open Graph, Twitter Cards, structured data, and references to `/webcrawler-logo.png`, `/favicon.ico`, `/og-image.png`.                                                                                                  | **Info** — additive enhancements |
| 4   | **Missing static assets**         | HTML pages reference `/webcrawler-logo.png`, `/favicon.ico`, `/og-image.png`                                                                                      | These files do not exist in `public/` — will return 404.                                                                                                                                                                                                                                              | **Low**                          |
