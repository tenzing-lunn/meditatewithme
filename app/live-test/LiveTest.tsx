'use client';

import { useEffect, useState } from 'react';
import LiveStream, { type LiveState } from '@/components/LiveStream';

type Live = { slug: string; hls: string } | null;

export default function LiveTest() {
  const [live, setLive] = useState<Live>(null);
  const [state, setState] = useState<LiveState | 'none'>('none');

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch('/api/live', { cache: 'no-store' });
        const body = (await res.json()) as { live: Live };
        if (!stop) setLive((prev) => (prev?.hls === body.live?.hls ? prev : body.live));
      } catch {
        // One failed poll is not "nobody is live"; keep what is showing.
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  return (
    <main style={{ position: 'fixed', inset: 0, background: '#000', color: '#ccc' }}>
      {live && (
        <LiveStream
          key={live.hls}
          src={live.hls}
          onState={setState}
          className="absolute inset-0 h-full w-full"
        />
      )}
      <p
        data-testid="live-status"
        style={{ position: 'absolute', bottom: 16, left: 16, font: '14px monospace' }}
      >
        {live ? `live: ${live.slug} — ${state}` : 'nobody is live'}
      </p>
    </main>
  );
}
