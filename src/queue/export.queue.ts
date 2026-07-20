import { Queue } from 'bullmq';

function getRedisConfig() {
  const url = new URL(process.env.REDIS_URL!);
  return {
    host: url.hostname,
    port: parseInt(url.port, 10) || 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    maxRetriesPerRequest: null,
  };
}

export const exportQueue = new Queue('csv-export', {
  connection: getRedisConfig(),
  prefix: 'webcrawler',
});
