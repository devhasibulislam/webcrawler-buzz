import { Worker } from 'bullmq';
import fs from 'fs';
import path from 'path';
import { jobService } from '../services/job.service';
import { exportService } from '../services/export.service';
import { emailService } from '../services/email.service';

function getRedisConfig() {
  const url = new URL(process.env.REDIS_URL!);
  return {
    host: url.hostname,
    port: parseInt(url.port, 10) || 6379,
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
}

// Ensure tmp/exports directory exists
const exportsDir = path.join(__dirname, '../../tmp/exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

export const exportWorker = new Worker(
  'csv-export',
  async (job) => {
    const { exportId, jobId } = job.data;

    try {
      // 1. Fetch all pages
      const pages = await jobService.getAllPagesByJobId(jobId);
      const crawlJob = await jobService.getJobById(jobId);

      if (!crawlJob) {
        throw new Error(`Crawl job ${jobId} not found`);
      }

      // 2. Generate CSV
      const headers = [
        'URL', 'Page Title', 'Meta Description', 'HTTP Status',
        'Response Time (ms)', 'Content Type', 'Page Size (bytes)',
        'Internal Links', 'External Links', 'Redirect URL',
        'Is Indexable', 'Discovered At',
      ];

      let csv = headers.map(h => `"${h}"`).join(',') + '\n';
      for (const p of pages) {
        const row = [
          p.url,
          p.page_title || '',
          p.meta_description || '',
          p.status_code || '',
          p.response_time_ms || '',
          p.content_type || '',
          p.page_size_bytes || '',
          p.internal_links_count || 0,
          p.external_links_count || 0,
          p.redirect_url || '',
          p.is_indexable ? 'Yes' : 'No',
          p.discovered_at || '',
        ];
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
      }

      // 3. Save to disk
      const fileName = `export-${exportId}.csv`;
      const filePath = path.join(exportsDir, fileName);
      fs.writeFileSync(filePath, csv, 'utf-8');

      // 4. Update export record
      await exportService.updateExport(exportId, 'completed', filePath);

      // 5. Get export record for email
      const exportRecord = await exportService.getExportById(exportId);
      if (!exportRecord) {
        throw new Error(`Export record ${exportId} not found`);
      }

      // 6. Send download link via email
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5005';
      const downloadUrl = `${baseUrl}/api/crawl/${jobId}/download/${exportId}`;

      await emailService.sendExportReadyEmail(
        exportRecord.email,
        crawlJob.domain,
        pages.length,
        downloadUrl
      );

      // 7. Mark as sent
      await exportService.updateExport(exportId, 'sent');

      console.log(`[ExportWorker] Export ${exportId} completed and email sent to ${exportRecord.email}`);
    } catch (err: any) {
      console.error(`[ExportWorker] Export ${exportId} failed:`, err.message);
      throw err;
    }
  },
  {
    connection: getRedisConfig(),
    concurrency: 2,
  }
);

exportWorker.on('completed', (job) => {
  console.log(`[ExportWorker] Job ${job.id} completed`);
});

exportWorker.on('failed', (job, err) => {
  console.error(`[ExportWorker] Job ${job?.id} failed:`, err.message);
});
