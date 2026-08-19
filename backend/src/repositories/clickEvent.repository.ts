import { pool } from '../config/db';

export class ClickEventRepository {
  async insert(shortCode: string, clickedAt: string): Promise<void> {
    await pool.query('INSERT INTO click_events (short_code, clicked_at) VALUES ($1, $2)', [
      shortCode,
      clickedAt,
    ]);
  }

  async countForShortCode(shortCode: string): Promise<number> {
    const result = await pool.query<{ count: string }>(
      'SELECT COUNT(*) FROM click_events WHERE short_code = $1',
      [shortCode]
    );
    return parseInt(result.rows[0].count, 10);
  }
}

export const clickEventRepository = new ClickEventRepository();