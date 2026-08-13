-- The sequence drives our counter-based short code generation.
-- Starting at 62^3 (238328) instead of 1 gives us a guaranteed
-- minimum 3-character code from day one instead of starting at "1".
CREATE SEQUENCE IF NOT EXISTS url_id_seq START WITH 238328;

CREATE TABLE IF NOT EXISTS urls (
  id BIGINT PRIMARY KEY DEFAULT nextval('url_id_seq'),
  short_code VARCHAR(12) UNIQUE NOT NULL,
  long_url TEXT NOT NULL,
  user_id UUID,                          -- nullable for now, no auth yet
  idempotency_key UUID,                  -- used in Phase 2
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Fast lookups on redirect (this is the hottest read path in the whole system)
CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls (short_code);

-- Enforces one successful create per idempotency key
CREATE UNIQUE INDEX IF NOT EXISTS idx_urls_idempotency_key
  ON urls (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
