import { pool } from '../config/db';
import { UrlRecord } from '../types/url.types';

export class UrlRepository {
  /**
   * Pulls the next value from the Postgres sequence. We fetch this
   * BEFORE inserting because we need the numeric id to base62-encode
   * into the short_code before we can write the row.
   */
  async getNextId(): Promise<number> {
    const result = await pool.query<{ nextval: string }>(
      "SELECT nextval('url_id_seq')"
    );
    return parseInt(result.rows[0].nextval, 10);
  }

  async create(params: {
    id: number;
    shortCode: string;
    longUrl: string;
    expiresAt: string | null;
    idempotencyKey?: string | null;
  }): Promise<UrlRecord> {
    try {
      const result = await pool.query<UrlRecord>(
        `INSERT INTO urls (id, short_code, long_url, expires_at, idempotency_key)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [params.id, params.shortCode, params.longUrl, params.expiresAt, params.idempotencyKey ?? null]
      );
      return result.rows[0];
    } catch (err) {
      // 23505 = unique_violation. If it's the idempotency_key constraint,
      // this means a prior request with the same key already succeeded
      // (e.g. Redis lost the lock/cache and let a duplicate through).
      // Return the original row instead of failing the retry.
      const pgErr = err as { code?: string; constraint?: string };
      if (pgErr.code === '23505' && pgErr.constraint === 'idx_urls_idempotency_key' && params.idempotencyKey) {
        const existing = await this.findByIdempotencyKey(params.idempotencyKey);
        if (existing) return existing;
      }
      throw err;
    }
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<UrlRecord | null> {
    const result = await pool.query<UrlRecord>(
      'SELECT * FROM urls WHERE idempotency_key = $1',
      [idempotencyKey]
    );
    return result.rows[0] ?? null;
  }

  async findByShortCode(shortCode: string): Promise<UrlRecord | null> {
    const result = await pool.query<UrlRecord>(
      'SELECT * FROM urls WHERE short_code = $1',
      [shortCode]
    );
    return result.rows[0] ?? null;
  }
}

export const urlRepository = new UrlRepository();