import { redis } from '../config/redis';

// Sentinel value we store for a confirmed "not found" — lets us tell
// "cached negative result" apart from "not in cache at all".
const NOT_FOUND_SENTINEL = '__NOT_FOUND__';

const FOUND_TTL_SECONDS = 24 * 60 * 60; // 24h — real links don't change
const NOT_FOUND_TTL_SECONDS = 60; // short, since a code could be created any moment

function cacheKey(shortCode: string): string {
  return `url:${shortCode}`;
}

export type CacheLookupResult =
  | { status: 'hit'; longUrl: string }
  | { status: 'miss-not-found' } // cached negative result
  | { status: 'miss' }; // not in cache at all — caller must check DB

export async function getCachedUrl(shortCode: string): Promise<CacheLookupResult> {
  try {
    const value = await redis.get(cacheKey(shortCode));

    if (value === null) return { status: 'miss' };
    if (value === NOT_FOUND_SENTINEL) return { status: 'miss-not-found' };
    return { status: 'hit', longUrl: value };
  } catch (err) {
    // Redis is unreachable or errored — treat as a cache miss and let
    // the caller fall through to Postgres. Never let a cache failure
    // become a request failure.
    console.error('Redis GET failed, falling back to DB:', (err as Error).message);
    return { status: 'miss' };
  }
}

export async function setCachedUrl(shortCode: string, longUrl: string): Promise<void> {
  try {
    await redis.set(cacheKey(shortCode), longUrl, 'EX', FOUND_TTL_SECONDS);
  } catch (err) {
    console.error('Redis SET failed (non-fatal):', (err as Error).message);
  }
}

export async function setCachedNotFound(shortCode: string): Promise<void> {
  try {
    await redis.set(cacheKey(shortCode), NOT_FOUND_SENTINEL, 'EX', NOT_FOUND_TTL_SECONDS);
  } catch (err) {
    console.error('Redis SET (negative cache) failed (non-fatal):', (err as Error).message);
  }
}