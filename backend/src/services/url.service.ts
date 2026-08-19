import { urlRepository } from '../repositories/url.repository';
import { clickEventRepository } from '../repositories/clickEvent.repository';
import { getCachedUrl, setCachedUrl, setCachedNotFound } from '../repositories/url.cache';
import { encodeBase62 } from '../utils/base62';
import { SnowflakeGenerator } from '../utils/snowflake';
import { publishClickEvent } from '../config/kafka';
import { env } from '../config/env';
import { CreateShortUrlInput, ShortUrlResponse } from '../types/url.types';

// One generator per running process, seeded with this instance's worker ID.
const idGenerator = new SnowflakeGenerator(env.workerId);

export class UrlService {
  async createShortUrl(input: CreateShortUrlInput): Promise<ShortUrlResponse> {
    // 1. Generate a unique id in-process — no network call, no DB dependency.
    //    Uniqueness comes from this worker's ID + timestamp + sequence,
    //    not from asking a central authority "what's the next number?"
    const id = idGenerator.nextId();

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
      this.recordClick(shortCode);
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

    this.recordClick(shortCode);

    return { longUrl: record.long_url, source: 'db' };
  }

  async getStats(shortCode: string): Promise<{ shortCode: string; totalClicks: number; createdAt: string } | null> {
    const record = await urlRepository.findByShortCode(shortCode);
    if (!record) return null;

    const totalClicks = await clickEventRepository.countForShortCode(shortCode);

    return {
      shortCode: record.short_code,
      totalClicks,
      createdAt: record.created_at.toISOString(),
    };
  }

  /**
   * Fire-and-forget: publishes a click event to Kafka without blocking
   * the redirect response. Deliberately NOT awaited — analytics must
   * never slow down or break the actual redirect, which is the real
   * product. If Kafka is unreachable, we log and move on; a lost click
   * event is an acceptable trade-off, unlike a lost redirect.
   */
  private recordClick(shortCode: string): void {
    publishClickEvent(shortCode).catch((err) => {
      console.error(`Failed to publish click event for ${shortCode} (non-fatal):`, (err as Error).message);
    });
  }
}

export const urlService = new UrlService();