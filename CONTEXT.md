# Domain Glossary, webcrawler.buzz

This file defines the bounded vocabulary of the project. Use these terms consistently in code, tests, issues, and documentation.

## Core Domain

| Term              | Definition                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Crawl Job**     | A unit of work representing the full crawl of a single domain. Has a lifecycle: `pending` → `running` → `completed` or `failed`. |
| **Domain**        | The root hostname being crawled (e.g. `example.com`), always stripped of `www.` prefix.                                          |
| **Input URL**     | The user-provided starting URL that initiates a crawl job.                                                                       |
| **Crawled Page**  | A single URL discovered and fetched during a crawl job. Contains SEO metadata, status code, response time, and link counts.      |
| **Internal Link** | A link pointing to the same root domain (or its `www.` variant). Subdomains are treated as external.                             |
| **External Link** | A link pointing to a different domain or a subdomain other than `www.`.                                                          |

## Queue & Processing

| Term               | Definition                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| **Crawler Queue**  | A BullMQ queue (`crawler`) that holds crawl jobs waiting to be processed by workers.                  |
| **Crawler Worker** | A BullMQ worker that dequeues crawl jobs and invokes the crawler service. Runs with concurrency of 5. |
| **Export Queue**   | A BullMQ queue (`export-csv`) that handles CSV generation requests.                                   |
| **Export Worker**  | A BullMQ worker that generates CSV files and sends download links via email.                          |

## Export & Notification

| Term               | Definition                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **CSV Export**     | A generated CSV file containing all crawled pages for a job. Stored temporarily in `tmp/exports/` and cleaned up by cron. |
| **Notify Email**   | An optional email address attached to a crawl job. Receives a notification when the crawl completes.                      |
| **Export Cleanup** | A cron job that deletes expired CSV exports (older than 1 hour).                                                          |
| **Job Cleanup**    | A cron job that deletes expired crawl jobs and their associated pages.                                                    |

## Infrastructure

| Term             | Definition                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| **Pool**         | The `pg` connection pool to Neon PostgreSQL (max 5 connections).                                           |
| **Rate Limiter** | Express middleware limiting POST requests to 200/15min per IP. GET requests (progress polling) are exempt. |
| **Swagger Auth** | HTTP Basic Auth protecting the `/api-docs` endpoint.                                                       |

## User-Facing Concepts

| Term             | Definition                                                                            |
| ---------------- | ------------------------------------------------------------------------------------- |
| **Progress**     | Percentage of crawl completion: `pages_found / pages_queued * 100`.                   |
| **Re-crawl**     | User decision to discard existing results and start a fresh crawl of the same domain. |
| **Use Existing** | User decision to reuse results from a previous crawl of the same domain.              |
| **Tracking URL** | A URL returned to the user for polling crawl progress (`/results?job_id=...`).        |
