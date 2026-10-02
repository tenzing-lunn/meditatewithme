'use client';

import { useState, type MutableRefObject } from 'react';
import LiveStream from './LiveStream';

/**
 * Whoever is on camera, over the pond, during a sitting with others.
 *
 * Nothing shows until frames are actually playing, and it fades back to
 * the pond the moment they stop — so an empty hour, a stalled stream or a
 * refused autoplay all look the same as today: the water. The picture is
 * a window on the pond, not a new ground: framed in the middle, with the
 * water, the rings and the sitting's words around it, where they stay
 * readable.
 *
 * Under the window, one line says what it is — live, not recorded, and
 * nobody watching back — and, if a stream that was playing drops, that it
 * will come back by itself, so the window never just vanishes unexplained
 * (`plans/apple-guidelines.md`).
 *
 * `picture` is for the demo: something to stand in for a stream, so the
 * wash can be judged without anyone live.
 */
export default function LiveLayer({
  src,
  playRef,
  picture,
}: {
  src: string | null;
  playRef?: MutableRefObject<(() => void) | null>;
  picture?: React.ReactNode;
}) {
  // Which stream is playing, so a new one is not shown on the old one's word.
  const [playing, setPlaying] = useState<string | null>(null);
  // Which stream has played at all, so a drop is told apart from a start.
  const [seen, setSeen] = useState<string | null>(null);
  const shown = picture !== undefined || (src !== null && playing === src);
  const dropped = !shown && src !== null && seen === src;
  const line = shown
    ? 'Live, and not recorded. Nobody can see or hear you.'
    : dropped
      ? 'The picture dropped. It will come back by itself.'
      : null;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 pb-24 pt-16">
      <div
        aria-hidden="true"
        className={`relative aspect-video w-full max-w-4xl overflow-hidden rounded-card border border-rule bg-scrim transition-opacity duration-1000 motion-reduce:transition-none ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
      >
      {picture ??
        (src !== null && (
          <LiveStream
            key={src}
            src={src}
            onState={(s) => {
              setPlaying(s === 'playing' ? src : null);
              if (s === 'playing') setSeen(src);
            }}
            playRef={playRef}
            className="absolute inset-0 h-full w-full"
          />
        ))}
      </div>
      <p role="status" className="mt-3 min-h-6 text-center text-caption text-ink-3">
        {line}
      </p>
    </div>
  );
}
