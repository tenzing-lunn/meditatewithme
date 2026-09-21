'use client';

import type { Room } from '@/lib/room';
import { ICON, ICON_ROOM } from './controls';

/**
 * Dawn or dusk, by hand: the round button beside the menu from the choice
 * screen to the sitting.
 *
 * It shows where it would take you — a sun in the dusk, a moon at dawn — and
 * says so in words for anyone not looking at it. `useRoom` keeps the choice
 * until the day next turns.
 *
 * It stands beside the menu from the doors on, so the corner never changes
 * shape mid-rail — which means it is also drawn on paper, where the room's
 * own tokens would put dusk's cream on a cream page. Hence the variant: the
 * same button in the ground it is standing on.
 */
export default function RoomToggle({
  room,
  onToggle,
  variant = 'room',
}: {
  room: Room;
  onToggle: () => void;
  /** `paper` on the name and the place; `room` everywhere else on the rail. */
  variant?: 'room' | 'paper';
}) {
  const to = room === 'dusk' ? 'dawn' : 'dusk';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${to}`}
      title={`Switch to ${to}`}
      className={variant === 'room' ? ICON_ROOM : ICON}
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
