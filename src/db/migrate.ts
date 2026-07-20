import { pool } from './client';

async function migrate() {
  console.log('Running database migrations...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crawl_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      domain VARCHAR(255) NOT NULL,
      input_url TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      total_pages_found INT DEFAULT 0,
      total_pages_queued INT DEFAULT 0,
      notify_email VARCHAR(255),
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crawled_pages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      page_title TEXT,
      meta_description TEXT,
      status_code INT,
      response_time_ms INT,
      content_type VARCHAR(255),
      page_size_bytes INT,
      internal_links_count INT DEFAULT 0,
      external_links_count INT DEFAULT 0,
      redirect_url TEXT,
      is_indexable BOOLEAN DEFAULT TRUE,
      discovered_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS csv_exports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      file_path TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'processing',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // ── Indexes for query performance ──────────────────────
  // crawl_jobs: lookup by domain + status (used by findJobByDomain)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_crawl_jobs_domain_status
    ON crawl_jobs (domain, status);
  `);

  // crawl_jobs: cleanup cron queries by status + updated_at
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status_updated
    ON crawl_jobs (status, updated_at)
    WHERE status IN ('completed', 'failed');
  `);

  // crawled_pages: lookup by job_id (used by all page queries)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_crawled_pages_job_id
    ON crawled_pages (job_id);
  `);

  // crawled_pages: pagination ordering (job_id + discovered_at)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_crawled_pages_job_discovered
    ON crawled_pages (job_id, discovered_at ASC);
  `);

  // csv_exports: lookup active exports by job_id + status
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_csv_exports_job_status
    ON csv_exports (job_id, status);
  `);

  // csv_exports.email must be nullable (MCP export flow allows email-less exports)
  await pool.query(`
    ALTER TABLE csv_exports ALTER COLUMN email DROP NOT NULL;
  `);

  console.log('Migrations complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
