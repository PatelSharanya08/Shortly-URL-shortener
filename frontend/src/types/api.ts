export interface ShortUrlResponse {
  shortCode: string;
  shortUrl: string;
  longUrl: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface UrlStats {
  shortCode: string;
  totalClicks: number;
  createdAt: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: { path: string; message: string }[];
}