export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface CrawlJob {
  id: string;
  domain: string;
  input_url: string;
  status: JobStatus;
  total_pages_found: number;
  total_pages_queued: number;
  notify_email?: string;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CrawledPage {
  id: string;
  job_id: string;
  url: string;
  page_title?: string;
  meta_description?: string;
  status_code?: number;
  response_time_ms?: number;
  content_type?: string;
  page_size_bytes?: number;
  internal_links_count: number;
  external_links_count: number;
  redirect_url?: string;
  is_indexable: boolean;
  discovered_at: Date;
}

export interface StartCrawlRequest {
  url: string;
}

export interface DecideRequest {
  domain: string;
  action: 're-crawl' | 'use-existing';
}

export interface NotifyRequest {
  email: string;
}

export interface ExportRequest {
  email: string;
}

export type ExportStatus = 'processing' | 'completed' | 'sent';

export interface CsvExport {
  id: string;
  job_id: string;
  email?: string | null;
  file_path?: string;
  status: ExportStatus;
  created_at: Date;
}

export interface ProgressResponse {
  job_id: string;
  status: JobStatus;
  total_pages_found: number;
  total_pages_queued: number;
  progress_percent: number;
}
