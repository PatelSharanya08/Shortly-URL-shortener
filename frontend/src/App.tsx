import { useEffect, useState } from 'react';
import { ShortenForm } from './components/ShortenForm';
import { RecentLinks } from './components/RecentLinks';
import { useRecentLinks } from './hooks/useRecentLinks';
import { checkHealth } from './api/client';

function App() {
  const { links, addLink } = useRecentLinks();
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const ok = await checkHealth();
      if (!cancelled) setOnline(ok);
    }

    poll();
    const interval = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="canvas">
      <header className="header">
        <div className="brand">
          shortly<span className="brand-mark">.</span>
        </div>
        <div className="status">
          <span className={`status-dot ${online === false ? 'offline' : ''}`} />
          {online === null ? 'Checking…' : online ? 'System online' : 'Backend unreachable'}
        </div>
      </header>

      <main className="hero">
        <p className="eyebrow">Link routing</p>
        <h1 className="headline">
          Route any link. <em>Track every click.</em>
        </h1>
        <p className="subhead">
          Paste a destination URL and get back a short one, backed by Redis caching,
          idempotent writes, and a Kafka-driven click pipeline.
        </p>

        <ShortenForm onCreated={addLink} />
      </main>

      <RecentLinks links={links} />
    </div>
  );
}

export default App;