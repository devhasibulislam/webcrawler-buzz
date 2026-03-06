import { Queue } from 'bullmq';

export const crawlerQueue = new Queue('crawler', {
  connection: {
    host: extractRedisHost(),
    port: extractRedisPort(),
    password: extractRedisPassword(),
    maxRetriesPerRequest: null,
  },
});

function extractRedisHost(): string {
  const url = new URL(process.env.REDIS_URL!);
  return url.hostname;
}

function extractRedisPort(): number {
  const url = new URL(process.env.REDIS_URL!);
  return parseInt(url.port, 10) || 6379;
}

function extractRedisPassword(): string | undefined {
  const url = new URL(process.env.REDIS_URL!);
  return url.password || undefined;
}
