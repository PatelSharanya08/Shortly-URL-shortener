import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  // Don't let the app crash trying to connect at startup — retry with
  // backoff instead, and let individual commands fail gracefully if
  // Redis is genuinely unreachable (handled at the call site).
  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  },
  maxRetriesPerRequest: 1,
  lazyConnect: false,
});

redis.on('error', (err) => {
  // Log but never throw here — Redis being down should degrade
  // performance, not crash the process.
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('Redis connected');
});