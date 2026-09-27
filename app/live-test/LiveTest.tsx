'use client';

import { useEffect, useState } from 'react';
import LiveStream, { type LiveState } from '@/components/LiveStream';
import { SLUG_RE, hlsUrl } from '@/lib/live';

type Live = { slug: string; hls: string } | null;
type Answer = { live: Live; next?: string };

/**
 * `?slug=<slug>` plays that stream whether or not it is on air, so a
 * collaborator waiting for the hour can check their picture.
 */
export default function LiveTest({ hlsBase }: { hlsBase: string | null }) {
  const [live, setLive] = useState<Live>(null);
  const [next, setNext] = useState<string | null>(null);
  const [state, setState] = useState<LiveState | 'none'>('none');

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch('/api/live', { cache: 'no-store' });
        const body = (await res.json()) as Answer;
        const own = new URLSearchParams(location.search).get('slug');
        const shown: Live =
          own && hlsBase && SLUG_RE.test(own) ? { slug: own, hls: hlsUrl(hlsBase, own) } : body.live;
        if (stop) return;
        setLive((prev) => (prev?.hls === shown?.hls ? prev : shown));
        setNext(body.next ?? null);
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
        {live
          ? `live: ${live.slug} — ${state}`
          : next
            ? `between sessions — next at ${new Date(next).toLocaleTimeString()}`
            : 'nobody is live'}
      </p>
    </main>
  );
}
