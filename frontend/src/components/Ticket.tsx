import { useState } from 'react';
import { Barcode } from './Barcode';
import { getUrlStats } from '../api/client';
import type { ShortUrlResponse, UrlStats } from '../types/api';

interface TicketProps {
  link: ShortUrlResponse;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Ticket({ link }: TicketProps) {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<UrlStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(link.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleShowStats() {
    if (stats) {
      setStats(null); // toggle closed
      return;
    }
    setLoadingStats(true);
    try {
      const result = await getUrlStats(link.shortCode);
      setStats(result);
    } catch {
      // Stats are a nice-to-have, not critical — fail silently rather
      // than disrupting the ticket over a secondary feature.
    } finally {
      setLoadingStats(false);
    }
  }

  return (
    <div className="ticket">
      <div className="ticket-stub">
        <Barcode code={link.shortCode} />
      </div>
      <div className="ticket-divider" />
      <div className="ticket-body">
        <div className="ticket-code-row">
          <span className="ticket-code">{link.shortUrl.replace(/^https?:\/\//, '')}</span>
          <button
            type="button"
            className={`ticket-copy ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="ticket-destination" title={link.longUrl}>
          {link.longUrl}
        </div>
        <div className="ticket-meta-row">
          <span className="ticket-meta">{formatDate(link.createdAt)}</span>
          <button type="button" className="ticket-stats-btn" onClick={handleShowStats}>
            {loadingStats ? 'Loading…' : stats ? 'Hide stats' : 'View stats'}
          </button>
        </div>
        {stats && (
          <div className="ticket-stats">
            <div>
              <span className="ticket-stat-value">{stats.totalClicks}</span>
              <span className="ticket-stat-label">Total clicks</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}