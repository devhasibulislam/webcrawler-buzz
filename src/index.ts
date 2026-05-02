import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import compression from 'compression';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import { setupSecurity } from './middleware/security.middleware';
import { swaggerAuth } from './middleware/swagger-auth.middleware';
import { swaggerSpec } from './swagger/swagger';
import crawlerRoutes from './routes/crawler.routes';
import operationalRoutes from './routes/operational.routes';
import viewRoutes from './routes/view.routes';

// Import workers to start processing jobs
import './queue/crawler.worker';
import './queue/export.worker';

import { startExportCleanupCron, startJobCleanupCron } from './cron/export-cleanup';

const app = express();
const PORT = parseInt(process.env.PORT || '5005', 10);

// Compression middleware (gzip/brotli)
app.use(compression());

// Security middleware
setupSecurity(app);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Swagger docs — protected by Basic Auth
app.use('/api-docs', swaggerAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use('/api/crawl', crawlerRoutes);
app.use('/api', operationalRoutes);

// View routes (HTML pages)
app.use('/', viewRoutes);

// Global error handlers — keep the server alive
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
