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
5. Frontend polls for progress every 2 seconds — shows real-time progress bar (0→100%)
6. If crawl takes longer than a random 5–10 seconds → UI shows "Notify me" email form
7. When crawl finishes → if email was given, send notification with the **same tracking URL**
8. User can close the browser at any time — crawl keeps running on the server
9. User returns via tracking URL (bookmarked or from email) → sees full results table

---

## 🧱 Tech Stack

| Layer          | Technology                                          |
|----------------|-----------------------------------------------------|
| Runtime        | Node.js (v20+)                                      |
| Language       | TypeScript (strict mode)                            |
| Framework      | Express.js (API + static HTML)                      |
| Styling        | Tailwind CSS (CDN) + Google Sans (Google Fonts CDN) |
| Database       | PostgreSQL via Neon (serverless)                    |
| DB Client      | `pg` (node-postgres) — raw parameterized queries    |
| Job Queue      | BullMQ + Redis (RedisLabs)                          |
| Crawling       | `axios` + `cheerio`                                 |
| Email          | Nodemailer + Gmail SMTP (App Password)              |
| API Docs       | Swagger UI — protected by HTTP Basic Auth           |
| Security       | `helmet`, `express-rate-limit`, `cors`, input validation |
| Env Config     | `dotenv`                                            |

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

---

## 📁 Project Folder Structure

```
domain-crawler/
├── src/
│   ├── index.ts                          # Express entry — registers middleware, routes, BullMQ worker
│   ├── routes/
│   │   ├── crawler.routes.ts             # /api/crawl/** API routes
│   │   └── view.routes.ts                # HTML page routes
│   ├── controllers/
│   │   ├── crawler.controller.ts         # API request/response logic
│   │   └── view.controller.ts            # res.sendFile for HTML pages
│   ├── services/
│   │   ├── crawler.service.ts            # BFS crawl logic — runs inside BullMQ worker
│   │   ├── job.service.ts                # DB CRUD for crawl_jobs + crawled_pages
│   │   └── email.service.ts              # Nodemailer send logic
│   ├── queue/
│   │   ├── crawler.queue.ts              # BullMQ Queue definition (producer)
│   │   └── crawler.worker.ts             # BullMQ Worker definition (consumer)
│   ├── middleware/
│   │   ├── security.middleware.ts        # Helmet, CORS, rate limiter
│   │   └── swagger-auth.middleware.ts    # HTTP Basic Auth for /api-docs
│   ├── db/
│   │   ├── client.ts                     # pg Pool from DATABASE_URL
│   │   └── migrate.ts                    # Creates tables if not exist
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
├── .env
├── .env.example
├── .gitignore
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
Lightweight polling endpoint — called every 2 seconds by frontend.

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
Full results — called once crawl is complete to load results table.

**Response:**
```json
{
  "job_id": "abc-123-xyz",
  "domain": "amplifying.ai",
  "status": "completed",
  "total_pages_found": 54,
  "pages": [ "...array of crawled_pages rows..." ]
}
```

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
  - Show live progress bar (0→100%) — polls `GET /api/crawl/:job_id/progress` every 2 seconds
  - Show live counter: "23 of 61 pages crawled..."
- **After random 5–10 seconds, if still running** → animated card slides in:
  > "⏳ This might take a while. Want an email when it's done?"
  > `[email input]` `[Notify Me]` button → calls `POST /api/crawl/:job_id/notify`
- When progress hits 100% → auto-redirect to `/results?job_id=abc-123`
- Duplicate domain modal: "Already crawled! Re-crawl fresh or view existing results?"
- Footer: links to Privacy Policy, Terms of Service, Cookie Policy

### `/results` → `public/results.html` — Results / Tracking Page
- Reads `?job_id=xxx` from URL query string
- **Works at any time** — if crawl is still running, shows live progress bar
- When complete → renders full 12-column results table
- "Download CSV" button
- Back to Home link
- This is the page the tracking URL points to AND what the email links to

### `/privacy-policy` → `public/privacy-policy.html`
### `/terms-of-service` → `public/terms-of-service.html`
### `/cookie-policy` → `public/cookie-policy.html`
- All three have dummy placeholder content — user replaces later
- Cookie Policy is for future Google AdSense compliance
- Consistent header/footer with Home page

---

## 📊 Results Table — 12 Columns

| # | Column           | Source                                          |
|---|------------------|-------------------------------------------------|
| 1 | URL              | Full crawled URL (clickable link)               |
| 2 | Page Title       | `<title>` tag                                   |
| 3 | Meta Description | `<meta name="description">` content             |
| 4 | HTTP Status      | Response status code (200, 301, 404, 500...)    |
| 5 | Response Time    | Milliseconds taken to fetch the page            |
| 6 | Content Type     | From `Content-Type` response header             |
| 7 | Page Size        | Response body size in KB                        |
| 8 | Internal Links   | Count of same-domain `<a>` links on the page    |
| 9 | External Links   | Count of links going to other domains           |
| 10 | Redirect URL    | Final destination URL if 301/302 redirect       |
| 11 | Is Indexable    | ✅ / ❌ based on `noindex` in meta robots tag    |
| 12 | Discovered At   | Timestamp when the page was crawled             |

---

## ⚙️ BullMQ + Redis — Job Queue Architecture

### Why BullMQ?
- Crawl jobs survive VPS restarts — they live in Redis, not memory
- If worker crashes mid-crawl, BullMQ automatically retries the job
- Jobs are processed one at a time per domain (no duplicate crawls)

### Redis Connection (`src/queue/crawler.queue.ts`)
```typescript
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const redisConnection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // required by BullMQ
});

