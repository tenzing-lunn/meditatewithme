'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

import type { UserPreferences } from '@/lib/types';
import {
  TIMER_STOPS,
  clampMinutes,
  durationLabel,
  nextSharedBellAt,
  timerStopIndex,
} from '@/lib/timer';
import { BELLS, type BellKind, previewBell } from './audio';
import { TRACKS, type MASTER_KEY, type TrackSlug } from './mix';
import SoundMixer from './SoundMixer';

/**
 * What you settle before you sit — asked one thing at a time, on its own
 * screen, with a way forward.
 *
 * WHY THIS IS A FLOW AND NOT A PAGE
 * It used to be every control at once, above Begin, on the reasoning that
 * hiding them would mean everybody sat on the default. That reasoning was
 * right when there were three controls. There are now eleven, and the page it
 * produced was a settings screen with a candle on top of it — 2,280px tall on
 * a phone, with the one button that matters nearly three screens down.
 *
 * The fix after that was a folded stack sitting permanently on the landing,
 * which was smaller but still meant the first thing anybody saw was a form.
 * Now the landing is the photograph and the word `Begin.`, and this is what
 * `Begin.` opens: the room settles back out of focus and asks one thing, with
 * what you have already answered folded into a line above it and a `Next`
 * underneath. The last screen's button is the one that actually starts.
 *
 * There is no "you have done this before, skip it" path any more, and that is
 * deliberate. Walking three screens with your own previous answers already
 * filled in is a few seconds; it is also the only moment the product has to
 * ask a returning visitor whether today is a ten-minute day or a thirty. Your
 * answers still persist — they are what these screens open on.
 */

const STEPS = ['duration', 'bell', 'sound'] as const;
export type Step = (typeof STEPS)[number];

const QUESTION: Record<Step, string> = {
  duration: 'How long?',
  bell: 'How should it end?',
  sound: 'Any ambiance?',
};

