import { redis } from '../config/redis';

const LOCK_TTL_SECONDS = 30; // generous ceiling for how long a request should take to process
const RESULT_TTL_SECONDS = 24 * 60 * 60; // how long a completed response can be replayed

const IN_PROGRESS = '__IN_PROGRESS__';

export class IdempotencyConflictError extends Error {
  constructor() {
    super('A request with this idempotency key is already being processed. Please retry shortly.');
    this.name = 'IdempotencyConflictError';
  }
}

function redisKey(idempotencyKey: string): string {
  return `idempotency:${idempotencyKey}`;
}

/**
 * Wraps a handler with idempotency-key protection.
 *
 * - First request with a given key: acquires a Redis lock (SET NX),
 *   runs the handler, caches the result for future replays.
 * - Concurrent duplicate (same key, still in flight): throws
 *   IdempotencyConflictError instead of racing into the DB.
 * - Retry after completion: returns the cached result, replayed = true,
 *   without re-running the handler at all.
 * - If Redis itself is unreachable: fails OPEN — runs the handler
 *   directly, relying on the DB unique constraint as the backstop.
 *   A Redis outage should degrade protection, not block all writes.
 */
export async function withIdempotency<T>(
  idempotencyKey: string,
  handler: () => Promise<T>
): Promise<{ result: T; replayed: boolean }> {
  const key = redisKey(idempotencyKey);

  let acquired: string | null;
  try {
    acquired = await redis.set(key, IN_PROGRESS, 'EX', LOCK_TTL_SECONDS, 'NX');
  } catch (err) {
    console.error('Redis unavailable for idempotency check, proceeding without lock:', (err as Error).message);
    const result = await handler();
    return { result, replayed: false };
  }

  if (acquired === 'OK') {
    try {
      const result = await handler();
      try {
        await redis.set(key, JSON.stringify(result), 'EX', RESULT_TTL_SECONDS);
      } catch (err) {
        console.error('Failed to cache idempotent result (non-fatal):', (err as Error).message);
      }
      return { result, replayed: false };
    } catch (err) {
      // Release the lock so a genuine retry after a failure can go through.
      await redis.del(key).catch(() => {});
      throw err;
    }
  }

  // Someone else holds (or held) this key.
  const existing = await redis.get(key).catch(() => null);

  if (existing === null || existing === IN_PROGRESS) {
    throw new IdempotencyConflictError();
  }

  return { result: JSON.parse(existing) as T, replayed: true };
}