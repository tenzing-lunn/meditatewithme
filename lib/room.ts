/**
 * Dawn or dusk: the light in the room.
 *
 * From the choice screen to the ending the ground is the room, and the room
 * follows the visitor's own day — dawn from six in the morning, dusk from six
 * in the evening — unless they switch it. A switch holds until the day next
 * turns, at six one way or the other: somebody who wants dusk at noon has it
 * for the afternoon, and does not find their switch meaning the opposite at
 * midnight, or waiting for them tomorrow.
 *
 * Pure: the time and the saved choice come in as values (`useRoom` reads the
 * clock and storage), so the rule is tested rather than looked at. Local
 * calendar fields, not millisecond arithmetic, for the reason
 * `lib/practice.ts` gives about days.
 */

export type Room = 'dawn' | 'dusk';

export const DAWN_HOUR = 6;
export const DUSK_HOUR = 18;

export interface RoomChoice {
  room: Room;
  /** When the choice lapses: the next six o'clock after it was made, in ms. */
  until: number;
}

/** What the hour alone says. */
export function roomAtHour(hour: number): Room {
  return hour >= DAWN_HOUR && hour < DUSK_HOUR ? 'dawn' : 'dusk';
}

/** The next time the day turns: six in the morning or six in the evening. */
export function nextTurn(now: Date): number {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const h = now.getHours();
  if (h < DAWN_HOUR) return new Date(y, m, d, DAWN_HOUR).getTime();
  if (h < DUSK_HOUR) return new Date(y, m, d, DUSK_HOUR).getTime();
  return new Date(y, m, d + 1, DAWN_HOUR).getTime();
}

/** The room now: a switch still in force, or the hour. */
export function resolveRoom(now: Date, saved: RoomChoice | null): Room {
  return saved !== null && now.getTime() < saved.until ? saved.room : roomAtHour(now.getHours());
}

/** Pressing the toggle: the other room, until the day next turns. */
export function switchRoom(now: Date, current: Room): RoomChoice {
  return { room: current === 'dawn' ? 'dusk' : 'dawn', until: nextTurn(now) };
}

/** A stored choice, or null for anything that is not one. */
export function parseRoomChoice(raw: string | null): RoomChoice | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<RoomChoice> | null;
    if (!v || (v.room !== 'dawn' && v.room !== 'dusk')) return null;
    if (typeof v.until !== 'number' || !Number.isFinite(v.until)) return null;
    return { room: v.room, until: v.until };
  } catch {
    return null;
  }
}
