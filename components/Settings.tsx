'use client';

import { useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { localTime } from '@/lib/format';
import {
  TIMER_STOPS,
  clampMinutes,
  durationLabel,
  nextSharedBellAt,
  timerStopIndex,
} from '@/lib/timer';
import type { UserPreferences } from '@/lib/types';
import { BELLS, previewBell, type BellKind } from './audio';
import { FOCUS, QUIET } from './controls';
import { TRACKS, type MASTER_KEY, type TrackSlug } from './mix';
import { durationAnswer, soundAnswer } from './settingsLine';
import SoundMixer, { BedToggles } from './SoundMixer';

/**
 * The four questions, one open at a time — on Home under `Sit`, and in the
 * room under `Let’s begin.`, behind the same word `Change`.
 *
 * ONE COMPONENT, BECAUSE THERE IS ONE SET OF PREFERENCES
 * Until 9 September 2026 there were two: this panel on Home, and a flow of
 * three screens in the room (`SessionSetup.tsx`, 452 lines) with `Next`
 * between them and `Start` at the end. Both edited `timerMinutes`,
 * `untilBell`, `endBell` and `soundMix`; they shared the `lib/` helpers and
 * nothing else, so every fix was made twice and the sound answer was a
 * different object on each surface. Two behaviours for one preference is
 * the definition of redundant. `plans/flow-audit.md`, item D.
 *
 * The flow is gone and this is what `Change` opens on both surfaces. The bell
 * stopped being a screen of its own without anybody having to argue it: it is
 * a row, the way it already was here. The room row — `Show the room` — reaches
 * guests before a sitting for the first time this way; it had been on the
 * ending only.
 *
 * WHY ROWS AND NOT EVERY CONTROL AT ONCE
 * This was every control at once — slider, the shared-bell button, three
 * bells, five play buttons, six faders and the room switch, seventeen in one
 * disclosure — on the argument that there is no door here, so the flow's
 * one-thing-at-a-time reason did not apply. That was fair about why it was one
 * panel and silent about why it was seventeen controls: somebody who came to
 * change the length still had to read past the mixer to find out they had.
 *
 * Now `Change` opens four rows, each carrying its current answer in words, and
 * a row opens only its own controls. The person who wants ten minutes instead
 * of twenty taps one row and moves one slider; the mixer exists only for the
 * person who asked for it. The answers on the closed rows are the same words
 * the line above the circle — or under the word — uses, so the panel reads as
 * that line, unfolded.
 *
 * Everything still writes straight through `update`, which persists to
 * localStorage and syncs to the account. There is no save button because there
 * is nothing to save: the line changes as you change it, and that line is the
 * confirmation. In the room the way out is `Done changing`, the same control
 * that opened it, and then the word.
 *
 * WHAT THE ROOM ROW IS ALLOWED TO HEAR
 * Home builds the audio graph audibly, in the first gesture that needs it
 * (`Entry.setSound`). The room builds it silently when `Change` is pressed —
 * `openSetup` calls `mix.ensure({ silent: true })`, master at zero — because
 * `Change` is not where anybody agreed to hear rain. `onSoundOpen` is how the
 * room finds out the Sound row has been opened, and it answers with
 * `mix.unmute()`: the auditions need it, and anyone who is going to say No is
 * looking at the switch that says so. Only that row. The bells audition
 * through `previewBell`, which strikes the context directly and never passes
 * through the mix master, so opening `How it ends` was always going to be
 * audible on select and never going to be audible otherwise. Nothing from the
 * beds until the sound controls are on screen — which is the rule
 * `CLAUDE.md` gives whoever opens the preview with speakers on.
 */

type Section = 'duration' | 'bell' | 'sound' | 'room';

export default function Settings({
  prefs,
  update,
  onSound,
  now,
  onSoundOpen,
}: {
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  /** Runs inside the change event, because the audio graph needs a gesture. */
  onSound: (slug: TrackSlug | typeof MASTER_KEY, gain: number) => void;
  /**
   * Server-corrected clock, so the bell label means the same moment
   * worldwide. Null on Home until its first tick; a number in the room, which
   * renders nothing until the clock has answered.
   */
  now: number | null;
  /** The Sound row has just been opened. The room raises the master here. */
  onSoundOpen?: () => void;
}) {
  const duration = durationLabel(prefs.timerMinutes);
  const bellAt = now === null ? null : nextSharedBellAt(now);
  const bellLabel = bellAt === null ? '' : localTime(bellAt);

  const durationStop = prefs.untilBell
    ? TIMER_STOPS.length
    : timerStopIndex(prefs.timerMinutes);

  // Nothing open until a row is chosen: the panel's first job is to say what
  // the answers are, and four closed rows do that in four lines.
  const [open, setOpen] = useState<Section | null>(null);
  const toggle = (s: Section) => {
    const next = open === s ? null : s;
    // Inside the click rather than in an effect, and before the state moves.
    // Not because a gain needs a gesture — it does not — but so the master
    // is up by the time the chips render, rather than a frame after.
    if (next === 'sound') onSoundOpen?.();
    setOpen(next);
  };

  /**
   * Whether the Sound row's switch is on.
   *
   * Its own state rather than `TRACKS.some(up)` read live, and the difference
   * matters exactly once: pulling every fader down by hand would otherwise flip
   * the switch and pull the mixer out from under the fingers doing it. The
   * derivation is right for the *initial* value and wrong as a permanent
   * identity, so it is used for the first and not the second.
   */
  const [noise, setNoise] = useState(() =>
    TRACKS.some((t) => (prefs.soundMix[t.slug] ?? 0) > 0),
  );

  /**
   * The mix as it was when the switch was last turned off.
   *
   * Saying no silences the beds for real — the levels in preferences are the
   * only thing the graph reads, so a mixer that is merely hidden would still be
   * playing — and this is what makes saying no again reversible while the
   * panel is open. It does not outlive the panel: close it with the switch off
   * and the mix is genuinely silent, which is what was chosen, and the next
   * `yes` opens on five silent faders exactly as a first visit does.
   */
  const beforeSilence = useRef<Record<string, number>>({});

  /** The faders, shown only when asked for. Closed again on every visit. */
  const [levelsOpen, setLevelsOpen] = useState(false);

  const toggleNoise = () => {
    if (noise) {
      const kept: Record<string, number> = {};
      const silent: Record<string, number> = { ...prefs.soundMix };
      for (const track of TRACKS) {
        const level = prefs.soundMix[track.slug] ?? 0;
        if (level > 0) kept[track.slug] = level;
        silent[track.slug] = 0;
      }
      beforeSilence.current = kept;
      // `update` rather than five calls to `onSound`, which spreads the
      // preferences its own closure captured — five of those in one handler
      // and only the last survives. The graph does not need a gesture here
      // either way: in the room `openSetup` built it before this panel could
      // be reached, and on Home nothing here plays until a chip is pressed,
      // which goes through `onSound` and builds it then.
      update({ soundMix: silent });
    } else {
      update({ soundMix: { ...prefs.soundMix, ...beforeSilence.current } });
    }
    setNoise(!noise);
  };

  const sound = soundAnswer(prefs);

  return (
    <div className="border-rule mt-8 w-full max-w-md border-t">
      <Row
        label="How long"
        answer={durationAnswer(prefs, now)}
        open={open === 'duration'}
        onToggle={() => toggle('duration')}
      >
        <p aria-hidden className="font-display text-ember text-3xl leading-none">
          {prefs.untilBell ? (
            <>
              until <span className="tabular-nums">{bellLabel || '—'}</span>
            </>
          ) : (
            <>
              {duration.value}{' '}
              <span className="text-ink-2 text-xl">{duration.unit}</span>
            </>
          )}
        </p>

        {/* Twelve stops, not sixty, and the value is an INDEX into
            TIMER_STOPS — the jump from one minute to five is not a step any
            `step` attribute can describe, which is why it carries an
            aria-valuetext. The last stop past the end is the shared bell, so
            dragging to the far right lands on sitting together. */}
        <input
          type="range"
          min={0}
          max={TIMER_STOPS.length}
          step={1}
          value={durationStop}
          aria-label="How long to sit"
          aria-valuetext={
            prefs.untilBell
              ? `Until the bell${bellLabel ? ` at ${bellLabel}` : ''}`
              : `${duration.value} ${duration.unit}`
          }
          onChange={(e) => {
            const i = Number(e.target.value);
            if (i === TIMER_STOPS.length) {
              update({ untilBell: true });
              return;
            }
            update({
              timerMinutes: clampMinutes(TIMER_STOPS[i] ?? prefs.timerMinutes),
              untilBell: false,
            });
          }}
          className="room-range mt-4 w-full"
          style={
            {
              '--range-fill': `${(durationStop / TIMER_STOPS.length) * 100}%`,
            } as CSSProperties
          }
        />

        <button
          type="button"
          onClick={() => update({ untilBell: !prefs.untilBell })}
          aria-pressed={prefs.untilBell}
          className={`rounded-control mt-4 flex min-h-12 w-full items-center justify-center border px-4 text-sm transition-colors ${FOCUS} ${
            prefs.untilBell
              ? 'border-ember bg-ember-soft text-ember'
              : 'border-ember/70 bg-ember-soft/50 text-ink hover:border-ember hover:bg-ember-soft'
          }`}
        >
          {/* The only control in the product that makes two strangers finish
              at the same moment. It gets its own line and its own weight; as
              a fourth preset chip it once read as a fourth preset.

              A toggle. Pressing it again returns to the slider's stop —
              `timerMinutes` was never changed, so that is still where you
              were. */}
          Sit together until{' '}
          <span className="ml-1 whitespace-nowrap tabular-nums">
            {bellLabel || 'the next bell'}
          </span>
        </button>
      </Row>

      <Row
        label="How it ends"
        answer={BELLS[prefs.endBell].label}
        open={open === 'bell'}
        onToggle={() => toggle('bell')}
      >
        <div className="flex gap-2">
          {(Object.keys(BELLS) as BellKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                update({ endBell: kind });
                // Choosing a bell you cannot hear is guesswork, so selecting
                // one plays it — at a third of the real tail, because
                // auditioning three should not leave three bowls ringing over
                // each other for a minute. It also warms the AudioContext
                // inside a real gesture, so the scheduled bell is never the
                // first thing the browser is asked to allow.
                previewBell(kind);
              }}
              aria-pressed={prefs.endBell === kind}
              className={`rounded-control min-h-12 flex-1 border px-2 text-sm transition-colors ${FOCUS} ${
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
        label="Sound"
        answer={sound.charAt(0).toUpperCase() + sound.slice(1)}
        open={open === 'sound'}
        onToggle={() => toggle('sound')}
      >
        <div className="space-y-6">
          {/* A switch, because this is the one question with two answers and
              no middle — and a switch says which one is showing without a
              word being read. Home used to open the full mixer here, eleven
              controls, which asked somebody who wanted to sit in silence to
              understand a mixer before they could decline one. The flow had
              the better pattern and this row takes it: the switch, then which
              sounds, then how loud, each one tap further in. */}
          <button
            type="button"
            role="switch"
            aria-checked={noise}
            aria-label="Sound"
            onClick={toggleNoise}
            className={`rounded-control group flex min-h-11 items-center gap-3 self-start ${FOCUS}`}
          >
            <span
              aria-hidden
              className={`flex h-8 w-14 shrink-0 items-center rounded-full border p-1 transition-colors ${
                noise
                  ? 'border-ember bg-ember-soft'
                  : 'border-rule group-hover:border-ink-3'
              }`}
            >
              <span
                className={`size-5 rounded-full transition-[transform,background-color] duration-300 ease-out ${
                  noise
                    ? 'bg-ember translate-x-6'
                    : 'bg-ink-3 group-hover:bg-ink-2 translate-x-0'
                }`}
              />
            </span>
            <span
              aria-hidden
              className={`text-base transition-colors ${
                noise ? 'text-ember' : 'text-ink-2'
              }`}
            >
              {noise ? 'Yes' : 'No'}
            </span>
          </button>

          {/* Unmounted rather than hidden. A collapsed mixer is still five
              sliders in the tab order, and in the room the band measures what
              is actually there — leaving them in would shrink everything to
              make room for controls nobody asked for.

              Five chips, then the faders only on request. Which sounds is the
              question; how loud is a refinement, and it is one tap away. */}
          {noise && (
            <div className="space-y-4">
              <BedToggles soundMix={prefs.soundMix} onChange={onSound} />
              <button
                type="button"
                onClick={() => setLevelsOpen((v) => !v)}
                aria-expanded={levelsOpen}
                className={QUIET}
              >
                {levelsOpen ? 'Done adjusting' : 'Adjust levels'}
              </button>
              {levelsOpen && (
                <SoundMixer soundMix={prefs.soundMix} onChange={onSound} />
              )}
            </div>
          )}
        </div>
      </Row>

      <Row
        label="The room"
        answer={prefs.showCount ? 'Shown' : 'Hidden'}
        open={open === 'room'}
        onToggle={() => toggle('room')}
      >
        <button
          type="button"
          onClick={() => update({ showCount: !prefs.showCount })}
          aria-pressed={prefs.showCount}
          className={`border-rule text-ink-2 hover:border-ink-3 hover:text-ink rounded-control flex min-h-12 w-full items-center justify-between gap-4 border px-4 text-sm transition-colors ${FOCUS}`}
        >
          {/* "The room", the same words the ending uses for the same switch.
              This said "Show who else is here", which was the one place the
              preference had a different name. */}
          <span>Show the room</span>
          <span
            className={prefs.showCount ? 'text-ember' : 'text-ink-3'}
            aria-hidden
          >
            {prefs.showCount ? 'On' : 'Off'}
          </span>
        </button>
      </Row>
    </div>
  );
}

/**
 * One question on the settings panel: its name, its current answer, and the
 * controls for it when opened. The answer is the same words the settings line
 * uses, so reading the four closed rows is reading that line unfolded.
 *
 * The label is `ink-2`, not the `ink-3` it was while this lived on Home
 * alone. In the room these rows sit in the lower half of the frame with the
 * band at full height, and on `open` the photograph there is bright enough
 * that `ink-3` measured 4.00 on the flow's folded rows — under AA for text
 * this small. One component has to clear its worse background, and the
 * hierarchy survives: the label is still a rank under the answer. The chevron
 * stays `ink-3`; it is an icon, and 4.00 clears the 3:1 a boundary owes.
 */
function Row({
  label,
  answer,
  open,
  onToggle,
  children,
}: {
  label: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-rule border-b">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`rounded-control flex min-h-14 w-full items-center justify-between gap-4 text-left text-sm ${FOCUS}`}
      >
        <span className="text-ink-2">{label}</span>
        <span className="flex items-center gap-3">
          <span className={open ? 'text-ember' : 'text-ink'}>{answer}</span>
          <svg
            viewBox="0 0 24 24"
            className={`text-ink-3 size-3.5 transition-transform duration-300 ${
              open ? 'rotate-180' : ''
            }`}
            fill="none"
            aria-hidden
          >
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {open && <div className="pt-1 pb-7">{children}</div>}
    </div>
  );
}
