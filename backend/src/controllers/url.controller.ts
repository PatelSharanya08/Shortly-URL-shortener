import { Request, Response, NextFunction } from 'express';
import { urlService } from '../services/url.service';

export async function createShortUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await urlService.createShortUrl(req.body);
    res.status(201).json(result);
  } catch (err) {
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
