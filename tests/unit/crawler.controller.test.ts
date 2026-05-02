import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

// Mock dependencies before importing controller
vi.mock('../../src/services/job.service', () => ({
  jobService: {
    findJobByDomain: vi.fn(),
    createJob: vi.fn(),
    getJobById: vi.fn(),
    setNotifyEmail: vi.fn(),
    countPagesByJobId: vi.fn(),
    getPagesByJobId: vi.fn(),
  },
}));

vi.mock('../../src/services/export.service', () => ({
  exportService: {
    getActiveExportForJob: vi.fn(),
    createExport: vi.fn(),
    getExportById: vi.fn(),
  },
}));

vi.mock('../../src/services/email.service', () => ({
  emailService: {
    sendCrawlCompleteEmail: vi.fn(),
  },
}));

vi.mock('../../src/queue/crawler.queue', () => ({
  crawlerQueue: { add: vi.fn() },
}));

vi.mock('../../src/queue/export.queue', () => ({
  exportQueue: { add: vi.fn() },
}));

import { crawlerController } from '../../src/controllers/crawler.controller';
import { jobService } from '../../src/services/job.service';
import { crawlerQueue } from '../../src/queue/crawler.queue';

function mockReqRes(body: any = {}, params: any = {}, query: any = {}) {
  const req = { body, params, query } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
  } as unknown as Response;
  return { req, res };
}

describe('crawlerController.startCrawl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when url is missing', async () => {
    const { req, res } = mockReqRes({});
    await crawlerController.startCrawl(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('URL is required') })
    );
  });

  it('returns 400 for invalid URL', async () => {
    const { req, res } = mockReqRes({ url: 'not-a-url' });
    await crawlerController.startCrawl(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Invalid URL') })
    );
  });

  it('returns existing job if domain was already crawled', async () => {
    const existing = {
      id: 'job-123',
      domain: 'example.com',
      created_at: new Date(),
      total_pages_found: 50,
    };
    vi.mocked(jobService.findJobByDomain).mockResolvedValue(existing as any);

    const { req, res } = mockReqRes({ url: 'https://example.com' });
    await crawlerController.startCrawl(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'exists', job_id: 'job-123' })
    );
  });

  it('creates new job and queues crawl for fresh domain', async () => {
    vi.mocked(jobService.findJobByDomain).mockResolvedValue(null);
    vi.mocked(jobService.createJob).mockResolvedValue({
      id: 'new-job-456',
      domain: 'fresh.com',
    } as any);
    vi.mocked(crawlerQueue.add).mockResolvedValue(undefined as any);

    const { req, res } = mockReqRes({ url: 'https://fresh.com/page' });
    await crawlerController.startCrawl(req, res);

    expect(jobService.createJob).toHaveBeenCalledWith('fresh.com', 'https://fresh.com/page');
    expect(crawlerQueue.add).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'started', job_id: 'new-job-456' })
    );
  });
});

describe('crawlerController.getProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when job not found', async () => {
    vi.mocked(jobService.getJobById).mockResolvedValue(null);
    const { req, res } = mockReqRes({}, { job_id: 'nonexistent' });
    await crawlerController.getProgress(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns progress for running job', async () => {
    vi.mocked(jobService.getJobById).mockResolvedValue({
      id: 'job-1',
      status: 'running',
      total_pages_found: 25,
      total_pages_queued: 100,
    } as any);

    const { req, res } = mockReqRes({}, { job_id: 'job-1' });
    await crawlerController.getProgress(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ progress_percent: 25 })
    );
  });

  it('returns 100% for completed job', async () => {
    vi.mocked(jobService.getJobById).mockResolvedValue({
      id: 'job-1',
      status: 'completed',
      total_pages_found: 50,
      total_pages_queued: 50,
    } as any);

    const { req, res } = mockReqRes({}, { job_id: 'job-1' });
    await crawlerController.getProgress(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ progress_percent: 100 })
    );
  });
});
