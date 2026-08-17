import { SnowflakeGenerator } from '../src/utils/snowflake';
import { encodeBase62, decodeBase62 } from '../src/utils/base62';

function test1_singleWorkerUniqueness() {
  console.log('=== Test 1: Single worker, 50,000 IDs — all unique, all increasing ===');
  const gen = new SnowflakeGenerator(0);
  const ids = new Set<bigint>();
  let prev = -1n;
  let allIncreasing = true;

  for (let i = 0; i < 50000; i++) {
    const id = gen.nextId();
    if (ids.has(id)) {
      console.log(`FAIL: duplicate ID generated: ${id}`);
      return;
    }
    if (id <= prev) allIncreasing = false;
    ids.add(id);
    prev = id;
  }

  console.log(`Generated: ${ids.size} IDs`);
  console.log(`All unique: ${ids.size === 50000 ? 'PASS' : 'FAIL'}`);
  console.log(`Monotonically increasing: ${allIncreasing ? 'PASS' : 'FAIL'}`);
}

function test2_multiWorkerNoCollisions() {
  console.log('\n=== Test 2: Two workers generating simultaneously — zero cross-worker collisions ===');
  const workerA = new SnowflakeGenerator(0);
  const workerB = new SnowflakeGenerator(1);

  const allIds = new Set<bigint>();
  let collisions = 0;

  for (let i = 0; i < 10000; i++) {
    const idA = workerA.nextId();
    const idB = workerB.nextId();

    if (allIds.has(idA) || allIds.has(idB)) collisions++;
    allIds.add(idA);
    allIds.add(idB);
  }

  console.log(`Total IDs generated: ${allIds.size} (expected 20000)`);
  console.log(`Cross-worker collisions: ${collisions}`);
  console.log(`Result: ${collisions === 0 && allIds.size === 20000 ? 'PASS' : 'FAIL'}`);
}

function test3_base62RoundTrip() {
  console.log('\n=== Test 3: Snowflake ID -> base62 -> decode round trip ===');
  const gen = new SnowflakeGenerator(5);
  let allPass = true;

  for (let i = 0; i < 5; i++) {
    const id = gen.nextId();
    const code = encodeBase62(id);
    const decoded = decodeBase62(code);
    const pass = decoded === id;
    if (!pass) allPass = false;
    console.log(`id=${id} -> code="${code}" (${code.length} chars) -> decoded=${decoded} [${pass ? 'PASS' : 'FAIL'}]`);
  }

  console.log(`Overall: ${allPass ? 'PASS' : 'FAIL'}`);
}

function test4_workerIdBoundaries() {
  console.log('\n=== Test 4: Worker ID validation ===');
  try {
    new SnowflakeGenerator(1024); // out of range, should throw
    console.log('FAIL: should have thrown for workerId=1024');
  } catch {
    console.log('PASS: correctly rejected workerId=1024 (max is 1023)');
  }

  try {
    new SnowflakeGenerator(1023); // max valid, should succeed
    console.log('PASS: accepted workerId=1023 (max valid)');
  } catch {
    console.log('FAIL: should have accepted workerId=1023');
  }
}

test1_singleWorkerUniqueness();
test2_multiWorkerNoCollisions();
test3_base62RoundTrip();
test4_workerIdBoundaries();