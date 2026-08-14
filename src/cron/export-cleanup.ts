import cron from 'node-cron';
import fs from 'fs';
import { exportService } from '../services/export.service';
import { jobService } from '../services/job.service';

/**
 * Cron job that runs every minute to clean up expired CSV exports.
 * Deletes files older than 5 minutes from disk and removes DB records.
 */
export function startExportCleanupCron(): void {
  cron.schedule('* * * * *', async () => {
    try {
      const expired = await exportService.getExpiredExports();

      if (expired.length === 0) return;

      console.log(`[Cron] Cleaning up ${expired.length} expired export(s)...`);

      for (const exp of expired) {
        // Delete file from disk
        if (exp.file_path && fs.existsSync(exp.file_path)) {
          fs.unlinkSync(exp.file_path);
          console.log(`[Cron] Deleted file: ${exp.file_path}`);
        }

        // Delete DB record
        await exportService.deleteExport(exp.id);
        console.log(`[Cron] Deleted export record: ${exp.id}`);
      }
    } catch (err: any) {
      console.error('[Cron] Export cleanup error:', err.message);
    }
  });

  console.log('[Cron] Export cleanup job scheduled (every minute)');
}

/**
 * Cron job that runs every minute to delete completed/failed crawl jobs
 * older than 1 hour. Cleans up CSV files from disk first, then deletes
 * the job row (cascade removes crawled_pages + csv_exports records).
 */
export function startJobCleanupCron(): void {
  cron.schedule('* * * * *', async () => {
    try {
      // Reap stalled `running` jobs first so users see failure instead of
      // an eternal spinner when a worker crashes mid-crawl.
      const stalled = await jobService.markStalledJobsFailed();
      if (stalled > 0) {
        console.log(`[Cron] Marked ${stalled} stalled job(s) as failed.`);
      }

      const expiredJobs = await jobService.getExpiredJobs();

      if (expiredJobs.length === 0) return;

      console.log(`[Cron] Cleaning up ${expiredJobs.length} expired crawl job(s)...`);

      for (const job of expiredJobs) {
        // Delete any CSV files on disk for this job's exports
        const exports = await exportService.getExpiredExportsByJobId(job.id);
        for (const exp of exports) {
          if (exp.file_path && fs.existsSync(exp.file_path)) {
            fs.unlinkSync(exp.file_path);
            console.log(`[Cron] Deleted export file: ${exp.file_path}`);
          }
        }

        // Delete job row, cascade removes crawled_pages + csv_exports
        await jobService.deleteJob(job.id);
        console.log(`[Cron] Deleted expired job: ${job.id} (${job.domain}, status: ${job.status})`);
      }
    } catch (err: any) {
      console.error('[Cron] Job cleanup error:', err.message);
    }
  });

  console.log('[Cron] Job cleanup cron scheduled (every minute)');
}
