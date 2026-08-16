import { redis } from '../config/redis';

/**
 * Token bucket, implemented as a Lua script so the read-modify-write
 * cycle (check tokens, refill, decrement) happens atomically inside
 * Redis. Doing this as separate GET/SET round-trips from Node would
 * be a race condition: two concurrent requests could both read
 * "1 token left" before either writes back, and both would be allowed
 * through — exactly the kind of bug rate limiting exists to prevent.
 *
 * KEYS[1] = bucket key (e.g. "ratelimit:shorten:1.2.3.4")
 * ARGV[1] = capacity        (max tokens the bucket can hold)
 * ARGV[2] = refillPerSecond (tokens added per second)
 * ARGV[3] = now              (current time in ms, passed in from Node
 *                              so all logic is deterministic and testable)
 *
 * Returns: { allowed (1/0), remainingTokens }
 */
const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillPerSecond = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  lastRefill = now
end

-- Refill based on elapsed time since last request.
local elapsedSeconds = math.max(0, (now - lastRefill) / 1000)
local refill = elapsedSeconds * refillPerSecond
tokens = math.min(capacity, tokens + refill)

local allowed = 0
if tokens >= 1 then
  allowed = 1
  tokens = tokens - 1
end

redis.call('HSET', key, 'tokens', tokens, 'lastRefill', now)

-- Auto-expire idle buckets so we don't leak memory for one-off clients.
-- TTL is generous: time to fully refill from empty, plus a margin.

local ttlSeconds = math.ceil(capacity / refillPerSecond) + 10
redis.call('EXPIRE', key, ttlSeconds)

return { allowed, tostring(tokens) }
`;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export async function checkTokenBucket(
  key: string,
  capacity: number,
  refillPerSecond: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const [allowed, remaining] = (await redis.eval(
    TOKEN_BUCKET_SCRIPT,
    1,
    key,
    capacity,
    refillPerSecond,
    now
  )) as [number, string];

  return {
    allowed: allowed === 1,
    remaining: Math.floor(parseFloat(remaining)),
  };
}