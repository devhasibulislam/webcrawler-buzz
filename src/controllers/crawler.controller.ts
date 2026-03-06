import { Request, Response } from 'express';
import { jobService } from '../services/job.service';
import { crawlerQueue } from '../queue/crawler.queue';
import { extractRootDomain, isValidUrl } from '../utils/url.utils';
import { StartCrawlRequest, DecideRequest, NotifyRequest } from '../types';

export const crawlerController = {
  /**
   * POST /api/crawl — Start a new crawl or detect duplicate domain.
   */
  async startCrawl(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.body as StartCrawlRequest;

      // Input validation
      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'URL is required and must be a string.' });
        return;
      }

      if (!isValidUrl(url)) {
        res.status(400).json({
          error: 'Invalid URL. Must start with http:// or https:// and be a valid URL.',
        });
        return;
      }

      const rootDomain = extractRootDomain(url);

      // Check for existing crawl
      const existingJob = await jobService.findJobByDomain(rootDomain);
      if (existingJob) {
        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5005';
        res.status(200).json({
          status: 'exists',
          job_id: existingJob.id,
          domain: rootDomain,
          crawled_at: existingJob.created_at,
          total_pages: existingJob.total_pages_found,
          tracking_url: `${baseUrl}/results?job_id=${existingJob.id}`,
          prompt: "Send action 're-crawl' or 'use-existing' to POST /api/crawl/decide",
        });
        return;
      }

      // Create new job
      const newJob = await jobService.createJob(rootDomain, url);
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5005';

      // Push to BullMQ queue
      await crawlerQueue.add(
        'crawl-job',
        {
          jobId: newJob.id,
          startUrl: url,
          domain: rootDomain,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      res.status(201).json({
        status: 'started',
        job_id: newJob.id,
        tracking_url: `${baseUrl}/results?job_id=${newJob.id}`,
        message: 'Crawl started! Use tracking_url to follow progress.',
      });
    } catch (err: any) {
      console.error('[Controller] startCrawl error:', err.message);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * POST /api/crawl/decide — Handle duplicate domain decision.
   */
  async decide(req: Request, res: Response): Promise<void> {
    try {
      const { domain, action } = req.body as DecideRequest;

      if (!domain || !action) {
        res.status(400).json({ error: 'domain and action are required.' });
        return;
      }

      if (action !== 're-crawl' && action !== 'use-existing') {
        res.status(400).json({
          error: "action must be 're-crawl' or 'use-existing'.",
        });
        return;
      }

      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5005';

      if (action === 'use-existing') {
        const existingJob = await jobService.findJobByDomain(domain);
        if (!existingJob) {
          res.status(404).json({ error: 'No existing crawl found for this domain.' });
          return;
        }
        res.status(200).json({
          status: 'exists',
          job_id: existingJob.id,
          tracking_url: `${baseUrl}/results?job_id=${existingJob.id}`,
        });
        return;
      }

      // re-crawl — create new job
      const newJob = await jobService.createJob(domain, `https://${domain}`);

      await crawlerQueue.add(
        'crawl-job',
        {
          jobId: newJob.id,
          startUrl: `https://${domain}`,
          domain: domain,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      res.status(201).json({
        status: 'started',
        job_id: newJob.id,
        tracking_url: `${baseUrl}/results?job_id=${newJob.id}`,
        message: 'Re-crawl started!',
      });
    } catch (err: any) {
      console.error('[Controller] decide error:', err.message);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * POST /api/crawl/:job_id/notify — Save email for notification.
   */
  async notify(req: Request, res: Response): Promise<void> {
    try {
      const job_id = req.params.job_id as string;
      const { email } = req.body as NotifyRequest;

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        res.status(400).json({ error: 'A valid email address is required.' });
        return;
      }

      const job = await jobService.getJobById(job_id);
      if (!job) {
        res.status(404).json({ error: 'Job not found.' });
        return;
      }

      await jobService.setNotifyEmail(job_id, email);

      res.status(200).json({
        message: `Got it! We'll send results to ${email} when done.`,
      });
    } catch (err: any) {
      console.error('[Controller] notify error:', err.message);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * GET /api/crawl/:job_id/progress — Lightweight progress polling.
   */
  async getProgress(req: Request, res: Response): Promise<void> {
    try {
      const job_id = req.params.job_id as string;
      const job = await jobService.getJobById(job_id);

      if (!job) {
        res.status(404).json({ error: 'Job not found.' });
        return;
      }

      let progressPercent = 0;
      if (job.status === 'completed') {
        progressPercent = 100;
      } else if (job.total_pages_queued > 0) {
        progressPercent = Math.round(
          (job.total_pages_found / job.total_pages_queued) * 100
        );
      }

      res.status(200).json({
        job_id: job.id,
        status: job.status,
        total_pages_found: job.total_pages_found,
        total_pages_queued: job.total_pages_queued,
        progress_percent: progressPercent,
      });
    } catch (err: any) {
      console.error('[Controller] getProgress error:', err.message);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * GET /api/crawl/:job_id — Paginated results.
   */
  async getResults(req: Request, res: Response): Promise<void> {
    try {
      const job_id = req.params.job_id as string;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const allowedLimits = [50, 100, 500, 1000];
      let limit = parseInt(req.query.limit as string) || 50;
      if (!allowedLimits.includes(limit)) limit = 50;

      const job = await jobService.getJobById(job_id);

      if (!job) {
        res.status(404).json({ error: 'Job not found.' });
        return;
      }

      const totalCount = await jobService.countPagesByJobId(job_id);
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const safePage = Math.min(page, totalPages);
      const pages = await jobService.getPagesByJobId(job_id, safePage, limit);

      res.status(200).json({
        job_id: job.id,
        domain: job.domain,
        status: job.status,
        total_pages_found: job.total_pages_found,
        pagination: {
          page: safePage,
          limit,
          total_count: totalCount,
          total_pages: totalPages,
        },
        pages,
      });
    } catch (err: any) {
      console.error('[Controller] getResults error:', err.message);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * GET /api/crawl/:job_id/export — All pages (for CSV download).
   */
  async exportResults(req: Request, res: Response): Promise<void> {
    try {
      const job_id = req.params.job_id as string;
      const job = await jobService.getJobById(job_id);

      if (!job) {
        res.status(404).json({ error: 'Job not found.' });
        return;
      }

      const pages = await jobService.getAllPagesByJobId(job_id);

      res.status(200).json({
        job_id: job.id,
        domain: job.domain,
        total_pages_found: job.total_pages_found,
        pages,
      });
    } catch (err: any) {
      console.error('[Controller] exportResults error:', err.message);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
};
