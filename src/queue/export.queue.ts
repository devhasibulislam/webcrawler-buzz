import { Queue } from 'bullmq';

function getRedisConfig() {
  const url = new URL(process.env.REDIS_URL!);
  return {
    host: url.hostname,
    port: parseInt(url.port, 10) || 6379,
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
}

export const exportQueue = new Queue('csv-export', {
  connection: getRedisConfig(),
});
