import { useEffect, useState } from 'react';
import type { ShortUrlResponse } from '../types/api';

const STORAGE_KEY = 'shortly:recent-links';
const MAX_STORED = 20;

/**
 * The backend has no "list all URLs" endpoint — there's no user/auth
 * system, so there's no concept of "your" links server-side. Instead,
 * each browser remembers what it created locally. This is a deliberate
 * scope decision, not an oversight: adding real accounts is a separate,
 * larger feature.
 */
export function useRecentLinks() {
  const [links, setLinks] = useState<ShortUrlResponse[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ShortUrlResponse[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
    } catch {
      // Storage full or unavailable (e.g. private browsing) — non-fatal,
      // the app still works, it just won't persist across reloads.
    }
  }, [links]);

  function addLink(link: ShortUrlResponse) {
    setLinks((prev) => [link, ...prev.filter((l) => l.shortCode !== link.shortCode)].slice(0, MAX_STORED));
  }

  return { links, addLink };
}