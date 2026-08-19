import express from 'express';
import cors from 'cors';
import urlRoutes from './routes/url.routes';
import { errorHandler } from './middleware/errorHandler';
import { env } from './config/env';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin,
      exposedHeaders: ['X-Cache', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
    })
  );
  app.use(express.json());

  // Registered before urlRoutes: /:shortCode is a greedy dynamic segment
  // and would otherwise match "/health" as a short code lookup.
  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.use(urlRoutes);

  // Must be registered last — Express identifies error middleware
  // by its 4-argument signature, and order matters for the catch-all.
  app.use(errorHandler);

  return app;
}