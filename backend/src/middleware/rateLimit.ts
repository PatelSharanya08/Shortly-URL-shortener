import { Request, Response, NextFunction } from 'express';
import { checkTokenBucket } from '../utils/tokenBucket';

interface RateLimitOptions {
  keyPrefix: string; // distinguishes buckets per-route (e.g. "shorten" vs "redirect")
  capacity: number; // max burst size
  refillPerSecond: number; // steady-state sustained rate
}

/**
 * Per-IP token bucket rate limiter.
 *
 * Fail-open by design: if Redis is unreachable, we let the request
 * through rather than blocking all traffic. Rate limiting protects
 * against abuse; it isn't a correctness guarantee like idempotency,
 * so a Redis outage should degrade protection, not take the API down.
 */
export function rateLimiter(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip ?? 'unknown';
    const key = `ratelimit:${options.keyPrefix}:${identifier}`;

    try {
      const { allowed, remaining } = await checkTokenBucket(
        key,
        options.capacity,
        options.refillPerSecond
      );

      res.setHeader('X-RateLimit-Limit', options.capacity);
      res.setHeader('X-RateLimit-Remaining', remaining);

      if (!allowed) {
        res.setHeader('Retry-After', Math.ceil(1 / options.refillPerSecond));
        return res.status(429).json({
          error: 'TooManyRequests',
          message: 'Rate limit exceeded. Please slow down and try again shortly.',
        });
      }

      next();
    } catch (err) {
      console.error('Rate limiter Redis error, failing open:', (err as Error).message);
      next();
    }
  };
}