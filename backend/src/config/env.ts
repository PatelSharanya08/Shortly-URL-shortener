import dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  port: parseInt(required('PORT'), 10),
  nodeEnv: required('NODE_ENV'),
  baseUrl: required('BASE_URL'),
  corsOrigin: required('CORS_ORIGIN'),
  db: {
    host: required('DB_HOST'),
    port: parseInt(required('DB_PORT'), 10),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
  },
  redis: {
    host: required('REDIS_HOST'),
    port: parseInt(required('REDIS_PORT'), 10),
  },
  rateLimit: {
    shortenCapacity: parseInt(required('RATE_LIMIT_SHORTEN_CAPACITY'), 10),
    shortenRefillPerSecond: parseInt(required('RATE_LIMIT_SHORTEN_REFILL'), 10),
    redirectCapacity: parseInt(required('RATE_LIMIT_REDIRECT_CAPACITY'), 10),
    redirectRefillPerSecond: parseInt(required('RATE_LIMIT_REDIRECT_REFILL'), 10),
  },
  // Uniquely identifies this app instance for Snowflake ID generation.
  // In production this would be derived from the deployment platform
  // (ECS task ordinal, K8s pod index, etc.) rather than hardcoded.
  workerId: parseInt(required('WORKER_ID'), 10),
  kafka: {
    brokers: required('KAFKA_BROKERS').split(','),
    clientId: required('KAFKA_CLIENT_ID'),
    clickTopic: required('KAFKA_CLICK_TOPIC'),
  },
};
