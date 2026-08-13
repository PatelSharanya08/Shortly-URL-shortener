# URL Shortener — Phase 1

## Run locally

1. Copy `.env.example` to `.env`
2. Start Postgres: `docker-compose up -d`
   (this auto-runs `db/schema.sql` on first boot)
3. Install deps: `npm install`
4. Start dev server: `npm run dev`
5. Test:
   ```
   curl -X POST http://localhost:3000/api/v1/shorten \
     -H "Content-Type: application/json" \
     -d '{"longUrl":"https://example.com"}'

   curl -L http://localhost:3000/<shortCode>
   ```

## What's implemented
- Counter-based short code generation (Postgres sequence + base62 encoding)
- POST /api/v1/shorten, GET /:shortCode
- Zod request validation
- Centralized error handling
- Layered architecture: routes -> controllers -> services -> repositories
