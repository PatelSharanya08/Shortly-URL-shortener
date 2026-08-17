/**
 * Base62 encoding: converts a number into a short alphanumeric string
 * using the character set [0-9, a-z, A-Z] (62 characters total).
 *
 * Why base62 over base64? Base64 includes '+' and '/' which aren't
 * URL-safe without escaping. Base62 avoids that problem entirely.
 *
 * Uses BigInt because Snowflake IDs are 63-bit numbers, which exceed
 * Number.MAX_SAFE_INTEGER (2^53 - 1) — using plain `number` here would
 * silently lose precision on large IDs.
 *
 * Example: 125n -> "cb"
 */

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = BigInt(ALPHABET.length); // 62n

export function encodeBase62(num: bigint): string {
  if (num === 0n) return ALPHABET[0];
  if (num < 0n) throw new Error('Cannot encode a negative number');

  let result = '';
  let n = num;

  while (n > 0n) {
    const remainder = Number(n % BASE);
    result = ALPHABET[remainder] + result;
    n = n / BASE;
  }

  return result;
}

export function decodeBase62(str: string): bigint {
  let result = 0n;

  for (const char of str) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`Invalid base62 character: ${char}`);
    result = result * BASE + BigInt(index);
  }

  return result;
}