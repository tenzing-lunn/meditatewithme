'use client';

import { useState, type ReactNode } from 'react';

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
 * What you settle before you sit — asked one thing at a time.
 *
 * WHY THIS IS A STACK AND NOT A PANEL
 * It used to be every control at once, above Begin, on the reasoning that
 * hiding them would mean everybody sat on the default. That reasoning was
 * right when there were three controls. There are now eleven, and the page it
 * produced was a settings screen with a candle on top of it — 2,280px tall on
 * a phone, with the one button that matters nearly three screens down. A
 * meditation site should not open with a mixing desk.
 *
 * So each question is asked on its own, and answering it folds it into a line
 * of plain text and opens the next. What you have already decided stays
 * visible and reversible; what you have not decided yet is the only thing
 * asking for attention.
 *
 * WHO WALKS IT
 * Anybody who has not answered before. Come back a second time and the whole
 * stack is already folded — three quiet lines and Begin — because the answers
 * are in localStorage and re-asking a question we already hold the answer to
 * would be theatre. Signing in does not skip anything; it carries the answers
 * to your other devices, which is the only thing an account is for here.
 */

const STEPS = ['duration', 'bell', 'sound'] as const;
type Step = (typeof STEPS)[number];

/** Set once the stack has been walked. UI progress, not a preference. */
const SETUP_KEY = 'mwm.settled';

function hasSettled(): boolean {
  try {
    return window.localStorage.getItem(SETUP_KEY) === '1';
  } catch {
    // Private mode, or storage disabled. Walking the questions again is a much
    // smaller harm than throwing on the way into a meditation.
    return false;
  }
}

