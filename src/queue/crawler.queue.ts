import { Queue } from 'bullmq';

export const crawlerQueue = new Queue('crawler', {
  connection: {
    host: extractRedisHost(),
    port: extractRedisPort(),
    username: extractRedisUsername(),
    password: extractRedisPassword(),
    maxRetriesPerRequest: null,
  },
  prefix: 'webcrawler',
});

function extractRedisUsername(): string | undefined {
  const url = new URL(process.env.REDIS_URL!);
  return url.username ? decodeURIComponent(url.username) : undefined;
}

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
  return url.password ? decodeURIComponent(url.password) : undefined;
}
