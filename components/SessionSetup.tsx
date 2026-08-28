'use client';

import type { UserPreferences } from '@/lib/types';
import {
  TIMER_STOPS,
  clampMinutes,
  durationLabel,
  nextSharedBellAt,
  timerStopIndex,
} from '@/lib/timer';
import { BELLS, type BellKind, previewBell } from './audio';
import type { MASTER_KEY, TrackSlug } from './mix';
import SoundMixer from './SoundMixer';

/**
 * What you set before you sit.
 *
 * Sits above Begin rather than behind a settings icon, because these are
 * choices you make once per sitting, not configuration you file away. Hiding
 * them would mean everybody sits for whatever the default is.
 *
 * Sound sits below the bell. It is last because it is the only control here
 * somebody might spend a minute on rather than a second, and putting it above
 * Begin's other choices would turn a page about starting into a mixing desk.
 */

/**
 * Spread across the range so both ends are visibly on offer, not buried.
 *
 * One minute is here deliberately. It is the sit somebody takes when they are
 * not sure they want to sit at all, and leaving it at the far left of a slider
 * hides it from exactly the person it exists for.
 */
const PRESETS = [1, 10, 30, 'bell'] as const;

export default function SessionSetup({
  prefs,
  update,
  onSound,
  now,
  disabled,
}: {
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  /** Runs inside the change event, because the audio graph needs a gesture. */
  onSound: (slug: TrackSlug | typeof MASTER_KEY, gain: number) => void;
  /** Server-corrected clock: the bell label must mean the same moment worldwide. */
  now: number;
  disabled?: boolean;
}) {
  const duration = durationLabel(prefs.timerMinutes);
  const bellAt = nextSharedBellAt(now);
  const bellLabel = new Date(bellAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

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
            {prefs.untilBell ? (
              <>
                Until the
                <span className="text-ink-3 ml-1 font-sans text-sm">bell</span>
              </>
            ) : (
              <>
                {duration.value}
                <span className="text-ink-3 ml-1 font-sans text-sm">
                  {duration.unit}
                </span>
              </>
            )}
          </span>
        </div>

        {/* Thirteen stops, not sixty. Nobody meditating has an opinion about
            seventeen minutes versus eighteen.

            The value is an INDEX into TIMER_STOPS, not a number of minutes,
            because the stops are not evenly spaced — the jump from one minute
            to five has no `step` that can describe it. That makes the raw
            value meaningless to a screen reader, which is what aria-valuetext
            is for. */}
        <input
          id="duration"
          type="range"
          min={0}
          max={TIMER_STOPS.length}
          step={1}
          value={prefs.untilBell ? TIMER_STOPS.length : timerStopIndex(prefs.timerMinutes)}
          aria-valuetext={prefs.untilBell ? `Until the bell at ${bellLabel}` : `${duration.value} ${duration.unit}`}
          onChange={(e) => {
            const index = Number(e.target.value);
            if (index === TIMER_STOPS.length) {
              update({ untilBell: true });
              return;
            }
            update({
              timerMinutes: clampMinutes(TIMER_STOPS[index] ?? prefs.timerMinutes),
              untilBell: false,
            });
          }}
          className="accent-ember w-full"
        />

        {/* The slider is precise but fiddly; most people want a round number. */}
        <div className="flex gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() =>
                update(
                  preset === 'bell'
                    ? { untilBell: true }
                    : { timerMinutes: preset, untilBell: false },
                )
              }
              aria-pressed={preset === 'bell' ? prefs.untilBell : !prefs.untilBell && prefs.timerMinutes === preset}
              className={`flex-1 rounded-full border py-1.5 font-mono text-xs transition-colors ${
                (preset === 'bell' ? prefs.untilBell : !prefs.untilBell && prefs.timerMinutes === preset)
                  ? 'border-ember text-ember'
                  : 'border-rule text-ink-3 hover:border-ink-3'
              }`}
            >
              {preset === 'bell' ? 'Until bell' : `${preset}m`}
            </button>
          ))}
        </div>
        {prefs.untilBell && (
          <p className="text-ink-3 font-mono text-xs tracking-[0.08em]">
            Everyone who chooses this ends together at {bellLabel}.
          </p>
        )}
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

      {/* ---- What you hear underneath ---- */}
      <SoundMixer soundMix={prefs.soundMix} onChange={onSound} />

      {/* ---- The room ---- */}
      <div className="flex items-center justify-between">
        <span className="text-ink-3 font-mono text-xs tracking-[0.13em] uppercase">
          Show the room
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.showCount}
          aria-label="Show the room"
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
