import { urlRepository } from '../repositories/url.repository';
import { getCachedUrl, setCachedUrl, setCachedNotFound } from '../repositories/url.cache';
import { encodeBase62 } from '../utils/base62';
import { env } from '../config/env';
import { CreateShortUrlInput, ShortUrlResponse } from '../types/url.types';

export class UrlService {
  async createShortUrl(input: CreateShortUrlInput): Promise<ShortUrlResponse> {
    // 1. Get a unique id from the Postgres sequence — this is the
    //    single source of truth for uniqueness. No collision check needed.
    const id = await urlRepository.getNextId();

    // 2. Deterministically derive the short code from that id.
    const shortCode = encodeBase62(id);

    // 3. Persist the record.
    const record = await urlRepository.create({
      id,
      shortCode,
      longUrl: input.longUrl,
      expiresAt: input.expiresAt ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
    });

    return {
      shortCode: record.short_code,
      shortUrl: `${env.baseUrl}/${record.short_code}`,
      longUrl: record.long_url,
      createdAt: record.created_at.toISOString(),
      expiresAt: record.expires_at ? record.expires_at.toISOString() : null,
    };
  }

  async resolveShortCode(shortCode: string): Promise<{ longUrl: string; source: 'cache' | 'db' } | null> {
    // 1. Check the cache first.
    const cached = await getCachedUrl(shortCode);

    if (cached.status === 'hit') {
      console.log(`[CACHE HIT] ${shortCode}`);
      return { longUrl: cached.longUrl, source: 'cache' };
    }
    if (cached.status === 'miss-not-found') {
      console.log(`[CACHE HIT - negative] ${shortCode}`);
      return null; // we've already confirmed this code doesn't exist recently
    }

    // 2. Cache miss — fall back to Postgres, the source of truth.
    console.log(`[CACHE MISS] ${shortCode} -> querying Postgres`);
    const record = await urlRepository.findByShortCode(shortCode);

    if (!record) {
      await setCachedNotFound(shortCode);
      return null;
    }

    if (record.expires_at && record.expires_at < new Date()) {
      await setCachedNotFound(shortCode); // treat expired links as not found
      return null;
    }

    // 3. Populate the cache so the next request is a hit.
    await setCachedUrl(shortCode, record.long_url);

    return { longUrl: record.long_url, source: 'db' };
  }
}

export const urlService = new UrlService();