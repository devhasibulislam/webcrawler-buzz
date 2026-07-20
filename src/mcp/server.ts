import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { jobService } from '../services/job.service';
import { exportService } from '../services/export.service';
import { emailService } from '../services/email.service';
import { crawlerQueue } from '../queue/crawler.queue';
import { exportQueue } from '../queue/export.queue';
import { extractRootDomain, isValidUrl } from '../utils/url.utils';

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5005';

// ── Simple in-memory anti-abuse counters (per-IP) ──────────────
// Prevents spamming notify/export emails from a single client.
const abuseCounters = new Map<string, { count: number; resetAt: number }>();
const ABUSE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_EMAIL_TOOLS_PER_HOUR = 5;

export function checkAbuse(clientKey: string): boolean {
  const now = Date.now();
  const entry = abuseCounters.get(clientKey);
  if (!entry || entry.resetAt < now) {
    abuseCounters.set(clientKey, { count: 1, resetAt: now + ABUSE_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_EMAIL_TOOLS_PER_HOUR) return false;
  entry.count += 1;
  return true;
}

// ── Factory: creates a fresh McpServer per request (stateless mode) ─
export function createMcpServer(clientKey: string): McpServer {
  const server = new McpServer({
    name: 'webcrawler-buzz',
    version: '1.0.0',
  });

  // ── Tool 1: start_crawl ──────────────────────────────────────
  server.tool(
    'start_crawl',
    'Start crawling every page of a website. NON-BLOCKING — returns job_id immediately. ' +
      'Do NOT wait for completion. Follow this flow: (1) call get_crawl_progress up to 3 times ' +
      'spaced ~10s apart; (2) if status is "completed", call get_crawl_results; (3) if still ' +
      'running after ~30s, tell the user the crawl is large and offer them to either ' +
      '(a) provide an email via set_notify_email for a completion notification, or ' +
      '(b) come back later with the job_id. Do not keep polling beyond 3 attempts.',
    { url: z.string().url().describe('Full URL to crawl, e.g. https://example.com') },
    async ({ url }) => {
      if (!isValidUrl(url)) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Invalid URL. Must be http(s)://…' }) }], isError: true };
      }
      const domain = extractRootDomain(url);
      const existing = await jobService.findJobByDomain(domain);
      if (existing) {
        return {
          content: [{ type: 'text', text: JSON.stringify({
            status: 'already_crawled',
            job_id: existing.id,
            domain,
            crawled_at: existing.created_at,
            total_pages: existing.total_pages_found,
            tracking_url: `${APP_BASE_URL}/results?job_id=${existing.id}`,
            next_step: 'Call decide_duplicate with action="use-existing" to reuse, or "re-crawl" to start fresh.',
          }, null, 2) }],
        };
      }
      const job = await jobService.createJob(domain, url);
      await crawlerQueue.add('crawl-job', { jobId: job.id, startUrl: url, domain }, {
        attempts: 3, backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true, removeOnFail: false,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify({
          status: 'started',
          job_id: job.id,
          domain,
          tracking_url: `${APP_BASE_URL}/results?job_id=${job.id}`,
          next_step: 'Poll get_crawl_progress in ~10s. Do not block waiting.',
        }, null, 2) }],
      };
    }
  );

  // ── Tool 2: decide_duplicate ─────────────────────────────────
  server.tool(
    'decide_duplicate',
    'When start_crawl returns status="already_crawled", call this to either reuse existing results or start a fresh re-crawl.',
    {
      domain: z.string().describe('The root domain returned by start_crawl'),
      action: z.enum(['re-crawl', 'use-existing']),
    },
    async ({ domain, action }) => {
      if (action === 'use-existing') {
        const existing = await jobService.findJobByDomain(domain);
        if (!existing) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'No existing crawl found.' }) }], isError: true };
        }
        return { content: [{ type: 'text', text: JSON.stringify({
          status: 'using_existing', job_id: existing.id,
          tracking_url: `${APP_BASE_URL}/results?job_id=${existing.id}`,
        }, null, 2) }] };
      }
      const newJob = await jobService.createJob(domain, `https://${domain}`);
      await crawlerQueue.add('crawl-job', { jobId: newJob.id, startUrl: `https://${domain}`, domain }, {
        attempts: 3, backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true, removeOnFail: false,
      });
      return { content: [{ type: 'text', text: JSON.stringify({
        status: 'started', job_id: newJob.id,
        tracking_url: `${APP_BASE_URL}/results?job_id=${newJob.id}`,
      }, null, 2) }] };
    }
  );

  // ── Tool 3: get_crawl_progress ───────────────────────────────
  server.tool(
    'get_crawl_progress',
    'Poll the status of a running crawl. Returns pages found / queued and progress percent. ' +
      'Call this at most 3 times per session; if still running after that, offer set_notify_email to the user.',
    { job_id: z.string() },
    async ({ job_id }) => {
      const job = await jobService.getJobById(job_id);
      if (!job) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Job not found.' }) }], isError: true };
      let pct = 0;
      if (job.status === 'completed') pct = 100;
      else if (job.total_pages_queued > 0) pct = Math.round((job.total_pages_found / job.total_pages_queued) * 100);
      return { content: [{ type: 'text', text: JSON.stringify({
        job_id: job.id, status: job.status,
        total_pages_found: job.total_pages_found,
        total_pages_queued: job.total_pages_queued,
        progress_percent: pct,
        error_message: job.error_message || null,
      }, null, 2) }] };
    }
  );

  // ── Tool 4: get_crawl_results ────────────────────────────────
  server.tool(
    'get_crawl_results',
    'Fetch paginated crawled pages for a completed (or running) crawl. Default limit=50, max=500.',
    {
      job_id: z.string(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(500).default(50),
    },
    async ({ job_id, page, limit }) => {
      const job = await jobService.getJobById(job_id);
      if (!job) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Job not found.' }) }], isError: true };
      const total = await jobService.countPagesByJobId(job_id);
      const totalPages = Math.ceil(total / limit) || 1;
      const safePage = Math.min(page, totalPages);
      const pages = await jobService.getPagesByJobId(job_id, safePage, limit);
      return { content: [{ type: 'text', text: JSON.stringify({
        job_id: job.id, domain: job.domain, status: job.status,
        total_pages_found: job.total_pages_found,
        pagination: { page: safePage, limit, total_count: total, total_pages: totalPages },
        pages,
      }, null, 2) }] };
    }
  );

  // ── Tool 5: set_notify_email ─────────────────────────────────
  server.tool(
    'set_notify_email',
    'Register the user\'s email to be notified when a crawl completes. Use this ONLY when the ' +
      'user explicitly agrees to provide their email after a long-running crawl. Ask permission first.',
    {
      job_id: z.string(),
      email: z.string().email(),
    },
    async ({ job_id, email }) => {
      if (!checkAbuse(clientKey)) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Rate limit exceeded (max 5 email-tool calls per hour per client).' }) }], isError: true };
      }
      const job = await jobService.getJobById(job_id);
      if (!job) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Job not found.' }) }], isError: true };
      await jobService.setNotifyEmail(job_id, email);
      // Race-condition fix: send now if already done
      if (job.status === 'completed') {
        try {
          await emailService.sendCrawlCompleteEmail(email, job.domain, job.total_pages_found, job_id);
        } catch (e: any) {
          console.error('[MCP] retroactive notify email failed:', e.message);
        }
      }
      return { content: [{ type: 'text', text: JSON.stringify({
        status: 'registered',
        message: `We'll email ${email} when the crawl for ${job.domain} finishes.`,
      }, null, 2) }] };
    }
  );

  // ── Tool 6: request_csv_export ───────────────────────────────
  server.tool(
    'request_csv_export',
    'Generate a CSV export of the crawl results. Email is OPTIONAL — the download URL will always ' +
      'be returned by get_csv_export once ready. Only pass an email if the user explicitly wants ' +
      'the link emailed too.',
    {
      job_id: z.string(),
      email: z.string().email().optional(),
    },
    async ({ job_id, email }) => {
      if (email && !checkAbuse(clientKey)) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Rate limit exceeded for email-based tools.' }) }], isError: true };
      }
      const job = await jobService.getJobById(job_id);
      if (!job) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Job not found.' }) }], isError: true };
      const active = await exportService.getActiveExportForJob(job_id);
      if (active) {
        return { content: [{ type: 'text', text: JSON.stringify({
          status: 'already_processing',
          export_id: active.id,
          next_step: 'Poll get_csv_export in ~5s.',
        }, null, 2) }] };
      }
      const csvExport = await exportService.createExport(job_id, email ?? null);
      await exportQueue.add('export-csv', { exportId: csvExport.id, jobId: job_id }, {
        attempts: 2, backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true, removeOnFail: false,
      });
      return { content: [{ type: 'text', text: JSON.stringify({
        status: 'processing',
        export_id: csvExport.id,
        email_will_be_sent: !!email,
        next_step: 'Poll get_csv_export in ~5s to receive the download URL.',
      }, null, 2) }] };
    }
  );

  // ── Tool 7: get_csv_export ───────────────────────────────────
  server.tool(
    'get_csv_export',
    'Poll for CSV export status. When status is "completed" or "sent", the download_url is included.',
    {
      export_id: z.string(),
      job_id: z.string().describe('The parent crawl job id (needed to build the download URL)'),
    },
    async ({ export_id, job_id }) => {
      const csvExport = await exportService.getExportById(export_id);
      if (!csvExport) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Export not found.' }) }], isError: true };
      const ready = csvExport.status === 'completed' || csvExport.status === 'sent';
      return { content: [{ type: 'text', text: JSON.stringify({
        export_id, status: csvExport.status,
        download_url: ready ? `${APP_BASE_URL}/api/crawl/${job_id}/download/${export_id}` : null,
        created_at: csvExport.created_at,
      }, null, 2) }] };
    }
  );

  return server;
}