function markSettled(): void {
  try {
    window.localStorage.setItem(SETUP_KEY, '1');
  } catch {
    // Nothing to do. The stack simply asks again next time.
  }
}

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
  disabled,
}: {
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  /** Runs inside the change event, because the audio graph needs a gesture. */
  onSound: (slug: TrackSlug | typeof MASTER_KEY, gain: number) => void;
  /** Server-corrected clock: the bell label must mean the same moment worldwide. */
  now: number;
  /**
   * The Begin button, rendered by the room but placed by the stack.
   *
   * The action belongs to Room, which owns what beginning means. Where it sits
   * belongs here, because "when does Begin appear" is the same question as
   * "how far through the stack are we".
   */
  begin: ReactNode;
  disabled?: boolean;
}) {
  // Only ever runs on the client — Room renders nothing until its first tick,
  // so there is no server pass to disagree with.
  const [settled] = useState(hasSettled);
  const [reached, setReached] = useState(() => (settled ? STEPS.length - 1 : 0));
  const [open, setOpen] = useState<Step | null>(() =>
    settled ? null : 'duration',
  );

  const duration = durationLabel(prefs.timerMinutes);
  const bellAt = nextSharedBellAt(now);
  const bellLabel = new Date(bellAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  /**
   * A question has been answered.
   *
   * At the frontier this opens the next one. Reopened later from a summary
   * line it simply closes, because somebody who came back to change the bell
   * does not want to be walked through the sound again.
   */
  function answered(step: Step) {
    const index = STEPS.indexOf(step);
    if (index < reached) {
      setOpen(null);
      return;
    }
    const next = STEPS[index + 1];
    setReached(index + 1 > reached ? index + 1 : reached);
    setOpen(next ?? null);
    if (!next) markSettled();
  }

  const soundSummary = (() => {
    const on = TRACKS.filter((t) => (prefs.soundMix[t.slug] ?? 0) > 0);
    if (on.length === 0) return 'In silence';
    return `With ${sentenceList(on.map((t) => t.label.toLowerCase()))} underneath`;
  })();

  const durationSummary = prefs.untilBell
    ? `Sitting until the bell at ${bellLabel}`
    : `Sitting for ${duration.value} ${duration.unit}`;

  const bellSummary = `Ending with a ${BELLS[prefs.endBell].label.toLowerCase()}`;

  // Begin appears with the last question, not after it. Sound has no finished
  // state — silence is a real answer — so waiting for one would strand people
  // at a mixer with nothing to press.
  const canBegin = settled || reached >= STEPS.length - 1;

  return (
    <div
      className={`flex w-full max-w-sm flex-col items-stretch ${
        disabled ? 'pointer-events-none opacity-40' : ''
      }`}
    >
      <div className="space-y-1">
        <Row
          step="duration"
          open={open}
          reached={reached}
          summary={durationSummary}
          onReopen={setOpen}
          question="How long?"
        >
          <div className="space-y-4">
            <div className="flex gap-2">
              {([1, 10, 30, 'bell'] as const).map((preset) => {
                const active =
                  preset === 'bell'
                    ? prefs.untilBell
                    : !prefs.untilBell && prefs.timerMinutes === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      update(
                        preset === 'bell'
                          ? { untilBell: true }
                          : { timerMinutes: preset, untilBell: false },
                      );
                      answered('duration');
                    }}
                    aria-pressed={active}
                    className={`flex-1 rounded-full border py-2.5 text-sm transition-colors ${
                      active
                        ? 'border-ember text-ember'
                        : 'border-rule text-ink-2 hover:border-ink-3'
                    }`}
                  >
                    {preset === 'bell' ? 'The bell' : `${preset} min`}
                  </button>
                );
              })}
            </div>

            {/* Thirteen stops, not sixty. The value is an INDEX into
                TIMER_STOPS — the jump from one minute to five is not a step any
                `step` attribute can describe — which is why it carries an
                aria-valuetext. */}
            <input
              type="range"
              min={0}
              max={TIMER_STOPS.length}
              step={1}
              value={
                prefs.untilBell
                  ? TIMER_STOPS.length
                  : timerStopIndex(prefs.timerMinutes)
              }
              aria-label="How long to sit"
              aria-valuetext={
                prefs.untilBell
                  ? `Until the bell at ${bellLabel}`
                  : `${duration.value} ${duration.unit}`
              }
              onChange={(e) => {
                const index = Number(e.target.value);
                if (index === TIMER_STOPS.length) {
                  update({ untilBell: true });
                  return;
                }
                update({
                  timerMinutes: clampMinutes(
                    TIMER_STOPS[index] ?? prefs.timerMinutes,
                  ),
                  untilBell: false,
                });
              }}
              // Dragging is exploring; letting go is deciding. Blur covers the
              // keyboard path, where no pointer is ever released.
              onPointerUp={() => answered('duration')}
              onBlur={() => answered('duration')}
              className="accent-ember w-full"
            />

            <p className="text-ink-3 text-sm">
              {prefs.untilBell
                ? `Everyone who chooses this ends together at ${bellLabel}.`
                : `${duration.value} ${duration.unit}, ending on your own bell.`}
            </p>
          </div>
        </Row>

        <Row
          step="bell"
          open={open}
          reached={reached}
          summary={bellSummary}
          onReopen={setOpen}
          question="How should it end?"
        >
          <div className="flex gap-2">
            {(Object.keys(BELLS) as BellKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  update({ endBell: kind });
                  // Choosing a bell you cannot hear is guesswork, so selecting
                  // one plays it. It also warms the AudioContext inside a real
                  // gesture, so the scheduled bell is never the first thing the
                  // browser is asked to allow.
                  previewBell(kind);
                  answered('bell');
                }}
                aria-pressed={prefs.endBell === kind}
                className={`flex-1 rounded-full border px-2 py-2.5 text-sm transition-colors ${
                  prefs.endBell === kind
                    ? 'border-ember text-ember'
                    : 'border-rule text-ink-2 hover:border-ink-3'
                }`}
              >
                {BELLS[kind].label}
              </button>
            ))}
          </div>
        </Row>

        <Row
          step="sound"
          open={open}
          reached={reached}
          summary={soundSummary}
          onReopen={setOpen}
          question="Anything underneath?"
        >
          <SoundMixer soundMix={prefs.soundMix} onChange={onSound} />
        </Row>
      </div>

      {canBegin && <div className="mt-10 flex justify-center">{begin}</div>}
    </div>
  );
}

/**
 * One question in the stack: open, or folded into a line you can go back to.
 *
 * A step above the frontier renders nothing at all rather than rendering
 * disabled. A greyed-out control still occupies the page and still asks to be
 * read, and the whole point here is that only one thing is being asked.
 */
function Row({
  step,
  open,
  reached,
  question,
  summary,
  onReopen,
  children,
}: {
  step: Step;
  open: Step | null;
  reached: number;
  question: string;
  summary: string;
  onReopen: (s: Step) => void;
  children: ReactNode;
}) {
  const index = STEPS.indexOf(step);
  if (index > reached) return null;

  if (open === step) {
    return (
      <section className="py-5">
        <h2 className="font-serif text-2xl">{question}</h2>
        <div className="mt-5">{children}</div>
      </section>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onReopen(step)}
      className="group border-rule/60 focus-visible:ring-ember focus-visible:ring-offset-paper flex w-full items-baseline justify-between gap-4 rounded-sm border-b py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <span className="text-ink-2 group-hover:text-ink text-[0.95rem] transition-colors">
        {summary}
      </span>
      <span className="text-ink-3 group-hover:text-ember shrink-0 text-xs transition-colors">
        change
      </span>
    </button>
  );
}
