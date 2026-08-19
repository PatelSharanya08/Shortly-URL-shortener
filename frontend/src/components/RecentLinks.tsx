import { Ticket } from './Ticket';
import type { ShortUrlResponse } from '../types/api';

interface RecentLinksProps {
  links: ShortUrlResponse[];
}

export function RecentLinks({ links }: RecentLinksProps) {
  return (
    <section className="recent">
      <h2 className="recent-heading">Recent dispatches</h2>
      {links.length === 0 ? (
        <p className="recent-empty">Nothing shortened yet on this device.</p>
      ) : (
        <div className="recent-list">
          {links.map((link) => (
            <Ticket key={link.shortCode} link={link} />
          ))}
        </div>
      )}
    </section>
  );
}