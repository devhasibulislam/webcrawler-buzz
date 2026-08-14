import { pool } from '../db/client';
import { CrawlJob, CrawledPage } from '../types';

export const jobService = {
  /**
   * Create a new crawl job.
   */
  async createJob(domain: string, inputUrl: string): Promise<CrawlJob> {
    const result = await pool.query(
      `INSERT INTO crawl_jobs (domain, input_url, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [domain, inputUrl]
    );
    return result.rows[0];
  },

  /**
   * Find the most recent completed/running job for a domain.
   */
  async findJobByDomain(domain: string): Promise<CrawlJob | null> {
    const result = await pool.query(
      `SELECT * FROM crawl_jobs
       WHERE domain = $1 AND status IN ('completed', 'running')
       ORDER BY created_at DESC
       LIMIT 1`,
      [domain]
    );
    return result.rows[0] || null;
  },

  /**
   * Get a job by ID.
   */
  async getJobById(jobId: string): Promise<CrawlJob | null> {
    const result = await pool.query(
      `SELECT * FROM crawl_jobs WHERE id = $1`,
      [jobId]
    );
    return result.rows[0] || null;
  },

  /**
   * Update job status.
   */
  async updateJobStatus(
    jobId: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    if (errorMessage) {
      await pool.query(
        `UPDATE crawl_jobs SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3`,
        [status, errorMessage, jobId]
      );
    } else {
      await pool.query(
        `UPDATE crawl_jobs SET status = $1, updated_at = NOW() WHERE id = $2`,
        [status, jobId]
      );
    }
  },

  /**
   * Reset job counters and delete old crawled pages (safe for BullMQ retries).
   */
  async resetJobForCrawl(jobId: string): Promise<void> {
    await pool.query(
      `DELETE FROM crawled_pages WHERE job_id = $1`,
      [jobId]
    );
    await pool.query(
      `UPDATE crawl_jobs SET total_pages_found = 0, total_pages_queued = 0, error_message = NULL, updated_at = NOW() WHERE id = $1`,
      [jobId]
    );
  },

  /**
   * Increment total_pages_found by 1.
   */
  async incrementPagesFound(jobId: string): Promise<void> {
    await pool.query(
      `UPDATE crawl_jobs SET total_pages_found = total_pages_found + 1, updated_at = NOW() WHERE id = $1`,
      [jobId]
    );
  },

  /**
   * Increment total_pages_queued by a count.
   */
  async incrementPagesQueued(jobId: string, count: number): Promise<void> {
    await pool.query(
      `UPDATE crawl_jobs SET total_pages_queued = total_pages_queued + $1, updated_at = NOW() WHERE id = $2`,
      [count, jobId]
    );
  },

  /**
   * Set total_pages_queued to match total_pages_found (on completion).
   */
  async finalizeJob(jobId: string): Promise<void> {
    await pool.query(
      `UPDATE crawl_jobs
       SET status = 'completed',
           total_pages_queued = total_pages_found,
           updated_at = NOW()
       WHERE id = $1`,
      [jobId]
    );
  },

  /**
   * Save notify email for a job.
   */
  async setNotifyEmail(jobId: string, email: string): Promise<void> {
    await pool.query(
      `UPDATE crawl_jobs SET notify_email = $1, updated_at = NOW() WHERE id = $2`,
      [email, jobId]
    );
  },

  /**
   * Insert a crawled page record.
   */
  async insertPage(page: Omit<CrawledPage, 'id' | 'discovered_at'>): Promise<void> {
    await pool.query(
      `INSERT INTO crawled_pages
       (job_id, url, page_title, meta_description, status_code, response_time_ms,
        content_type, page_size_bytes, internal_links_count, external_links_count,
        redirect_url, is_indexable)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        page.job_id,
        page.url,
        page.page_title || null,
        page.meta_description || null,
        page.status_code || null,
        page.response_time_ms || null,
        page.content_type || null,
        page.page_size_bytes || null,
        page.internal_links_count,
        page.external_links_count,
        page.redirect_url || null,
        page.is_indexable,
      ]
    );
  },

  /**
   * Get paginated crawled pages for a job.
   */
  async getPagesByJobId(jobId: string, page: number = 1, limit: number = 50): Promise<CrawledPage[]> {
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT * FROM crawled_pages WHERE job_id = $1 ORDER BY discovered_at ASC LIMIT $2 OFFSET $3`,
      [jobId, limit, offset]
    );
    return result.rows;
  },

  /**
   * Count total crawled pages for a job.
   */
  async countPagesByJobId(jobId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS total FROM crawled_pages WHERE job_id = $1`,
      [jobId]
    );
    return result.rows[0].total;
  },

  /**
   * Get ALL crawled pages for a job (for CSV download).
   */
  async getAllPagesByJobId(jobId: string): Promise<CrawledPage[]> {
    const result = await pool.query(
      `SELECT * FROM crawled_pages WHERE job_id = $1 ORDER BY discovered_at ASC`,
      [jobId]
    );
    return result.rows;
  },

  /**
   * Get completed/failed jobs older than 1 hour (for cleanup).
   */
  async getExpiredJobs(): Promise<CrawlJob[]> {
    const result = await pool.query(
      `SELECT * FROM crawl_jobs
       WHERE status IN ('completed', 'failed')
         AND updated_at <= NOW() - INTERVAL '1 hour'`
    );
    return result.rows;
  },

  /**
   * Mark any `running` jobs whose updated_at hasn't advanced in >3 minutes as failed.
   * Catches jobs orphaned by a worker crash or a mid-run redeploy.
   */
  async markStalledJobsFailed(): Promise<number> {
    const result = await pool.query(
      `UPDATE crawl_jobs
         SET status = 'failed',
             error_message = COALESCE(error_message, 'Crawl stalled (no progress for 3+ minutes)'),
             updated_at = NOW()
       WHERE status = 'running'
         AND updated_at <= NOW() - INTERVAL '3 minutes'`
    );
    return result.rowCount || 0;
  },

  /**
   * Delete a crawl job by ID (cascade removes crawled_pages + csv_exports).
   */
  async deleteJob(jobId: string): Promise<void> {
    await pool.query(`DELETE FROM crawl_jobs WHERE id = $1`, [jobId]);
  },
};
