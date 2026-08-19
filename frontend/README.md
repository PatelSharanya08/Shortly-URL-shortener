# shortly — frontend

React + TypeScript + Vite frontend for the distributed URL shortener.

## Run locally

1. Make sure the backend is running first (`../backend`, `npm run dev`, plus `docker-compose up -d` for Postgres/Redis/Kafka).
2. Copy `.env.example` to `.env` (defaults already point at `http://localhost:3000`).
3. Install dependencies:
   ```
   npm install
   ```
4. Start the dev server:
   ```
   npm run dev
   ```
5. Open http://localhost:5173

## Design

"Dispatch console" concept — every shortened link renders as a perforated ticket stub (like a baggage claim tag), with a decorative barcode pattern generated from its own short code. See the design tokens at the top of `src/index.css`.

## Scope notes

- No accounts/auth — "recent links" are stored per-browser in `localStorage`, not fetched from a server-side list (the backend has no such endpoint by design; see backend README for why).
- Every shorten request sends a fresh `Idempotency-Key` (see `src/api/client.ts`) — a real, working use of the backend's idempotency feature, not just a demo of it.
- Handles backend `429` (rate limited) and `400` (validation) responses with real user-facing messages, not generic errors.