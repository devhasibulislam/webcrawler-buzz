import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Express } from 'express';

export function setupSecurity(app: Express): void {
  // 1. Helmet — HTTP security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allow CDN scripts (Tailwind, Google Fonts)
    })
  );

  // 2. CORS — restrict to own domain
  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5005',
    })
  );

  // 3. Rate limiting — 200 requests / 15 min / IP (POST endpoints only)
  app.use(
    '/api/',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      message: { error: 'Too many requests, please try again later.' },
      skip: (req) => req.method === 'GET', // skip rate limit for GET (progress polling)
    })
  );
}
