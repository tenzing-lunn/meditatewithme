'use client';

import { useId, useState, type CSSProperties } from 'react';
import { localTime } from '@/lib/format';
import {
  TIMER_MAX_MINUTES,
  TIMER_MIN_MINUTES,
  TIMER_STOPS,
  clampMinutes,
  durationLabel,
  nextSharedBellAt,
  timerStopIndex,
} from '@/lib/timer';
import type { UserPreferences } from '@/lib/types';
import Screen from './Screen';
import { CHIP, CHIP_ON, FIELD } from './controls';

/**
 * "How long will you sit?"
 *
 * The slider over the twelve stops, and a number you can type instead. A
 * typed number snaps to the nearest stop when you leave the field, and
 * says so, because seventeen minutes is not a length the slider has and
 * the sitting should not quietly be a different one from the one typed.
 *
 * Sitting with others adds a thirteenth answer, the shared bell: the far
 * end of the slider, and a chip that says what time that is.
 */
export default function TimeScreen({
  current,
  prefs,
  update,
  now,
  onBack,
  onNext,
}: {
  current: boolean;
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  now: number | null;
  onBack: () => void;
  onNext: () => void;
}) {
  const id = useId();
  const together = prefs.showCount;
  const bellAt = now === null ? null : nextSharedBellAt(now);
  const bellLabel = bellAt === null ? null : localTime(bellAt);
  const stops = together ? TIMER_STOPS.length : TIMER_STOPS.length - 1;
  const stop = prefs.untilBell && together
    ? TIMER_STOPS.length
    : timerStopIndex(prefs.timerMinutes);
  const duration = durationLabel(prefs.timerMinutes);

  const [typed, setTyped] = useState<string | null>(null);
  const [rounded, setRounded] = useState<number | null>(null);

  const commitTyped = () => {
    if (typed === null) return;
    const n = Number(typed);
    setTyped(null);
    if (!Number.isFinite(n) || typed.trim() === '') return;
    const snapped = clampMinutes(n);
    setRounded(snapped !== n ? n : null);
    update({ timerMinutes: snapped, untilBell: false });
  };

  return (
    <Screen
      current={current}
      title="How long will you sit?"
      onBack={onBack}
      onNext={onNext}
    >
      <div className="flex flex-col gap-6">
        <p
          aria-live="polite"
          className="font-display text-[2.5rem] leading-none font-bold text-ember"
        >
          {prefs.untilBell && together ? (
            <>
              Until <span className="tabular-nums">{bellLabel ?? 'the bell'}</span>
            </>
          ) : (
            <>
              {duration.value}{' '}
              <span className="text-2xl text-ink-2">{duration.unit}</span>
            </>
          )}
        </p>

        <input
          type="range"
          min={0}
          max={stops}
          step={1}
          value={stop}
          aria-label="How long to sit"
          aria-valuetext={
            prefs.untilBell && together
              ? `Until the bell${bellLabel ? ` at ${bellLabel}` : ''}`
              : `${duration.value} ${duration.unit}`
          }
          onChange={(e) => {
            const i = Number(e.target.value);
            setRounded(null);
            if (i === TIMER_STOPS.length) {
              update({ untilBell: true });
              return;
            }
            update({
              timerMinutes: clampMinutes(TIMER_STOPS[i] ?? prefs.timerMinutes),
              untilBell: false,
            });
          }}
          className="room-range w-full"
          style={{ '--range-fill': `${(stop / stops) * 100}%` } as CSSProperties}
        />

        <div className="flex items-center gap-3">
          <label htmlFor={id} className="shrink-0 text-[0.9375rem] text-ink-2">
            Or type it
          </label>
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={TIMER_MIN_MINUTES}
            max={TIMER_MAX_MINUTES}
            value={typed ?? (prefs.untilBell && together ? '' : String(prefs.timerMinutes))}
            onChange={(e) => setTyped(e.target.value)}
            onBlur={commitTyped}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitTyped();
              }
            }}
            className={`${FIELD} max-w-28 text-center tabular-nums`}
          />
          <span className="text-[0.9375rem] text-ink-2">minutes</span>
        </div>
        <p className="min-h-5 text-[0.8125rem] text-ink-3" role="status">
          {rounded !== null
            ? `${rounded} became ${prefs.timerMinutes}: the sitting keeps to the slider's stops.`
            : ''}
        </p>

        {together && (
          <button
            type="button"
            onClick={() => {
              setRounded(null);
              update({ untilBell: !prefs.untilBell });
            }}
            aria-pressed={prefs.untilBell}
            className={`${CHIP} w-full ${prefs.untilBell ? CHIP_ON : ''}`}
          >
            Until the bell{bellLabel ? ` at ${bellLabel}` : ''}, with everyone
          </button>
        )}
      </div>
    </Screen>
  );
}
