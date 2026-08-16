import { Request, Response, NextFunction } from 'express';
import { urlService } from '../services/url.service';
import { withIdempotency, IdempotencyConflictError } from '../utils/idempotency';

export async function createShortUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const idempotencyKey = req.header('Idempotency-Key');

    if (!idempotencyKey) {
      // No key provided — proceed without idempotency protection.
      const result = await urlService.createShortUrl(req.body);
      return res.status(201).json(result);
    }

    const { result, replayed } = await withIdempotency(idempotencyKey, () =>
      urlService.createShortUrl({ ...req.body, idempotencyKey })
    );

    // 200 on replay (nothing new was created) vs 201 on first creation.
    res.status(replayed ? 200 : 201).json(result);
  } catch (err) {
    if (err instanceof IdempotencyConflictError) {
      return res.status(409).json({ error: 'Conflict', message: err.message });
    }
    next(err);
  }
}

export async function redirectShortUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const shortCode = String(req.params.shortCode);
    const resolved = await urlService.resolveShortCode(shortCode);

    if (!resolved) {
      return res.status(404).json({ error: 'NotFound', message: 'Short URL not found or expired' });
    }

    res.setHeader('X-Cache', resolved.source === 'cache' ? 'HIT' : 'MISS');
    res.redirect(302, resolved.longUrl);
  } catch (err) {
    next(err);
  }
}