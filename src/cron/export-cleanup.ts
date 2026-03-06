import cron from 'node-cron';
import fs from 'fs';
import { exportService } from '../services/export.service';

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
