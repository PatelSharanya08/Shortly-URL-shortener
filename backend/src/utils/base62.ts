/**
 * Base62 encoding: converts a number into a short alphanumeric string
 * using the character set [0-9, a-z, A-Z] (62 characters total).
 *
 * Why base62 over base64? Base64 includes '+' and '/' which aren't
 * URL-safe without escaping. Base62 avoids that problem entirely.
 *
 * Example: 125 -> "cb"
 */

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = ALPHABET.length; // 62

export function encodeBase62(num: number): string {
  if (num === 0) return ALPHABET[0];
  if (num < 0) throw new Error('Cannot encode a negative number');

  let result = '';
  let n = num;

  while (n > 0) {
    const remainder = n % BASE;
    result = ALPHABET[remainder] + result;
    n = Math.floor(n / BASE);
  }

  return result;
}

export function decodeBase62(str: string): number {
  let result = 0;

  for (const char of str) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`Invalid base62 character: ${char}`);
    result = result * BASE + index;
  }

  return result;
}
