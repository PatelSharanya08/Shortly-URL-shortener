import { urlRepository } from '../repositories/url.repository';
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
    });

    return {
      shortCode: record.short_code,
      shortUrl: `${env.baseUrl}/${record.short_code}`,
      longUrl: record.long_url,
      createdAt: record.created_at.toISOString(),
      expiresAt: record.expires_at ? record.expires_at.toISOString() : null,
    };
  }

  async resolveShortCode(shortCode: string): Promise<string | null> {
    const record = await urlRepository.findByShortCode(shortCode);

    if (!record) return null;

    if (record.expires_at && record.expires_at < new Date()) {
      return null; // treat expired links as not found
    }

    return record.long_url;
  }
}

export const urlService = new UrlService();
