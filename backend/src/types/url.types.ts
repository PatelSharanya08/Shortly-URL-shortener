export interface UrlRecord {
  id: string; // bigint comes back as string from pg to avoid precision loss
  short_code: string;
  long_url: string;
  user_id: string | null;
  idempotency_key: string | null;
  created_at: Date;
  expires_at: Date | null;
}

export interface CreateShortUrlInput {
  longUrl: string;
  expiresAt?: string;
}

export interface ShortUrlResponse {
  shortCode: string;
  shortUrl: string;
  longUrl: string;
  createdAt: string;
  expiresAt: string | null;
}
