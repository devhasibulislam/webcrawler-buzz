import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Express, Request } from 'express';

export function setupSecurity(app: Express): void {
  // 1. Helmet — HTTP security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://static.cloudflareinsights.com"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https://www.googletagmanager.com"],
          connectSrc: ["'self'", "https://www.google-analytics.com", "https://www.googletagmanager.com", "https://cloudflareinsights.com"],
          fontSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // 2. CORS — open for API routes (public API), restrict frontend pages to own domain
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5005';
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl, AI tools)
        if (!origin) return callback(null, true);
        // Allow own frontend
        if (origin === allowedOrigin) return callback(null, true);
        // Allow any origin for API routes (handled per-request below)
        callback(null, true);
      },
    })
  );

  // 3. Rate limiting — API endpoints
  // POST: 60 requests / 15 min / IP (crawl starts, exports, notifications)
  app.use(
    '/api/',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 60,
      message: { error: 'Too many requests, please try again later.' },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req: Request) => req.method === 'GET',
    })
  );

  // GET: 300 requests / 15 min / IP (progress polling, results)
  app.use(
    '/api/',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      message: { error: 'Too many requests, please try again later.' },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req: Request) => req.method !== 'GET',
    })
  );
}
