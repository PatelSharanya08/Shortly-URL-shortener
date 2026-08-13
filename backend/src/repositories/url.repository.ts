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
  }): Promise<UrlRecord> {
    const result = await pool.query<UrlRecord>(
      `INSERT INTO urls (id, short_code, long_url, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [params.id, params.shortCode, params.longUrl, params.expiresAt]
    );
    return result.rows[0];
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
