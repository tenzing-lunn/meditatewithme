'use client';

/**
 * The room, not a metric.
 *
 * The server returns two cached aggregate readings: people visible right now
 * and people who have lit this UTC hour. No participant identifiers cross the
 * network. The little field is therefore identical in shape for every viewer;
 * the ring around slot zero is the one local, private acknowledgement that
 * says "you are here".
 */

const MAX_FLAMES = 60;

type Slot = { left: number; top: number };

// A deliberately imperfect six-by-ten field. The fixed offsets keep cache
// responses and re-renders quiet: a new arrival fades in rather than making a
// randomised crowd jump to new positions.
const SLOTS: readonly Slot[] = Array.from({ length: MAX_FLAMES }, (_, index) => {
  const column = index % 10;
  const row = Math.floor(index / 10);
  return {
    left: 7 + column * 9.55 + Math.sin(index * 2.17) * 1.8,
    top: 9 + row * 15.5 + Math.cos(index * 1.31) * 2.1,
  };
});

function boundedCount(value: number | null): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

export default function PresenceField({
  liveCount,
  litCount,
}: {
  liveCount: number | null;
  litCount: number | null;
}) {
  if (liveCount === null || litCount === null) return null;

  const live = boundedCount(liveCount);
  // A cache refresh can briefly put the two readings out of order. An active
  // person is necessarily somebody who lit this hour, so render the truthful
  // superset while the next shared response catches up.
  const lit = Math.max(live, boundedCount(litCount));
  const visible = Math.min(MAX_FLAMES, lit);
  const visibleLive = Math.min(visible, live);
  if (visible === 0) return null;

  return (
    <section
      aria-label={`The room: ${live} here now, ${lit} lit this hour`}
      className="presence-field w-full max-w-sm"
    >
      <div aria-hidden className="presence-field-glow" />
      <div aria-hidden className="presence-field-flames">
        {SLOTS.slice(0, visible).map((slot, index) => {
          const isLive = index < visibleLive;
          const isMine = index === 0 && live > 0;
          return (
            <span
              key={index}
              className={`presence-flame ${isLive ? 'presence-flame-live' : ''} ${
                isMine ? 'presence-flame-mine' : ''
              }`}
              style={{ left: `${slot.left}%`, top: `${slot.top}%` }}
            >
              <span className="presence-flame-core" />
            </span>
          );
        })}
      </div>
    </section>
  );
}
