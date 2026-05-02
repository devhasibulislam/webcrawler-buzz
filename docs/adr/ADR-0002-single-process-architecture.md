# ADR-0002: Single-Process Architecture with PM2

**Status:** Accepted  
**Date:** 2025-01-15

## Context

The application consists of:

- An Express HTTP server (API + static files)
- BullMQ workers (crawler + export)
- Cron jobs (cleanup tasks)

We considered splitting workers into separate processes but evaluated the tradeoffs for a single-VPS deployment.

## Decision

Run everything in a single Node.js process managed by PM2 (`fork` mode, 1 instance).

## Consequences

- **Positive:** Simple deployment — one artifact, one PM2 app, one set of logs.
- **Positive:** Workers share the same connection pool and memory space — lower resource usage.
- **Positive:** No inter-process communication complexity.
- **Negative:** A crash in a worker can theoretically affect the HTTP server (mitigated by PM2 auto-restart and BullMQ's error handling).
- **Negative:** Cannot scale workers independently of the API server. If crawl load increases significantly, this ADR should be revisited.
- **Negative:** Limited to single-core utilization (acceptable for current VPS size).
