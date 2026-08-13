import dotenv from 'dotenv';

dotenv.config();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  port: parseInt(required('PORT', '3000'), 10),
  nodeEnv: required('NODE_ENV', 'development'),
  baseUrl: required('BASE_URL', 'http://localhost:3000'),
  db: {
    host: required('DB_HOST', 'localhost'),
    port: parseInt(required('DB_PORT', '5432'), 10),
    user: required('DB_USER', 'postgres'),
    password: required('DB_PASSWORD', 'postgres'),
    database: required('DB_NAME', 'url_shortener'),
  },
};
