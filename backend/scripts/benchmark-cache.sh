#!/bin/bash

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
TRIALS=20

echo "Creating a fresh short URL to benchmark..."

RESP=$(curl -s -X POST "$BASE_URL/api/v1/shorten" \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"https://example.com/benchmark-target"}')

CODE=$(echo "$RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).shortCode))")

echo "shortCode = $CODE"
echo ""

echo "=== Measuring CACHE MISS latency ($TRIALS trials, flushing that key before each) ==="

MISS_TOTAL=0

for i in $(seq 1 $TRIALS); do
  redis-cli DEL "url:$CODE" > /dev/null

  TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/$CODE")

  MISS_MS=$(node -e "console.log($TIME * 1000)")
  MISS_TOTAL=$(node -e "console.log($MISS_TOTAL + $MISS_MS)")
done

MISS_AVG=$(node -e "console.log(($MISS_TOTAL / $TRIALS).toFixed(2))")

echo "Average CACHE MISS latency: ${MISS_AVG}ms"
echo ""

echo "=== Measuring CACHE HIT latency ($TRIALS trials, key stays warm) ==="

redis-cli DEL "url:$CODE" > /dev/null

curl -s -o /dev/null "$BASE_URL/$CODE"

HIT_TOTAL=0

for i in $(seq 1 $TRIALS); do
  TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/$CODE")

  HIT_MS=$(node -e "console.log($TIME * 1000)")
  HIT_TOTAL=$(node -e "console.log($HIT_TOTAL + $HIT_MS)")
done

HIT_AVG=$(node -e "console.log(($HIT_TOTAL / $TRIALS).toFixed(2))")

echo "Average CACHE HIT latency: ${HIT_AVG}ms"
echo ""

IMPROVEMENT=$(node -e "console.log(((($MISS_AVG - $HIT_AVG) / $MISS_AVG) * 100).toFixed(1))")

echo "=== RESULT ==="
echo "Cache MISS avg: ${MISS_AVG}ms"
echo "Cache HIT avg:  ${HIT_AVG}ms"
echo "Latency reduction: ${IMPROVEMENT}%"