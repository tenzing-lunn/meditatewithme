'use client';

import type { UserPreferences } from '@/lib/types';
import {
  TIMER_MIN_MINUTES,
  TIMER_MAX_MINUTES,
  clampMinutes,
} from '@/lib/timer';
import { BELLS, type BellKind, previewBell } from './audio';

/**
 * What you set before you sit.
 *
 * Sits above Begin rather than behind a settings icon, because these are
 * choices you make once per sitting, not configuration you file away. Hiding
 * them would mean everybody sits for whatever the default is.
 *
 * Sound mixing is absent on purpose — that is step 05 and it is blocked on the
 * client sourcing licensed loops. It slots in below the bell without disturbing
 * anything here.
 */

const PRESETS = [5, 10, 20, 30];

export default function SessionSetup({
  prefs,
  update,
  disabled,
}: {
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`w-full max-w-sm space-y-6 ${disabled ? 'pointer-events-none opacity-40' : ''}`}
    >
      {/* ---- How long ---- */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <label
            htmlFor="duration"
            className="text-ink-3 font-mono text-xs tracking-[0.13em] uppercase"
          >
            Sit for
          </label>
          <span className="font-serif text-2xl tabular-nums">
            {prefs.timerMinutes}
            <span className="text-ink-3 ml-1 font-sans text-sm">
              {prefs.timerMinutes === 1 ? 'minute' : 'minutes'}
            </span>
          </span>
        </div>

        <input
          id="duration"
          type="range"
          min={TIMER_MIN_MINUTES}
          max={TIMER_MAX_MINUTES}
          value={prefs.timerMinutes}
          onChange={(e) =>
            update({ timerMinutes: clampMinutes(Number(e.target.value)) })
          }
          className="accent-ember w-full"
        />

        {/* The slider is precise but fiddly; most people want a round number. */}
        <div className="flex gap-2">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => update({ timerMinutes: m })}
              aria-pressed={prefs.timerMinutes === m}
              className={`flex-1 rounded-full border py-1.5 font-mono text-xs transition-colors ${
                prefs.timerMinutes === m
                  ? 'border-ember text-ember'
                  : 'border-rule text-ink-3 hover:border-ink-3'
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </section>

      {/* ---- Which bell ---- */}
      <fieldset className="space-y-3">
        <legend className="text-ink-3 font-mono text-xs tracking-[0.13em] uppercase">
          End with
        </legend>

        <div className="flex gap-2">
          {(Object.keys(BELLS) as BellKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                update({ endBell: kind });
                // Choosing a bell you cannot hear is guesswork, so selecting
                // one plays it. This also warms the AudioContext inside a real
                // user gesture, so the scheduled bell is never the first thing
                // the browser is asked to allow.
                previewBell(kind);
              }}
              aria-pressed={prefs.endBell === kind}
              className={`flex-1 rounded-full border px-2 py-1.5 text-xs transition-colors ${
                prefs.endBell === kind
                  ? 'border-ember text-ember'
                  : 'border-rule text-ink-3 hover:border-ink-3'
              }`}
            >
              {BELLS[kind].label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* ---- The count ---- */}
      <div className="flex items-center justify-between">
        <span className="text-ink-3 font-mono text-xs tracking-[0.13em] uppercase">
          Show how many are here
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.showCount}
          aria-label="Show how many people are here"
          onClick={() => update({ showCount: !prefs.showCount })}
          className={`relative h-6 w-11 rounded-full border transition-colors ${
            prefs.showCount ? 'border-ember bg-ember/20' : 'border-rule'
          }`}
        >
          <span
            className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all ${
              prefs.showCount ? 'bg-ember left-[1.4rem]' : 'bg-ink-3 left-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
