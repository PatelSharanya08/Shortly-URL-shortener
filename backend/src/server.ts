import { createApp } from './app';
import { env } from './config/env';
import { ensureTopicExists } from './config/kafka';

const app = createApp();

// Best-effort: don't let a Kafka outage prevent the server from
// starting at all — the redirect path already degrades gracefully
// without it (see url.service.ts).
ensureTopicExists(env.kafka.clickTopic).catch((err) => {
  console.error('Could not ensure Kafka topic exists (non-fatal):', (err as Error).message);
});

app.listen(env.port, () => {
  console.log(`🚀 Server running on http://localhost:${env.port}`);
});