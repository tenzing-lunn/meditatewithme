'use client';

import type { Room } from '@/lib/room';
import { ICON_ROOM } from './controls';

/**
 * Dawn or dusk, by hand: the round button beside the menu from the choice
 * screen to the sitting.
 *
 * It shows where it would take you — a sun in the dusk, a moon at dawn — and
 * says so in words for anyone not looking at it. `useRoom` keeps the choice
 * until the day next turns.
 *
 * Only in the room. On the paper screens — the name, the place — it changed
 * nothing a person could see, so since 22 September 2026 it is not there.
 */
export default function RoomToggle({
  room,
  onToggle,
}: {
  room: Room;
  onToggle: () => void;
}) {
  const to = room === 'dusk' ? 'dawn' : 'dusk';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${to}`}
      title={`Switch to ${to}`}
      className={ICON_ROOM}
    >
      {to === 'dawn' ? (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M12 2.75v2M12 19.25v2M2.75 12h2M19.25 12h2M5.46 5.46l1.41 1.41M17.13 17.13l1.41 1.41M5.46 18.54l1.41-1.41M17.13 6.87l1.41-1.41"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path
            d="M19.5 14.6A7.75 7.75 0 0 1 9.4 4.5a7.75 7.75 0 1 0 10.1 10.1Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
