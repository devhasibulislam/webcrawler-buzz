# ADR-0001: Use BullMQ for Job Processing

**Status:** Accepted  
**Date:** 2025-01-15

## Context

The crawler needs to process domain crawls asynchronously — a single crawl can take minutes to hours depending on site size. We needed a job queue that:

- Supports retry with exponential backoff
- Provides concurrency control
- Persists jobs across restarts
- Has low operational overhead

## Decision

Use BullMQ backed by Redis for all asynchronous job processing (crawl jobs and CSV exports).

## Consequences

- **Positive:** Built-in retry, backoff, concurrency, and job lifecycle management.
- **Positive:** Redis is already needed for queue state; no additional database dependency.
- **Positive:** Workers run in-process, simplifying deployment to a single PM2 app.
- **Negative:** Redis must be available and persistent; data loss on Redis failure loses queue state (not crawl results, which are in Postgres).
- **Negative:** BullMQ's dashboard (Bull Board) is not currently exposed — monitoring is via logs only.
