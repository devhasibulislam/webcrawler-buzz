import { Worker } from 'bullmq';
import { crawlerService } from '../services/crawler.service';

function getRedisConfig() {
  const url = new URL(process.env.REDIS_URL!);
  return {
    host: url.hostname,
    port: parseInt(url.port, 10) || 6379,
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
}

export const crawlerWorker = new Worker(
  'crawler',
  async (job) => {
    const { jobId, startUrl, domain } = job.data;
    await crawlerService.crawl(jobId, startUrl, domain);
  },
  {
    connection: getRedisConfig(),
    concurrency: 5,
    removeOnComplete: { count: 0 },
  }
);

crawlerWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

crawlerWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});
