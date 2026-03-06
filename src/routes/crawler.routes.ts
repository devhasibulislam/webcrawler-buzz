import { Router } from 'express';
import { crawlerController } from '../controllers/crawler.controller';

const router = Router();

/**
 * @swagger
 * /api/crawl:
 *   post:
 *     summary: Start a new crawl
 *     description: Validates URL, creates a job, pushes to BullMQ, returns tracking URL immediately.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *                 example: "https://amplifying.ai"
 *     responses:
 *       201:
 *         description: Crawl started — new domain
 *       200:
 *         description: Domain already crawled — prompt user
 *       400:
 *         description: Invalid URL
 */
router.post('/', crawlerController.startCrawl);

/**
 * @swagger
 * /api/crawl/decide:
 *   post:
 *     summary: Decide for duplicate domain
 *     description: Choose to re-crawl or use existing results.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [domain, action]
 *             properties:
 *               domain:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [re-crawl, use-existing]
 *     responses:
 *       200:
 *         description: Using existing results
 *       201:
 *         description: Re-crawl started
 */
router.post('/decide', crawlerController.decide);

/**
 * @swagger
 * /api/crawl/{job_id}/notify:
 *   post:
 *     summary: Register email for notification
 *     parameters:
 *       - in: path
 *         name: job_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email registered
 */
router.post('/:job_id/notify', crawlerController.notify);

/**
 * @swagger
 * /api/crawl/{job_id}/progress:
 *   get:
 *     summary: Poll crawl progress
 *     parameters:
 *       - in: path
 *         name: job_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Current progress
 */
router.get('/:job_id/progress', crawlerController.getProgress);

/**
 * @swagger
 * /api/crawl/{job_id}/export:
 *   post:
 *     summary: Request a CSV export (sends download link via email)
 *     parameters:
 *       - in: path
 *         name: job_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       202:
 *         description: Export started
 *       200:
 *         description: Export already in progress
 */
router.post('/:job_id/export', crawlerController.requestExport);

/**
 * @swagger
 * /api/crawl/{job_id}/export/status:
 *   get:
 *     summary: Check export status (for button state)
 *     parameters:
 *       - in: path
 *         name: job_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Export status
 */
router.get('/:job_id/export/status', crawlerController.getExportStatus);

/**
 * @swagger
 * /api/crawl/{job_id}/download/{export_id}:
 *   get:
 *     summary: Download the exported CSV file
 *     parameters:
 *       - in: path
 *         name: job_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: export_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CSV file download
 *       404:
 *         description: Export not found
 *       410:
 *         description: Link expired
 */
router.get('/:job_id/download/:export_id', crawlerController.downloadExport);

/**
 * @swagger
 * /api/crawl/{job_id}:
 *   get:
 *     summary: Get paginated crawl results
 *     parameters:
 *       - in: path
 *         name: job_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           enum: [50, 100, 500, 1000]
 *           default: 50
 *     responses:
 *       200:
 *         description: Paginated results with crawled pages
 */
router.get('/:job_id', crawlerController.getResults);

export default router;
