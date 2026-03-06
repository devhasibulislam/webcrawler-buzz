import axios from 'axios';
import * as cheerio from 'cheerio';
import { pool } from '../db/client';
import { jobService } from './job.service';
import { emailService } from './email.service';
import {
  normalizeUrl,
  isInternalLink,
  resolveUrl,
} from '../utils/url.utils';

// Max pages to crawl per job — prevents infinite crawling on large sites
const MAX_PAGES = 200;

export const crawlerService = {
  /**
   * BFS crawl starting from startUrl, scoped to the given domain.
   */
  async crawl(jobId: string, startUrl: string, domain: string): Promise<void> {
    console.log(`[Crawler] Starting crawl for job ${jobId} — domain: ${domain} (max ${MAX_PAGES} pages)`);

    // 1. Reset counters and old data (safe for BullMQ retries)
    await jobService.resetJobForCrawl(jobId);

    // 2. Set status to running
    await jobService.updateJobStatus(jobId, 'running');

    const queue: string[] = [startUrl];
    const visited = new Set<string>();
    const queued = new Set<string>([startUrl]);

    // 3. Initial queued count = 1
    await jobService.incrementPagesQueued(jobId, 1);

    try {
      while (queue.length > 0) {
        // Stop if we've hit the max pages limit
        if (visited.size >= MAX_PAGES) {
          console.log(`[Crawler] Job ${jobId} — reached max ${MAX_PAGES} pages limit.`);
          break;
        }

        const currentUrl = queue.shift()!;

        // Skip if already visited
        if (visited.has(currentUrl)) continue;
        visited.add(currentUrl);

        let statusCode = 0;
        let responseTimeMs = 0;
        let contentType = '';
        let pageSizeBytes = 0;
        let pageTitle: string | undefined;
        let metaDescription: string | undefined;
        let isIndexable = true;
        let redirectUrl: string | undefined;
        let internalLinksCount = 0;
        let externalLinksCount = 0;

        const startTime = Date.now();

        try {
          const response = await axios.get(currentUrl, {
            timeout: 15000,
            maxRedirects: 5,
            validateStatus: () => true, // accept all status codes
            headers: {
              'User-Agent':
                'Mozilla/5.0 (compatible; DomainCrawlerBot/1.0)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
            },
          });

          responseTimeMs = Date.now() - startTime;
          statusCode = response.status;
          contentType = response.headers['content-type'] || '';
          const body =
            typeof response.data === 'string'
              ? response.data
              : JSON.stringify(response.data);
          pageSizeBytes = Buffer.byteLength(body, 'utf-8');

          // Check for redirect
          if (response.request?.res?.responseUrl && response.request.res.responseUrl !== currentUrl) {
            redirectUrl = response.request.res.responseUrl;
          }

          // Only parse HTML content
          if (contentType.includes('text/html')) {
            const $ = cheerio.load(body);

            // Page title
            pageTitle = $('title').first().text().trim() || undefined;

            // Meta description
            metaDescription =
              $('meta[name="description"]').attr('content')?.trim() || undefined;

            // Indexability — check meta robots
            const robotsMeta = $('meta[name="robots"]').attr('content') || '';
            if (robotsMeta.toLowerCase().includes('noindex')) {
              isIndexable = false;
            }

            // Extract all links
            $('a[href]').each((_i, el) => {
              const href = $(el).attr('href');
              if (!href) return;

              const resolved = resolveUrl(href, currentUrl);
              if (!resolved) return;

              if (isInternalLink(resolved, domain)) {
                internalLinksCount++;
                // Add to BFS queue if not yet queued
                const normalized = normalizeUrl(resolved);
                if (!queued.has(normalized)) {
                  queued.add(normalized);
                  queue.push(normalized);
                }
              } else {
                externalLinksCount++;
              }
            });
          }
        } catch (fetchErr: any) {
          // Page fetch error — record with status_code = 0
          responseTimeMs = Date.now() - startTime;
          console.warn(
            `[Crawler] Failed to fetch ${currentUrl}: ${fetchErr.message}`
          );
        }

        // Insert crawled page record
        await jobService.insertPage({
          job_id: jobId,
          url: currentUrl,
          page_title: pageTitle,
          meta_description: metaDescription,
          status_code: statusCode,
          response_time_ms: responseTimeMs,
          content_type: contentType,
          page_size_bytes: pageSizeBytes,
          internal_links_count: internalLinksCount,
          external_links_count: externalLinksCount,
          redirect_url: redirectUrl,
          is_indexable: isIndexable,
        });

        // Increment pages found
        await jobService.incrementPagesFound(jobId);

        // Update pages queued to reflect current queue + visited size
        const totalDiscovered = queued.size;
        await updateTotalQueued(jobId, totalDiscovered);

        // Log progress every 25 pages
        if (visited.size % 25 === 0) {
          console.log(`[Crawler] Job ${jobId} — ${visited.size} pages crawled, ${queue.length} in queue`);
        }

        // Small delay to keep event loop responsive for HTTP requests
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 5. Finalize job
      await jobService.finalizeJob(jobId);
      console.log(`[Crawler] Job ${jobId} completed. Total pages: ${visited.size}`);

      // 6. Send email notification if email was provided
      const job = await jobService.getJobById(jobId);
      if (job?.notify_email) {
        console.log(`[Crawler] Sending email notification to ${job.notify_email}...`);
        try {
          await emailService.sendCrawlCompleteEmail(
            job.notify_email,
            domain,
            job.total_pages_found,
            jobId
          );
          console.log(`[Crawler] Email sent successfully to ${job.notify_email}`);
        } catch (emailErr: any) {
          console.error(`[Crawler] Failed to send email: ${emailErr.message}`);
        }
      }
    } catch (err: any) {
      console.error(`[Crawler] Job ${jobId} failed:`, err.message);
      await jobService.updateJobStatus(jobId, 'failed', err.message);
    }
  },
};

/**
 * Directly set total_pages_queued to an absolute value.
 */
async function updateTotalQueued(jobId: string, total: number): Promise<void> {
  await pool.query(
    `UPDATE crawl_jobs SET total_pages_queued = $1, updated_at = NOW() WHERE id = $2`,
    [total, jobId]
  );
}
