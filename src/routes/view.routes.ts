import { Router } from 'express';
import { viewController } from '../controllers/view.controller';

const router = Router();

router.get('/', viewController.home);
router.get('/results', viewController.results);
router.get('/about', viewController.about);
router.get('/api-docs-public', viewController.apiDocsPublic);
router.get('/blogs', viewController.blogList);
router.get('/blogs/:slug', viewController.blogPost);
router.get('/privacy-policy', viewController.privacyPolicy);
router.get('/terms-of-service', viewController.termsOfService);
router.get('/cookie-policy', viewController.cookiePolicy);

// SEO / LLM files — explicit routes with correct Content-Type headers
router.get('/sitemap.xml', viewController.sitemapXml);
router.get('/llms.txt', viewController.llmsTxt);
router.get('/llms-full.txt', viewController.llmsFullTxt);

// 404 catch-all (must be last)
router.use(viewController.notFound);

export default router;
