import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Strip channel_binding from the connection string to avoid handshake issues
const dbUrl = (process.env.DATABASE_URL || '').replace(/[&?]channel_binding=require/g, '');

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 5,               // limit connections to avoid exhaustion
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Log pool errors instead of crashing
pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
});
