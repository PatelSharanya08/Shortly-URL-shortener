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
};
