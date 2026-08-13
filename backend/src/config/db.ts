import { Pool } from 'pg';
import { env } from './env';

// A connection pool, not a single connection: Postgres connections are
// expensive to open. The pool keeps a set of them warm and hands them
// out to concurrent requests, which matters a lot once we're under load.
export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: 20, // max concurrent connections in the pool
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  // Handles errors on idle clients (e.g. connection dropped by DB)
  // so one bad connection doesn't crash the whole process.
  console.error('Unexpected Postgres pool error:', err);
});
