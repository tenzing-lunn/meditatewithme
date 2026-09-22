'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import type { BellKind } from '@/lib/types';
import Screen from './Screen';
import { BELLS, previewBell } from './audio';
import { FOCUS_ROOM } from './controls';

/**
 * "How will it end?"
 *
 * Three bells. Choosing one plays it, at a third of its real tail, because
 * picking a sound you cannot hear is guesswork. That strike goes straight
 * to the audio context, never through the mix, so this is the one screen
 * before the bowl that makes a sound, and only when a bell is pressed.
 *
 * THREE OBJECTS, NOT THREE BARS
 * Until 17 September 2026 these were three full-width chips with their names
 * centred in them: a 700px target carrying fifteen pixels of type, which
 * reads as a placeholder, and three identical shapes giving no reason to
 * prefer one. They are drawn now — a bowl, a gong, a cast bell — each with
 * the character of the instrument under its name, so the choice can be made
 * with the eyes as well as the ear. Tapping one rings it, and two rings
 * leave the drawing as it sounds: the receipt for a tap whose whole effect
 * is a noise, which somebody on a muted laptop would otherwise never see.
 * The chosen one keeps the action colour and stays lit.
 *
 * One bell is chosen at a time, so the three are a radio group rather than
 * three toggles: one tab stop, and the arrows move the choice and ring the
 * bell they land on, the same as a tap, so a keyboard hears what it chose.
 */

/** What each instrument is, in the fewest words that are true of it. */
export const CHARACTER: Record<BellKind, string> = {
  'singing-bowl': 'Warm, with a warble',
  gong: 'Low, slowest to fade',
  'struck-bell': 'Bright, with a hard edge',
};

const KINDS = Object.keys(BELLS) as BellKind[];

export function Glyph({ kind }: { kind: BellKind }) {
  if (kind === 'singing-bowl') {
    return (
      <svg viewBox="0 0 48 34" fill="none" aria-hidden className="h-11 w-14">
        <path d="M9 10c0 9 6.7 16 15 16s15-7 15-16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="24" cy="10" rx="15" ry="4.2" stroke="currentColor" strokeWidth="2" />
        <path d="M14 30h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'gong') {
    return (
      <svg viewBox="0 0 48 34" fill="none" aria-hidden className="h-11 w-14">
        <circle cx="24" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
        <circle cx="24" cy="16" r="7" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
        <circle cx="24" cy="16" r="2.4" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 34" fill="none" aria-hidden className="h-11 w-14">
      <path d="M15 25c0-8 2-13 9-13s9 5 9 13Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 9V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 28h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function BellScreen({
  current,
  endBell,
  onPick,
  onBack,
  onNext,
  nextLabel,
  step,
  steps,
}: {
  current: boolean;
  endBell: BellKind;
  onPick: (kind: BellKind) => void;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  step?: number;
  steps?: number;
}) {
  // Counts strikes rather than naming one, so pressing the same bell twice
  // rings it twice: the key restarts the animation from the beginning
  // instead of leaving it wherever the last one got to.
  const [rung, setRung] = useState(0);
  const [lastRung, setLastRung] = useState<BellKind | null>(null);
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);

  const ring = (kind: BellKind) => {
    onPick(kind);
    previewBell(kind);
    setLastRung(kind);
    setRung((n) => n + 1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const by =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (!by) return;
    e.preventDefault();
    const next = (i + by + KINDS.length) % KINDS.length;
    const kind = KINDS[next];
    if (!kind) return;
    ring(kind);
    tiles.current[next]?.focus();
  };

  return (
    <Screen
      current={current}
      title="How will it end?"
      lede="A bell marks both ends of a sitting. Tap one to hear it."
      onBack={onBack}
      onNext={onNext}
      nextLabel={nextLabel}
      step={step}
      steps={steps}
      room
      split
      middle
    >
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3" role="radiogroup" aria-label="The bell">
        {KINDS.map((kind, i) => {
          const chosen = endBell === kind;
          return (
            <button
              key={kind}
              ref={(el) => {
                tiles.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={chosen}
              tabIndex={chosen ? 0 : -1}
              onClick={() => ring(kind)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`group relative isolate flex min-h-[11rem] flex-col items-start justify-end gap-2 overflow-hidden rounded-card border p-3 text-left transition-colors duration-200 motion-reduce:transition-none sm:p-4 ${FOCUS_ROOM} ${
                chosen
                  ? 'border-room-action bg-room-action/15'
                  : 'border-room-edge hover:border-room-action'
              }`}
            >
              <span
                key={lastRung === kind ? rung : 'still'}
                className={`relative ${lastRung === kind && rung > 0 ? 'bell-rang' : ''} ${
                  chosen ? 'text-room-action' : 'text-room-ink-2 group-hover:text-room-action'
                }`}
              >
                <Glyph kind={kind} />
                <span
                  aria-hidden
                  className="bell-ring absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-current"
                />
                <span
                  aria-hidden
                  className="bell-ring bell-ring-late absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-current"
                />
              </span>
              <span
                className={`text-control leading-tight font-semibold ${
                  chosen ? 'text-room-action' : 'text-room-ink'
                }`}
              >
                {BELLS[kind].label}
              </span>
              <span className="text-caption leading-snug text-room-ink-2">{CHARACTER[kind]}</span>
            </button>
          );
        })}
      </div>
    </Screen>
  );
}
