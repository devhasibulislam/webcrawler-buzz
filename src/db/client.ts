import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Log pool errors instead of crashing
pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
});
