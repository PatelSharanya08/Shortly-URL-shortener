import { Router } from 'express';
import { createShortUrl, redirectShortUrl } from '../controllers/url.controller';
import { validateBody, createShortUrlSchema } from '../middleware/validate';
import { rateLimiter } from '../middleware/rateLimit';
import { env } from '../config/env';

const router = Router();

// Writes are expensive (DB insert) and more attractive to abuse
// (link-spam bots) — keep this tight by default.
const shortenRateLimit = rateLimiter({
  keyPrefix: 'shorten',
  capacity: env.rateLimit.shortenCapacity,
  refillPerSecond: env.rateLimit.shortenRefillPerSecond,
});

// Redirects are cheap once cached and need to stay responsive for
// legitimate high-traffic links — much more headroom by default.
const redirectRateLimit = rateLimiter({
  keyPrefix: 'redirect',
  capacity: env.rateLimit.redirectCapacity,
  refillPerSecond: env.rateLimit.redirectRefillPerSecond,
});

router.post('/api/v1/shorten', shortenRateLimit, validateBody(createShortUrlSchema), createShortUrl);
router.get('/:shortCode', redirectRateLimit, redirectShortUrl);

export default router;