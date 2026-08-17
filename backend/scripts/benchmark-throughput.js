const autocannon = require('autocannon');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function run() {
  // Create one short URL up front, then hammer its redirect endpoint.
  // In steady state, this endpoint is almost always a cache hit (24h TTL),
  // so this benchmark reflects realistic warm-cache production throughput.
  const createRes = await fetch(`${BASE_URL}/api/v1/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ longUrl: 'https://example.com/throughput-test' }),
  });
  const { shortCode } = await createRes.json();
  console.log(`Benchmarking redirect throughput for /${shortCode}\n`);

  // Warm the cache
  await fetch(`${BASE_URL}/${shortCode}`, { redirect: 'manual' });

  const result = await autocannon({
    url: `${BASE_URL}/${shortCode}`,
    connections: 50,
    duration: 10,
  });

  console.log(autocannon.printResult(result));
  console.log('\nStatus code breakdown:', result.statusCodeStats);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});