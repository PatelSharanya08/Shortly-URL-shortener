import type { ShortUrlResponse, UrlStats, ApiError } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

class ApiRequestError extends Error {
  status: number;
  body: ApiError;

  constructor(status: number, body: ApiError) {
    super(body.message ?? 'Request failed');
    this.status = status;
    this.body = body;
  }
}

export { ApiRequestError };

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function createShortUrl(longUrl: string): Promise<ShortUrlResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/shorten`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // A fresh idempotency key per submit — if this exact request gets
      // retried by the browser (e.g. a flaky connection), the backend
      // will safely replay the same result instead of creating a duplicate.
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({ longUrl }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new ApiRequestError(res.status, body as ApiError);
  }

  return body as ShortUrlResponse;
}

export async function getUrlStats(shortCode: string): Promise<UrlStats> {
  const res = await fetch(`${API_BASE_URL}/api/v1/urls/${shortCode}/stats`);
  const body = await res.json();

  if (!res.ok) {
    throw new ApiRequestError(res.status, body as ApiError);
  }

  return body as UrlStats;
}