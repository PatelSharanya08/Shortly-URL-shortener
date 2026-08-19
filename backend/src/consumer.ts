/**
 * Standalone consumer process — deliberately NOT part of server.ts.
 * This is the point of the exercise: the producer (inside the redirect
 * request path) and this consumer are two completely independent
 * processes. Either can be stopped, restarted, or scaled without the
 * other knowing or caring, as long as both can reach the same broker.
 *
 * Run with: npm run consumer  (in a separate terminal from `npm run dev`)
 */
import { kafka, ensureTopicExists } from './config/kafka';
import { env } from './config/env';
import { clickEventRepository } from './repositories/clickEvent.repository';

interface ClickEvent {
  shortCode: string;
  clickedAt: string;
}

async function main() {
  await ensureTopicExists(env.kafka.clickTopic);

  const consumer = kafka.consumer({ groupId: 'click-analytics-consumer' });

  await consumer.connect();
  await consumer.subscribe({ topic: env.kafka.clickTopic, fromBeginning: true });

  console.log(`📊 Click analytics consumer started, listening on "${env.kafka.clickTopic}"`);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      let event: ClickEvent;
      try {
        event = JSON.parse(message.value.toString());
      } catch (err) {
        console.error('Skipping malformed click event:', message.value.toString());
        return;
      }

      // NOTE: kafkajs auto-commits offsets after eachMessage resolves.
      // This gives us at-least-once delivery: if the process crashes
      // between the DB insert below succeeding and the offset commit
      // happening, this same event gets reprocessed on restart 
      await clickEventRepository.insert(event.shortCode, event.clickedAt);
      console.log(`[CONSUMED] click for ${event.shortCode} at ${event.clickedAt}`);
    },
  });
}

main().catch((err) => {
  console.error('Consumer crashed:', err);
  process.exit(1);
});