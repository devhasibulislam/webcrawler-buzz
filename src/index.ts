import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import compression from 'compression';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import rateLimit from 'express-rate-limit';

import { setupSecurity } from './middleware/security.middleware';
import { swaggerAuth } from './middleware/swagger-auth.middleware';
import { swaggerSpec } from './swagger/swagger';
import crawlerRoutes from './routes/crawler.routes';
import operationalRoutes from './routes/operational.routes';
import viewRoutes from './routes/view.routes';
import { createMcpServer } from './mcp/server';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';

// Import workers to start processing jobs
import './queue/crawler.worker';
import './queue/export.worker';

import { startExportCleanupCron, startJobCleanupCron } from './cron/export-cleanup';

const app = express();
const PORT = parseInt(process.env.PORT || '5005', 10);

// Behind nginx + Cloudflare, trust one proxy hop so req.ip / X-Forwarded-For
// resolve to the real client IP (needed for express-rate-limit accuracy).
app.set('trust proxy', 1);

// Compression middleware (gzip/brotli)
app.use(compression());

// SEO-critical files, served before security/static middleware so bots always get them
// These need explicit Cache-Control with s-maxage so Cloudflare edge caches them
app.get(['/robots.txt', '/robots.txt/'], (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  res.sendFile(path.join(__dirname, '../public/robots.txt'));
});
app.get(['/sitemap.xml', '/sitemap.xml/'], (_req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.sendFile(path.join(__dirname, '../public/sitemap.xml'));
});

// Security middleware
setupSecurity(app);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (serve .well-known for AI plugin discovery).
// HTML is never cached at the edge so a fresh deploy is picked up immediately;
// JS/CSS are versioned via ?v= query strings, so we let the browser cache them.
app.use(express.static(path.join(__dirname, '../public'), {
  dotfiles: 'allow',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// Swagger docs, protected by Basic Auth
app.use('/api-docs', swaggerAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use('/api/crawl', crawlerRoutes);
app.use('/api', operationalRoutes);

// ── MCP endpoint (public, sessioned Streamable HTTP, no auth) ─
// GET /mcp (browser) -> docs page
// POST /mcp -> JSON-RPC (initialize creates session; subsequent requests carry mcp-session-id)
// GET /mcp (with mcp-session-id) -> SSE stream for server-initiated notifications
// DELETE /mcp -> terminate session
const mcpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { jsonrpc: '2.0', error: { code: -32000, message: 'Rate limit exceeded' }, id: null },
  standardHeaders: true,
  legacyHeaders: false,
});

const mcpTransports = new Map<string, StreamableHTTPServerTransport>();

app.post('/mcp', mcpLimiter, async (req, res) => {
  try {
    const clientKey = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || 'unknown';
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport = sessionId ? mcpTransports.get(sessionId) : undefined;

    if (!transport && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          mcpTransports.set(sid, transport!);
        },
      });
      transport.onclose = () => {
        if (transport?.sessionId) mcpTransports.delete(transport.sessionId);
      };
      const server = createMcpServer(clientKey);
      await server.connect(transport);
    }

    if (!transport) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'No valid session. Send an initialize request first.' },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (err: any) {
    console.error('[MCP POST]', err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null });
    }
  }
});

app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const transport = sessionId ? mcpTransports.get(sessionId) : undefined;

  // Browser or curl without a session -> serve docs page
  if (!transport) {
    const accept = String(req.headers.accept || '');
    if (accept.includes('text/event-stream')) {
      res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Missing or invalid session' }, id: null });
      return;
    }
    res.sendFile(path.join(__dirname, '../public/mcp.html'));
    return;
  }

  try {
    await transport.handleRequest(req, res);
  } catch (err: any) {
    console.error('[MCP GET]', err?.message || err);
    if (!res.headersSent) res.status(500).end();
  }
});

app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const transport = sessionId ? mcpTransports.get(sessionId) : undefined;
  if (!transport) {
    res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Missing session' }, id: null });
    return;
  }
  try {
    await transport.handleRequest(req, res);
  } catch (err: any) {
    console.error('[MCP DELETE]', err?.message || err);
    if (!res.headersSent) res.status(500).end();
  }
});

// View routes (HTML pages)
app.use('/', viewRoutes);

// Global error handlers, keep the server alive
process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled rejection:', reason);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🕷️  Domain Crawler running on http://localhost:${PORT}`);
  console.log(`📖  Swagger docs: http://localhost:${PORT}/api-docs`);
  startExportCleanupCron();
  startJobCleanupCron();
});

server.on('error', (err) => {
  console.error('[Server] HTTP server error:', err);
});

export default app;
