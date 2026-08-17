const autocannon = require('autocannon');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function run() {
  console.log('Firing burst traffic at POST /api/v1/shorten (bucket capacity=5, refill=1/sec)\n');

  const result = await autocannon({
    url: `${BASE_URL}/api/v1/shorten`,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ longUrl: 'https://example.com/rate-limit-test' }),
    connections: 20,
    duration: 5,
  });

  console.log(autocannon.printResult(result));

  const total = result['2xx'] + result.non2xx;
  const blocked = result.non2xx;
  const blockedPct = ((blocked / total) * 100).toFixed(1);

  console.log(`\n=== RATE LIMIT ENFORCEMENT ===`);
  console.log(`Total requests: ${total}`);
  console.log(`Allowed (2xx): ${result['2xx']}`);
  console.log(`Blocked (429): ${blocked}`);
  console.log(`Blocked percentage: ${blockedPct}%`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});