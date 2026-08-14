import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Express, Request } from 'express';

export function setupSecurity(app: Express): void {
  // 1. Helmet, HTTP security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Google AdSense loader + gtag + Lucide + Cloudflare Insights.
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://www.googletagmanager.com",
            "https://static.cloudflareinsights.com",
            "https://unpkg.com",
            "https://pagead2.googlesyndication.com",
            "https://tpc.googlesyndication.com",
          ],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: [
            "'self'",
            "data:",
            "https://www.googletagmanager.com",
            // AdSense creative + tracking pixels come from these hosts.
            "https://pagead2.googlesyndication.com",
            "https://googleads.g.doubleclick.net",
            "https://www.google.com",
          ],
          connectSrc: [
            "'self'",
            "https://www.google-analytics.com",
            "https://www.googletagmanager.com",
            "https://cloudflareinsights.com",
            "https://pagead2.googlesyndication.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          // AdSense renders each ad in a sandboxed iframe from these origins.
          frameSrc: [
            "https://googleads.g.doubleclick.net",
            "https://tpc.googlesyndication.com",
          ],
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

  // 2. CORS, open for API routes (public API), restrict frontend pages to own domain
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

  // 3. Rate limiting, API endpoints
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
