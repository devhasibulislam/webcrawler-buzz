import { Router } from 'express';
import { viewController } from '../controllers/view.controller';

const router = Router();

router.get('/', viewController.home);
router.get('/results', viewController.results);
router.get('/privacy-policy', viewController.privacyPolicy);
router.get('/terms-of-service', viewController.termsOfService);
router.get('/cookie-policy', viewController.cookiePolicy);

export default router;
