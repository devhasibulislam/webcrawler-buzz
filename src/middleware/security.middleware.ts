import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Express } from 'express';

export function setupSecurity(app: Express): void {
  // 1. Helmet — HTTP security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https://www.googletagmanager.com"],
          connectSrc: ["'self'", "https://www.google-analytics.com", "https://www.googletagmanager.com"],
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
