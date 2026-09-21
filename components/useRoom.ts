'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  parseRoomChoice,
  resolveRoom,
  switchRoom,
  type Room,
  type RoomChoice,
} from '@/lib/room';

const KEY = 'mwm.room';

/** Everybody on the page reading the room, so a switch reaches all of them. */
const listeners = new Set<() => void>();

/** Where a switch lives when storage will not keep it (a private window). */
let memory: RoomChoice | null = null;

function saved(): RoomChoice | null {
  try {
    return parseRoomChoice(window.localStorage.getItem(KEY)) ?? memory;
  } catch {
    return memory;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // The day turns while a page is open, so the room is asked again each
  // minute; `read` returns the same string until it actually changes.
  const timer = window.setInterval(onChange, 60_000);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.clearInterval(timer);
    window.removeEventListener('storage', onStorage);
  };
}

const read = (): Room => resolveRoom(new Date(), saved());
// The server cannot know the visitor's hour. Dusk is what the room was
// before there was a choice, and the first client read corrects it.
const readServer = (): Room => 'dusk';

/**
 * Dawn or dusk, now, and the switch.
 *
 * The rule is `lib/room.ts`: the visitor's hour, unless they have switched,
 * and a switch lasts until six o'clock next comes round. Kept on this device
 * only, as `mwm.room` — it is how the room looks, not a preference worth an
 * account's column.
 */
export function useRoom(): { room: Room; toggle: () => void } {
  const room = useSyncExternalStore(subscribe, read, readServer);
  const toggle = useCallback(() => {
    const choice = switchRoom(new Date(), read());
    memory = choice;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(choice));
    } catch {
      // Kept in memory for this page instead.
    }
    listeners.forEach((l) => l());
  }, []);
  return { room, toggle };
}
