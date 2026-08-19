import { useState, type FormEvent } from 'react';
import { createShortUrl, ApiRequestError } from '../api/client';
import type { ShortUrlResponse } from '../types/api';

interface ShortenFormProps {
  onCreated: (link: ShortUrlResponse) => void;
}

export function ShortenForm({ onCreated }: ShortenFormProps) {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!url.trim()) return;

    setSubmitting(true);
    try {
      const link = await createShortUrl(url.trim());
      onCreated(link);
      setUrl('');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 429) {
          setError("You're creating links too quickly. Wait a moment and try again.");
        } else if (err.status === 400) {
          setError(err.body.details?.[0]?.message ?? 'Enter a valid URL, including https://');
        } else {
          setError(err.body.message ?? 'Something went wrong. Try again.');
        }
      } else {
        setError('Could not reach the server. Is the backend running?');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="shorten-form" onSubmit={handleSubmit}>
      <input
        type="url"
        className="shorten-input"
        placeholder="https://example.com/a/very/long/path/to/shorten"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        aria-label="Destination URL"
        required
      />
      <button type="submit" className="shorten-submit" disabled={submitting}>
        {submitting ? 'Dispatching…' : 'Shorten link'}
      </button>
      {error && <div className="form-error">{error}</div>}
    </form>
  );
}