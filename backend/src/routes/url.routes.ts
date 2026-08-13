import { Router } from 'express';
import { createShortUrl, redirectShortUrl } from '../controllers/url.controller';
import { validateBody, createShortUrlSchema } from '../middleware/validate';

const router = Router();

router.post('/api/v1/shorten', validateBody(createShortUrlSchema), createShortUrl);
router.get('/:shortCode', redirectShortUrl);

export default router;
