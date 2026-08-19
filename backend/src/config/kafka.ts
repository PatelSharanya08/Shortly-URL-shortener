import { Kafka, Producer, logLevel } from 'kafkajs';
import { env } from './env';

export const kafka = new Kafka({
  clientId: env.kafka.clientId,
  brokers: env.kafka.brokers,
  logLevel: logLevel.ERROR, // kafkajs is chatty by default — keep our logs readable
  retry: {
    retries: 5, // give a freshly-started broker time to propagate metadata
    initialRetryTime: 300,
  },
});

let producer: Producer | null = null;
let producerConnecting: Promise<void> | null = null;

/**
 * Explicitly creates the topic if it doesn't exist yet, instead of
 * relying on broker auto-creation.
 */
export async function ensureTopicExists(topic: string, numPartitions = 3): Promise<void> {
  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.createTopics({
      topics: [{ topic, numPartitions, replicationFactor: 1 }],
      waitForLeaders: true,
    });
  } finally {
    await admin.disconnect();
  }
}

/**
 * Lazily connects the producer on first use rather than at process
 * startup. This matters because we don't want the whole app to fail
 * to boot just because Kafka isn't reachable yet — the redirect path
 * should degrade gracefully (see url.service.ts), not crash the server.
 */
async function getProducer(): Promise<Producer> {
  if (producer) return producer;

  if (!producerConnecting) {
    const p = kafka.producer();
    producerConnecting = p
      .connect()
      .then(() => {
        producer = p;
      })
      .catch((err) => {
        // Reset so the NEXT click event attempts a fresh connection,
        // instead of every future call immediately re-rejecting against
        // this same failed attempt forever.
        producerConnecting = null;
        throw err;
      });
  }

  await producerConnecting;
  return producer!;
}

export async function publishClickEvent(shortCode: string): Promise<void> {
  const p = await getProducer();
  await p.send({
    topic: env.kafka.clickTopic,
    messages: [
      {
        key: shortCode, // same key -> same partition -> preserves per-link ordering
        value: JSON.stringify({ shortCode, clickedAt: new Date().toISOString() }),
      },
    ],
  });
}