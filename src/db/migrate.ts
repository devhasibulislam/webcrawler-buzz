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

  console.log('Migrations complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
