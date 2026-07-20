import { Router, Request, Response } from 'express';
import { pool } from '../db/client';

const { version } = require('../../package.json');
const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     description: Returns system health status including database and Redis connectivity.
 *     responses:
 *       200:
 *         description: System is healthy
 *       503:
 *         description: System is degraded
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  const health: {
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
    services: {
      database: { status: string; latency_ms?: number; error?: string };
      redis: { status: string; info?: string };
    };
  } = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version,
    services: {
      database: { status: 'unknown' },
      redis: { status: 'unknown' },
    },
  };

  // Check database
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    health.services.database = {
      status: 'ok',
      latency_ms: Date.now() - start,
    };
  } catch (err: any) {
    health.services.database = {
      status: 'error',
      error: err.message,
    };
    health.status = 'degraded';
  }

  // Check Redis (via BullMQ queue ping)
  try {
    const { crawlerQueue } = await import('../queue/crawler.queue');
    const client: any = await crawlerQueue.client;
    const pong = await client.ping();
    health.services.redis = {
      status: pong === 'PONG' ? 'ok' : 'error',
    };
  } catch (err: any) {
    health.services.redis = {
      status: 'error',
      info: err.message,
    };
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Public usage statistics
 *     description: Returns anonymized usage statistics for transparency.
 *     responses:
 *       200:
 *         description: Usage statistics
 */
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Total crawl jobs ever created (approximate — some may have been cleaned up)
    const jobsResult = await pool.query(
      `SELECT
        COUNT(*)::int AS total_jobs,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_jobs,
        COUNT(*) FILTER (WHERE status = 'running')::int AS active_jobs,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_jobs
      FROM crawl_jobs`
    );

    // Total pages crawled across all jobs
    const pagesResult = await pool.query(
      `SELECT COUNT(*)::int AS total_pages FROM crawled_pages`
    );

    // Unique domains crawled
    const domainsResult = await pool.query(
      `SELECT COUNT(DISTINCT domain)::int AS unique_domains FROM crawl_jobs`
    );

    const stats = jobsResult.rows[0];
    const totalPages = pagesResult.rows[0].total_pages;
    const uniqueDomains = domainsResult.rows[0].unique_domains;

    res.status(200).json({
      generated_at: new Date().toISOString(),
      note: 'Stats reflect current data. Completed jobs are auto-cleaned after 1 hour.',
      crawl_jobs: {
        total: stats.total_jobs,
        completed: stats.completed_jobs,
        active: stats.active_jobs,
        failed: stats.failed_jobs,
      },
      pages_crawled: totalPages,
      unique_domains: uniqueDomains,
    });
  } catch (err: any) {
    console.error('[Stats] Error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve stats.' });
  }
});

export default router;
