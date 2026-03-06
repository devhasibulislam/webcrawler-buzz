import { pool } from '../db/client';
import { CsvExport } from '../types';

export const exportService = {
  /**
   * Create a new CSV export record.
   */
  async createExport(jobId: string, email: string): Promise<CsvExport> {
    const result = await pool.query(
      `INSERT INTO csv_exports (job_id, email, status)
       VALUES ($1, $2, 'processing')
       RETURNING *`,
      [jobId, email]
    );
    return result.rows[0];
  },

  /**
   * Get an export by ID.
   */
  async getExportById(exportId: string): Promise<CsvExport | null> {
    const result = await pool.query(
      `SELECT * FROM csv_exports WHERE id = $1`,
      [exportId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get the latest active (non-expired) export for a job.
   * Active = created within the last 5 minutes.
   */
  async getActiveExportForJob(jobId: string): Promise<CsvExport | null> {
    const result = await pool.query(
      `SELECT * FROM csv_exports
       WHERE job_id = $1 AND created_at > NOW() - INTERVAL '5 minutes'
       ORDER BY created_at DESC
       LIMIT 1`,
      [jobId]
    );
    return result.rows[0] || null;
  },

  /**
   * Update export status and optionally set file_path.
   */
  async updateExport(
    exportId: string,
    status: string,
    filePath?: string
  ): Promise<void> {
    if (filePath) {
      await pool.query(
        `UPDATE csv_exports SET status = $1, file_path = $2 WHERE id = $3`,
        [status, filePath, exportId]
      );
    } else {
      await pool.query(
        `UPDATE csv_exports SET status = $1 WHERE id = $2`,
        [status, exportId]
      );
    }
  },

  /**
   * Get all expired exports (older than 5 minutes).
   */
  async getExpiredExports(): Promise<CsvExport[]> {
    const result = await pool.query(
      `SELECT * FROM csv_exports WHERE created_at <= NOW() - INTERVAL '5 minutes'`
    );
    return result.rows;
  },

  /**
   * Delete an export record by ID.
   */
  async deleteExport(exportId: string): Promise<void> {
    await pool.query(`DELETE FROM csv_exports WHERE id = $1`, [exportId]);
  },
};