export const crawlerQueue = new Queue('crawler', {
  connection: redisConnection,
});
```

### Worker (`src/queue/crawler.worker.ts`)
```typescript
import { Worker } from 'bullmq';
import { redisConnection } from './crawler.queue';
import { crawlerService } from '../services/crawler.service';

export const crawlerWorker = new Worker(
  'crawler',
  async (job) => {
    const { jobId, startUrl, domain } = job.data;
    await crawlerService.crawl(jobId, startUrl, domain);
  },
  {
    connection: redisConnection,
    concurrency: 5, // max 5 crawl jobs running at same time
  }
);
```

### Adding a Job (inside `crawler.controller.ts`)
```typescript
await crawlerQueue.add('crawl-job', {
  jobId: newJob.id,
  startUrl: inputUrl,
  domain: rootDomain,
}, {
  attempts: 3,           // retry up to 3 times on failure
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: true,
  removeOnFail: false,   // keep failed jobs in Redis for debugging
});
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
// Poll every 2 seconds
const interval = setInterval(async () => {
  const res = await fetch(`/api/crawl/${jobId}/progress`);
  const data = await res.json();
  updateProgressBar(data.progress_percent);
  updateCounter(`${data.total_pages_found} of ${data.total_pages_queued} pages crawled`);
  if (data.status === 'completed') {
    clearInterval(interval);
    window.location.href = `/results?job_id=${jobId}`;
  }
}, 2000);
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

### Nodemailer Setup (`src/services/email.service.ts`)
```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
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
import helmet from 'helmet';
app.use(helmet());
```

### 2. CORS — Restrict to Own Domain
```typescript
import cors from 'cors';
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
```

### 3. Rate Limiting — 30 requests / 15 min / IP
```typescript
import rateLimit from 'express-rate-limit';
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, please try again later.' },
}));
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
import { Request, Response, NextFunction } from 'express';

export function swaggerAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Docs"');
    return res.status(401).send('Authentication required.');
  }
  const [user, pass] = Buffer.from(authHeader.split(' ')[1], 'base64')
    .toString().split(':');
  if (user === process.env.SWAGGER_USERNAME && pass === process.env.SWAGGER_PASSWORD) {
    return next();
  }
  res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Docs"');
  return res.status(401).send('Invalid credentials.');
}
```

### Register in `src/index.ts`
```typescript
app.use('/api-docs', swaggerAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
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
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

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

export interface StartCrawlRequest { url: string; }
export interface DecideRequest { domain: string; action: 're-crawl' | 'use-existing'; }
export interface NotifyRequest { email: string; }

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
    "axios": "^1.6.0",
    "bullmq": "^5.0.0",
    "cheerio": "^1.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.18.0",
    "express-rate-limit": "^7.0.0",
    "helmet": "^7.0.0",
    "ioredis": "^5.3.0",
    "nodemailer": "^6.9.0",
    "pg": "^8.11.0",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.0.0",
    "@types/nodemailer": "^6.4.0",
    "@types/pg": "^8.10.0",
    "@types/swagger-jsdoc": "^6.0.4",
    "@types/swagger-ui-express": "^4.1.6",
    "@types/uuid": "^9.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.0"
  },
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "migrate": "ts-node src/db/migrate.ts"
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
- Ask: *"Based on this context file, generate `src/index.ts`"*

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
npm install axios bullmq cheerio cors dotenv express express-rate-limit helmet ioredis nodemailer pg swagger-jsdoc swagger-ui-express uuid

npm install -D @types/cors @types/express @types/node @types/nodemailer @types/pg @types/swagger-jsdoc @types/swagger-ui-express @types/uuid ts-node-dev typescript
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
5. **Redis connection** uses `ioredis` with `maxRetriesPerRequest: null` (BullMQ requirement)
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
