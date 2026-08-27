'use client';

import type { UserPreferences } from '@/lib/types';
import {
  TIMER_MIN_MINUTES,
  TIMER_MAX_MINUTES,
  TIMER_STEP_MINUTES,
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

/** Spread across the range so the hour is visibly on offer, not buried. */
const PRESETS = [5, 15, 30, 60];

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
            {prefs.timerMinutes === 60 ? 1 : prefs.timerMinutes}
            <span className="text-ink-3 ml-1 font-sans text-sm">
              {prefs.timerMinutes === 60 ? 'hour' : 'minutes'}
            </span>
          </span>
        </div>

        {/* Twelve stops, not sixty. Nobody meditating has an opinion about
            seventeen minutes versus eighteen. */}
        <input
          id="duration"
          type="range"
          min={TIMER_MIN_MINUTES}
          max={TIMER_MAX_MINUTES}
          step={TIMER_STEP_MINUTES}
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
              {m === 60 ? '1h' : `${m}m`}
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
          // Off state uses ink-3, not rule. Every other control here says what
          // it is in words, so a faint border costs nothing; this one conveys
          // its state through colour and knob position alone, which puts it
          // under the 3:1 rule for UI components. `rule` is 1.29:1.
          className={`focus-visible:ring-ember focus-visible:ring-offset-paper relative h-6 w-11 rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
            prefs.showCount ? 'border-ember bg-ember/20' : 'border-ink-3'
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
