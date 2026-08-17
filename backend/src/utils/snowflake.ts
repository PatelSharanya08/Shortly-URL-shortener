/**
 * Snowflake-style ID generator (Twitter's approach).
 *
 * A 63-bit integer laid out as:
 *   [ 41 bits: timestamp (ms since custom epoch) ]
 *   [ 10 bits: worker ID (0-1023)                ]
 *   [ 12 bits: per-millisecond sequence (0-4095) ]
 *
 * Generated entirely in-process — no network call, no shared state
 * between instances. Uniqueness across multiple running app servers
 * is guaranteed purely by each one having a distinct worker ID; the
 * timestamp+sequence portion guarantees uniqueness *within* a worker.
 *
 * Trade-off vs a single DB sequence: we've traded "one global
 * bottleneck every server depends on" for "every server must have a
 * genuinely unique worker ID." In production, the worker ID would come
 * from the deployment platform (e.g. an ECS task's ordinal, a
 * Kubernetes StatefulSet pod index, or an ID handed out by a
 * coordination service like Zookeeper at startup) rather than being
 * hardcoded.
 */

const WORKER_ID_BITS = 10n;
const SEQUENCE_BITS = 12n;

const MAX_WORKER_ID = (1n << WORKER_ID_BITS) - 1n; // 1023
const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n; // 4095

// Custom epoch: Jan 1, 2024 UTC. Using a recent epoch instead of the
// Unix epoch (1970) means the 41-bit timestamp field doesn't waste
// decades of range on dates before this project existed — it buys us
// about 69 years of headroom from this epoch instead of from 1970.
const EPOCH = 1704067200000n;

export class SnowflakeGenerator {
  private readonly workerId: bigint;
  private sequence = 0n;
  private lastTimestamp = -1n;

  constructor(workerId: number) {
    if (workerId < 0 || BigInt(workerId) > MAX_WORKER_ID) {
      throw new Error(`workerId must be between 0 and ${MAX_WORKER_ID}`);
    }
    this.workerId = BigInt(workerId);
  }

  nextId(): bigint {
    let timestamp = this.currentTimestamp();

    if (timestamp < this.lastTimestamp) {
      // System clock moved backwards (NTP adjustment, VM pause, etc.).
      // Generating an ID here could collide with one already issued —
      // safer to fail loudly than to silently risk a duplicate.
      throw new Error('Clock moved backwards — refusing to generate ID');
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & MAX_SEQUENCE;
      if (this.sequence === 0n) {
        // Exhausted all 4096 IDs for this millisecond — busy-wait for the next one.
        timestamp = this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    return (
      ((timestamp - EPOCH) << (WORKER_ID_BITS + SEQUENCE_BITS)) |
      (this.workerId << SEQUENCE_BITS) |
      this.sequence
    );
  }

  private currentTimestamp(): bigint {
    return BigInt(Date.now());
  }

  private waitNextMillis(last: bigint): bigint {
    let ts = this.currentTimestamp();
    while (ts <= last) {
      ts = this.currentTimestamp();
    }
    return ts;
  }
}