/** "rain", "rain and wind", "rain, wind and night" */
function sentenceList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export default function SessionSetup({
  prefs,
  update,
  onSound,
  now,
  begin,
  onStepChange,
  onCancel,
}: {
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  /** Runs inside the change event, because the audio graph needs a gesture. */
  onSound: (slug: TrackSlug | typeof MASTER_KEY, gain: number) => void;
  /** Server-corrected clock: the bell label must mean the same moment worldwide. */
  now: number;
  /**
   * The Start button, rendered by the room but placed by the flow.
   *
   * The action belongs to Room, which owns what beginning means. Where it sits
   * belongs here, because "when does it appear" is the same question as "how
   * far through the questions are we" — and the answer is now simply: on the
   * last one.
   */
  begin: ReactNode;
  /** Which question is showing, for the camera. */
  onStepChange?: (step: Step) => void;
  /** Back out to the landing, from the first question. */
  onCancel: () => void;
}) {
  const [step, setStep] = useState<Step>('duration');

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  const index = STEPS.indexOf(step);
  const duration = durationLabel(prefs.timerMinutes);
  const bellAt = nextSharedBellAt(now);
  const bellLabel = new Date(bellAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  const durationStop = prefs.untilBell
    ? TIMER_STOPS.length
    : timerStopIndex(prefs.timerMinutes);

  const soundSummary = (() => {
    const on = TRACKS.filter((t) => (prefs.soundMix[t.slug] ?? 0) > 0);
    if (on.length === 0) return 'In silence';
    return `With ${sentenceList(on.map((t) => t.label.toLowerCase()))}`;
  })();

  const SUMMARY: Record<Step, string> = {
    duration: prefs.untilBell
      ? `Sitting together until ${bellLabel}`
      : `Sitting for ${duration.value} ${duration.unit}`,
    bell: `Ending with a ${BELLS[prefs.endBell].label.toLowerCase()}`,
    sound: soundSummary,
  };

  // max-w-md, not the max-w-sm the folded stack used. The sound screen is now a
  // play button, a label and a fader on one line, and three columns do not fit
  // in 24rem without the fader becoming a token gesture. Width costs the band
  // nothing — only height is scarce there.
  return (
    <div className="flex w-full max-w-md flex-col items-stretch">
      {/* Back, and always in the same place — an arrow at the top left, which
          is where a back control lives and needs no label to be understood.
          It was a `Not now` link on the first screen only, which meant the way
          out moved depending on how far in you were.

          From the first screen it leaves the flow; from any other it steps back
          one question. */}
      <button
        type="button"
        onClick={() =>
          index === 0 ? onCancel() : setStep(STEPS[index - 1] ?? 'duration')
        }
        aria-label={index === 0 ? 'Back to the room' : 'Back a question'}
        className="text-ink-3 hover:text-ink rounded-control focus-visible:ring-ember focus-visible:ring-offset-paper -ml-2 flex size-11 shrink-0 items-center justify-center self-start transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
          <path
            d="M15 5 8 12l7 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* What you have already said, folded to a line each and still
          reversible. Steps ahead of this one render nothing at all rather than
          rendering disabled — a greyed-out control still occupies the screen
          and still asks to be read, and the whole point is that one thing is
          being asked. */}
      {STEPS.slice(0, index).map((done) => (
        <button
          key={done}
          type="button"
          onClick={() => setStep(done)}
          className="group border-rule/60 rounded-control focus-visible:ring-ember focus-visible:ring-offset-paper flex w-full items-baseline justify-between gap-4 border-b py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <span className="text-ink-2 group-hover:text-ink text-[0.95rem] transition-colors">
            {SUMMARY[done]}
          </span>
          <span className="text-ink-3 group-hover:text-ember shrink-0 text-xs transition-colors">
            change
          </span>
        </button>
      ))}

      <section className="pt-4 pb-6">
        {/* The question is the screen, so it is read first and it is read
            without effort. It was `text-2xl` sitting below two folded summary
            lines, which put the one thing being asked third in the reading
            order at the same size as the answers. */}
        <h2 className="font-display text-4xl leading-tight sm:text-5xl">
          {QUESTION[step]}
        </h2>

        <div className="mt-7">
          {step === 'duration' && (
            <div className="space-y-5">
              {/* The answer, read back at display size. The presets that used
                  to sit here (1 · 10 · 30) are gone: three arbitrary numbers
                  next to a slider that already covers them is the same choice
                  offered twice, and it made the slider look like a fallback.
                  This is the slider's readout, so dragging it says something. */}
              <p
                aria-hidden
                className="font-display text-ember text-4xl leading-none"
              >
                {prefs.untilBell ? (
                  <>
                    until <span className="tabular-nums">{bellLabel}</span>
                  </>
                ) : (
                  <>
                    {duration.value}{' '}
                    <span className="text-ink-2 text-2xl">{duration.unit}</span>
                  </>
                )}
              </p>

              {/* Thirteen stops, not sixty. The value is an INDEX into
                  TIMER_STOPS — the jump from one minute to five is not a step
                  any `step` attribute can describe — which is why it carries an
                  aria-valuetext. The last stop past the end is the shared bell,
                  so dragging to the far right lands on sitting together. */}
              <input
                type="range"
                min={0}
                max={TIMER_STOPS.length}
                step={1}
                value={durationStop}
                aria-label="How long to sit"
                aria-valuetext={
                  prefs.untilBell
                    ? `Until the bell at ${bellLabel}`
                    : `${duration.value} ${duration.unit}`
                }
                onChange={(e) => {
                  const i = Number(e.target.value);
                  if (i === TIMER_STOPS.length) {
                    update({ untilBell: true });
                    return;
                  }
                  update({
                    timerMinutes: clampMinutes(
                      TIMER_STOPS[i] ?? prefs.timerMinutes,
                    ),
                    untilBell: false,
                  });
                }}
                className="room-range w-full"
                style={
                  {
                    '--range-fill': `${(durationStop / TIMER_STOPS.length) * 100}%`,
                  } as CSSProperties
                }
              />

              <p className="text-ink-2 text-sm">
                {prefs.untilBell
                  ? `You’ll finish with everyone else at ${bellLabel}.`
                  : `${duration.value} ${duration.unit}, ending on your own bell.`}
              </p>

              {/* Its own line and its own weight. This is the only control in
                  the product that makes two strangers finish at the same
                  moment, and as a fourth preset chip it read as a fourth
                  preset. */}
              <button
                type="button"
                onClick={() => update({ untilBell: true })}
                aria-pressed={prefs.untilBell}
                className={`rounded-control focus-visible:ring-ember focus-visible:ring-offset-paper flex min-h-14 w-full items-center justify-center border px-4 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                  prefs.untilBell
                    ? 'border-ember bg-ember-soft text-ember'
                    : 'border-ember/70 bg-ember-soft/50 text-ink hover:border-ember hover:bg-ember-soft'
                }`}
              >
                Sit together until{' '}
                <span className="ml-1 whitespace-nowrap font-normal tabular-nums">
                  {bellLabel}
                </span>
              </button>
            </div>
          )}

          {step === 'bell' && (
            <div className="flex gap-2">
              {(Object.keys(BELLS) as BellKind[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => {
                    update({ endBell: kind });
                    // Choosing a bell you cannot hear is guesswork, so
                    // selecting one plays it. It also warms the AudioContext
                    // inside a real gesture, so the scheduled bell is never the
                    // first thing the browser is asked to allow.
                    previewBell(kind);
                  }}
                  aria-pressed={prefs.endBell === kind}
                  className={`rounded-control focus-visible:ring-ember focus-visible:ring-offset-paper min-h-14 flex-1 border px-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                    prefs.endBell === kind
                      ? 'border-ember text-ember'
                      : 'border-rule text-ink-2 hover:border-ink-3'
                  }`}
                >
                  {BELLS[kind].label}
                </button>
              ))}
            </div>
          )}

          {step === 'sound' && (
            <SoundMixer soundMix={prefs.soundMix} onChange={onSound} />
          )}
        </div>
      </section>

      {/* The way forward, which the flow did not have. Sound has no finished
          state — silence is a real answer — so the last screen carries the
          start itself rather than a Next to somewhere that does. */}
      <div className="flex justify-center">
        {step === 'sound' ? (
          begin
        ) : (
          <button
            type="button"
            onClick={() => setStep(STEPS[index + 1] ?? 'sound')}
            className="border-ember text-ember hover:bg-ember rounded-action focus-visible:ring-ember focus-visible:ring-offset-paper min-h-12 border px-10 text-base transition-colors duration-300 hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
