'use client';

import Link from 'next/link';
import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { serverNow, syncClock } from '@/lib/clock';
import { nextHourStart } from '@/lib/session';
import { humanMinutes, summarise, type PracticeEntry } from '@/lib/practice';
import {
  TIMER_STOPS,
  clampMinutes,
  durationLabel,
  nextSharedBellAt,
  timerStopIndex,
} from '@/lib/timer';
import type { UserPreferences } from '@/lib/types';
import { BELLS, previewBell, type BellKind } from './audio';
import type { MASTER_KEY, TrackSlug } from './mix';
import Practice from './Practice';
import { FOCUS, QUIET } from './controls';
import { localTime } from '@/lib/format';
import { durationAnswer, settingsLine, soundAnswer } from './settingsLine';
import SoundMixer from './SoundMixer';
import { useCount } from './useCount';

/**
 * Home — where somebody signed in lands.
 *
 * THIS IS NOT THE ROOM, AND IT IS THE ONLY PLACE THAT IS ALLOWED NOT TO BE
 * context/ARCHITECTURE.md §16 says the page is one frame and does not scroll,
 * and that everything readable lives in the band above the flame. Those rules
 * are not being relaxed — they are rules about *the room*, and the room is a
 * photograph somebody is about to meditate inside. This is a different object.
 * A person deciding whether to sit, looking at what they have done and what
 * today's sitting will be, is doing something the one-thing-at-a-time
 * discipline was never designed for.
 *
 * So Home scrolls, has a masthead, and shows several things at once. Nothing
 * here licenses any of that inside the room, and the room imports nothing from
 * this file.
 *
 * WHAT PAYS FOR SKIPPING THE QUESTIONS
 * §16 argued against a "you have done this before" path because the three
 * screens are "the only moment the product has to ask a returning visitor
 * whether today is a ten-minute day". That concern is answered here rather than
 * dropped: the settings this sitting will use are printed directly under the
 * button that starts it, with `Change` beside them. The question is still asked
 * every single time. It is read instead of walked.
 *
 * The order of the page is the order of what somebody came for. Sitting is
 * first and largest; the record of having sat is underneath it; the world is
 * last, because it is the thing you look at when you are not sitting.
 *
 * ONE ORDER, TWO SHAPES
 * That order was written for a phone, where "underneath" and "last" are the
 * only places anything can go. On a laptop the same column left two-thirds of
 * the screen empty and pushed the practice log below the fold, so from `lg` up
 * the page stops being a column and becomes the frame it already fits inside:
 * a masthead, and under it two panes side by side that together are exactly one
 * viewport tall.
 *
 * The order survives the change, because on a wide screen reading order is
 * left-then-right, not top-then-bottom. Sitting is the left pane and is still
 * first and largest. The record and the world are the right pane, still after
 * it, now beside it as well — and visible without scrolling, which on the phone
 * they never were.
 *
 * Each pane scrolls itself (`lg:overflow-y-auto`) and the page does not. That
 * is what keeps the circle fixed while a long practice log moves next to it,
 * and it is the same instinct as the room: the thing you press should not slide
 * away while you are reading something else. It is not the room's rule, though
 * — this page still scrolls, it just does so in two places.
 */

export default function Home({
  prefs,
  update,
  onSound,
  onSit,
  entries,
  email,
  name,
  signOut,
  deleteAccount,
}: {
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  /** Runs inside the change event, because the audio graph needs a gesture. */
  onSound: (slug: TrackSlug | typeof MASTER_KEY, gain: number) => void;
  /** Starts a sitting. Must be called from a real click — see `Entry`. */
  onSit: () => void;
  entries: PracticeEntry[];
  email: string | undefined;
  /**
   * What they asked to be called, if they were ever asked.
   *
   * Undefined for anybody whose account predates the name question, which is
   * why the masthead below falls back rather than greeting a blank.
   */
  name: string | undefined;
  signOut: () => void;
  /** Removes the account and everything synced to it. See `AccountCard`. */
  deleteAccount: () => Promise<string | null>;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const now = useCorrectedClock();
  const { count, litCount } = useCount();

  const total = entries.length > 0 ? summarise(entries, now ?? Date.now()) : null;

  return (
    <main className="text-ink relative min-h-dvh lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      {/*
        One warm source, and nothing else.

        Home cannot be the photograph — it scrolls, and the picture is fixed —
        but it should not read as a different product either. A single soft
        ember wash where the candle would be is enough to carry the room across
        without pretending to be it.

        It follows the circle rather than the page. On a phone the circle is
        near the top of a column, so the wash hangs from the top edge; on a
        laptop it sits in the middle of the left pane, so the wash sits behind
        it. Both are the same light on the same object, which is why they are
        written as one element with two geometries rather than as two lights.
      */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[60vh] lg:hidden"
        style={{
          background:
            'radial-gradient(60% 100% at 50% 0%, rgba(224,160,87,0.13), rgba(19,21,24,0) 70%)',
        }}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col px-5 pt-6 pb-20 sm:px-8 lg:h-full lg:max-w-6xl lg:px-10 lg:pb-0">
        <header className="flex shrink-0 items-baseline justify-between gap-4">
          {/*
            The name, where it is worth something.

            Asking somebody what to call them and then never using it is the
            sort of question that makes a signup feel like data collection. This
            is the one page in the product that is addressed to a particular
            person — the room is addressed to whoever is in it — so it is the
            one place a greeting belongs.

            No time of day. `now` is null until the clock has synced, and a
            masthead that says "Meditate With Me" and then becomes "Good
            evening, Jonny" half a second later is a flicker on the first thing
            anybody reads. This is stable from the first frame.

            The site's own name has not gone anywhere: it is the document title,
            and the landing is the only screen that needs to introduce itself.
          */}
          <h1 className="font-display text-ink text-xl leading-none">
            {name ? `Hello, ${name}` : 'Meditate With Me'}
          </h1>
          <button
            type="button"
            onClick={signOut}
            className={QUIET}
          >
            Sign out
            {email && <span className="sr-only"> ({email})</span>}
          </button>
        </header>

        {/*
          The two panes.

          `min-h-0` is load-bearing and not decoration: a flex child defaults to
          `min-height: auto`, which refuses to shrink below its content, so
          without it a long practice log would push this row past the viewport
          and the panes' own `overflow-y-auto` would never engage — the whole
          page would scroll instead, which is the thing being fixed.
        */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-14">
          {/* ---- The sitting, which is what this page is for -------------- */}
          <section className="relative flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-12">
            {/* The desktop half of the wash — see the note at the top. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 hidden lg:block"
              style={{
                background:
                  'radial-gradient(50% 42% at 50% 44%, rgba(224,160,87,0.15), rgba(19,21,24,0) 72%)',
              }}
            />

            {/*
              `m-auto`, not `justify-center`. Centring a scroll container's
              content with `justify-center` clips the top of anything taller
              than the container — the overflow goes off the start edge where
              it cannot be scrolled back to — and opening the settings panel
              makes this taller than the container on a short laptop. Auto
              margins centre and give way.
            */}
            <div className="m-auto flex w-full flex-col items-center pt-14 pb-4 lg:py-12">
              {/* text-sm ink-2, not the text-xs ink-3 it was. This is the
                  shared fact — the one thing on the page that is about the
                  hour rather than about you — and it was set at the size of a
                  legal footnote under a text-6xl Sit. One rank up: still
                  secondary, no longer a footnote. `h-5` is the line-height of
                  text-sm, reserved so the circle does not jump when the clock
                  arrives. */}
              <p className="text-ink-2 h-5 text-sm tabular-nums">
                {now !== null &&
                  `Next candle at ${localTime(nextHourStart(now))}`}
              </p>

              {/*
                A circle, because the sitting is a circle.

                The room's timer is a ring and the people in the hour are dots
                on it. Making the thing that opens that a ring too means the
                button and what it becomes are recognisably the same object —
                press a circle, get a circle. A rectangle here would be a form
                control that happens to start a meditation.

                It grows once more at `lg`. On a phone the circle is large
                relative to its column and reads as the point of the screen; at
                the old 44 it did not, because the column around it had doubled.
                Same object, same share of the space it is in.
              */}
              <button
                type="button"
                onClick={onSit}
                className={`border-ember text-ember hover:bg-ember font-display mt-6 flex size-40 items-center justify-center rounded-full border text-4xl leading-none transition-colors duration-500 hover:text-white sm:size-44 sm:text-5xl lg:size-56 lg:text-6xl ${FOCUS}`}
              >
                Sit
              </button>

              {/*
                THE ANSWER TO THE QUESTION THE FLOW USED TO ASK.

                This line is what makes it defensible to skip the three screens:
                it says exactly what pressing the circle above will do, in the
                same words the flow used, and `Change` is right beside it.
                Somebody who wants a different length today can see that they
                are about to get ten minutes before they get them.

                The landing says the same line under `Let’s begin.` since
                9 September 2026, from the same helper — see `settingsLine.ts`.
              */}
              <div className="mt-7 flex flex-col items-center gap-3 lg:mt-8">
                <p className="text-ink-2 max-w-[30ch] text-center text-sm lg:text-base">
                  {settingsLine(prefs, now)}
                </p>

                {/*
                  BOUNDED, BECAUSE IT HAS TO LOOK PRESSABLE.

                  This was bare `text-ink-3` type, which put a dim grey word
                  directly beneath a dim grey sentence — so it read as a second
                  line of the caption rather than the control that opens the
                  settings. Quiet is the house style; invisible is a bug. It was
                  the first of five to be found and `QUIET` is where the answer
                  now lives — see `controls.ts`.

                  The chevron is local to this one: it says the press expands
                  something in place, which is what separates it from a link to
                  another screen.
                */}
                <button
                  type="button"
                  onClick={() => setSettingsOpen((v) => !v)}
                  aria-expanded={settingsOpen}
                  className={QUIET}
                >
                  {settingsOpen ? 'Done changing' : 'Change'}
                  <svg
                    viewBox="0 0 24 24"
                    className={`size-3.5 transition-transform duration-300 ${
                      settingsOpen ? 'rotate-180' : ''
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
                </button>
              </div>

              {settingsOpen && (
                <Settings
                  prefs={prefs}
                  update={update}
                  onSound={onSound}
                  now={now}
                />
              )}
            </div>

            {/*
              The world, at the foot of this pane and only here.

              It is third in the column on a phone and it stays third on a
              laptop — but third in a side pane meant it opened half off the
              bottom edge, which reads as a layout that ran out of room rather
              than as something below the fold. Down here it is the last thing
              in reading order either way, it is whole, and it balances a pane
              that otherwise has one circle floating in it.

              No `mt-auto` here — the block above already has `m-auto`, and its
              bottom auto margin is what pins this to the foot. Adding a third
              auto margin would give the slack three ways to split and lift the
              circle off centre, which is exactly what it did.
            */}
            <div className="hidden w-full max-w-md shrink-0 self-center lg:block">
              <WorldLink count={count} litCount={litCount} />
            </div>
          </section>

          {/*
            Everything that is not the sitting.

            One pane, in the order it was already in. The rule between them is
            vertical rather than horizontal at this width, and it is the only
            new furniture the wide layout adds — the cards keep their own rules
            and labels, so nothing here is a second design language.

            Fixed width rather than a fraction, because the practice grid is
            thirteen fixed columns and the sittings list is short lines: past
            about 26rem the log is mostly empty space between a date and a
            number, and the sitting loses width it can use.
          */}
          <aside className="lg:border-rule flex flex-col pb-20 lg:min-h-0 lg:w-[23rem] lg:shrink-0 lg:overflow-y-auto lg:border-l lg:py-12 lg:pl-14 xl:w-[26rem]">
            {/* ---- What you have already done ---------------------------- */}
            {total !== null && (
              <Card title="Your practice">
                <div className="flex justify-center">
                  <Practice entries={entries} now={now ?? Date.now()} />
                </div>
              </Card>
            )}

            <Card title="Recent sittings">
              <RecentSittings entries={entries} />
            </Card>

            {/* ---- The world, in the column only — see the pane above ----- */}
            <div className="lg:hidden">
              <Card title="The world">
                <WorldLink count={count} litCount={litCount} />
              </Card>
            </div>

            {/* ---- The way out, last on the page in both layouts ---------- */}
            <Card title="Your account">
              <AccountCard
                email={email}
                sittings={entries.length}
                deleteAccount={deleteAccount}
              />
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}

/**
 * The corrected clock, at a pace a dashboard needs.
 *
 * The room ticks four times a second because it is running a timer against it.
 * Nothing here changes faster than the hour, so this ticks every thirty
 * seconds — and it is still `serverNow()` rather than `Date.now()`, because
 * "next candle at" has to name the same moment on a laptop whose clock is three
 * minutes fast. That is the same reason §6.2 gives, and it does not stop
 * applying because the screen is quieter.
 *
 * Null until the first tick, so nothing renders a time during SSR and there is
 * no hydration mismatch.
 */
function useCorrectedClock(): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let timer: number | undefined;

    const tick = () => setNow(serverNow());

    void syncClock().then(() => {
      tick();
      timer = window.setInterval(tick, 30_000);
    });

    const onFocus = () => void syncClock().then(tick);
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return now;
}

/**
 * A section of the page.
 *
 * A rule and a small label rather than a bordered box. Home has four blocks on
 * it and four boxes would read as a control panel — which is the failure mode
 * this whole page is closest to, and the reason the room is built the way it
 * is. A line and a word is enough to say "a different thing starts here".
 *
 * The first one loses its rule at `lg`. In the column it divides the cards from
 * the sitting above them and is doing work; in the side pane the pane's own
 * left border already says where this begins, and a second line an inch under
 * the masthead would just be a line.
 */
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-rule mt-12 border-t pt-5 lg:mt-10 lg:first:mt-0 lg:first:border-t-0 lg:first:pt-0">
      <h2 className="text-ink-3 mb-5 text-xs tracking-[0.14em] uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The last few sittings, as a list.
 *
 * The room has never had room for this — the band is 272px on a laptop and a
 * list of anything would take all of it. It is the one thing Home can show that
 * the room genuinely could not.
 *
 * Deliberately not a scoreboard, for the same reason `Practice` is not: no
 * targets, nothing missing, nothing red. A sitting that was ended early is
 * marked, quietly, because "20 minutes" and "20 minutes, ended early" are
 * different facts and the log would be flattering you if it hid the second.
 */
function RecentSittings({ entries }: { entries: PracticeEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-ink-3 text-sm">
        Nothing here yet. Your first sitting will be at the top.
      </p>
    );
  }

  const recent = entries.slice(0, 8);

  return (
    <>
      <ul className="flex flex-col">
        {recent.map((entry) => (
          <li
            key={entry.id}
            className="border-rule/60 flex items-baseline justify-between gap-4 border-b py-2.5 last:border-b-0"
          >
            <span className="text-ink-2 text-sm">
              {dayLabel(entry.startedAt)}
              <span className="text-ink-3 tabular-nums">
                {' · '}
                {localTime(entry.startedAt)}
              </span>
            </span>
            <span className="text-ink shrink-0 text-sm tabular-nums">
              {humanMinutes(entry.minutes)}
              {!entry.completed && (
                <span className="text-ink-3 text-xs"> · ended early</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {entries.length > recent.length && (
        <p className="text-ink-3 mt-4 text-xs tabular-nums">
          and {entries.length - recent.length} more
        </p>
      )}
    </>
  );
}

/**
 * "Today", "Yesterday", or a date.
 *
 * Calendar fields, not millisecond arithmetic — the same rule `lib/practice.ts`
 * follows and for the same reason. Subtracting 86,400,000 to get "yesterday"
 * lands on the same local day twice a year in DST countries, and a log that
 * says "Today" twice is a small bug that appears once in October and cannot be
 * reproduced in April.
 */
function dayLabel(atMs: number): string {
  const d = new Date(atMs);
  const today = new Date();
  const yesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1,
  );

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';

  return d.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
  });
}

type Section = 'duration' | 'bell' | 'sound' | 'room';

/**
 * The four questions, one open at a time.
 *
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
 * the line above the circle uses, so the panel reads as that line, unfolded.
 *
 * Everything still writes straight through `update`, which persists to
 * localStorage and syncs to the account. There is no save button because there
 * is nothing to save: the line above the circle changes as you change it, and
 * that line is the confirmation.
 */
function Settings({
  prefs,
  update,
  onSound,
  now,
}: {
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  onSound: (slug: TrackSlug | typeof MASTER_KEY, gain: number) => void;
  now: number | null;
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
  const toggle = (s: Section) => setOpen((v) => (v === s ? null : s));

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
            aria-valuetext. Identical behaviour to the flow's slider on purpose:
            two controls for one preference must not disagree about what the
            far right of the track means. */}
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
              at the same moment. It gets its own line here for the same reason
              it gets one in the flow. */}
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
                // each other for a minute.
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
        <SoundMixer soundMix={prefs.soundMix} onChange={onSound} />
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
 * controls for it when opened. The answer is the same words the line above
 * the circle uses, so reading the four closed rows is reading that line
 * unfolded.
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
        <span className="text-ink-3">{label}</span>
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

/**
 * The way out to the globe.
 *
 * Its own component because the layout puts it in two different places — the
 * foot of the sitting pane on a laptop, the last card in the column on a phone
 * — and exactly one of them is ever rendered. Two copies of this markup would
 * be two things to keep in step for no benefit.
 */
function WorldLink({
  count,
  litCount,
}: {
  count: number | null;
  litCount: number | null;
}) {
  return (
    <Link
      href="/world"
      className={`group border-rule hover:border-ember/60 rounded-control flex items-center justify-between gap-4 border p-4 transition-colors ${FOCUS}`}
    >
      <span className="flex flex-col gap-1 text-left">
        <span className="text-ink group-hover:text-ember text-sm transition-colors">
          See where the candles are
        </span>
        {/* Absent rather than zero when the count is unavailable. A meditation
            site does not invent company, and it does not report an empty earth
            it has not actually looked at. */}
        <span className="text-ink-2 text-sm tabular-nums">
          {litCount === null
            ? 'The earth, and this hour on it'
            : litCount === 0
              ? 'No candles lit yet this hour'
              : `${litCount} lit this hour${
                  count !== null ? ` · ${count} sitting now` : ''
                }`}
        </span>
      </span>
      <span
        aria-hidden
        className="text-ink-3 group-hover:text-ember shrink-0 transition-colors"
      >
        →
      </span>
    </Link>
  );
}

/**
 * The account, and the way out of it.
 *
 * WHY THIS EXISTS
 * Somebody who can make an account in two taps should not have to write an
 * email to leave. It is also required of anything that reaches the App Store —
 * guideline 5.1.1(v): an app offering account creation must offer account
 * deletion inside the app, not a link to a support address — and it is the
 * first thing the privacy notice in `plans/privacy-data-inventory.md` will have
 * to point at when somebody asks how to exercise erasure. Cheap now, and it
 * stops being cheap once there is a paying tier hanging off the same row.
 *
 * WHERE IT IS
 * Last on the page, under the practice log, in both layouts. That is where it
 * belongs rather than where it is hidden: the log is the thing the account is
 * actually holding, so the control that removes it reads as the end of that
 * section rather than as an unrelated danger zone. It is deliberately not near
 * `Sign out` in the masthead — those two words sit close enough in meaning that
 * putting them close together in space is asking for the wrong one.
 *
 * NO RED, ON PURPOSE
 * There is no danger colour in this palette and this is not the change that
 * introduces one. The hierarchy does the work instead: `Keep it` takes the
 * ember treatment the rest of the product uses for "yes, this one", and the
 * destructive control is the plain bounded one beside it. The safe choice being
 * the emphasised one is the right way round for a confirmation, and it means
 * the panel needs no colour it does not already own.
 *
 * WHAT THE COPY PROMISES, AND WHY IT IS EXACT
 * Every noun in the confirmation is something the cascade actually removes —
 * see `app/api/account/route.ts`. The line about the log staying on this device
 * is there because it is true and would otherwise be a surprise: the account
 * holds a copy, this browser holds the original, and destroying data on
 * somebody's own machine is not what they asked for when they asked to close an
 * account. Saying so is also the only honest way to describe what happens next,
 * since they will land back on the landing page with their streak intact.
 */
function AccountCard({
  email,
  sittings,
  deleteAccount,
}: {
  email: string | undefined;
  sittings: number;
  deleteAccount: () => Promise<string | null>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-ink-3 text-sm break-words">
        {email ?? 'Signed in.'}
      </p>

      {!confirming && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          className={QUIET}
        >
          Delete account
        </button>
      )}

      {confirming && (
        <div className="border-rule w-full rounded-control border p-4">
          <p className="text-ink text-sm leading-relaxed">
            This removes your account and everything it holds: your email
            address, your name, your settings, and
            {sittings === 1
              ? ' the one sitting '
              : ` the ${sittings} sittings `}
            synced to it. It cannot be undone.
          </p>

          <p className="text-ink-3 mt-3 text-xs leading-relaxed">
            Your practice log stays on this device — closing the account only
            removes the copy we hold.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {/* Ember, because keeping the account is the safe answer and the
                emphasis belongs on the safe answer. */}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null);
                setConfirming(false);
              }}
              className={`border-ember bg-ember-soft text-ember rounded-control min-h-11 flex-1 border px-4 text-sm transition-colors disabled:opacity-50 ${FOCUS}`}
            >
              Keep it
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const message = await deleteAccount();
                // No success branch, and no `setBusy(false)` on the way out:
                // `onAuthStateChange` fires and this whole page unmounts. The
                // only reason to come back here is to report a failure.
                if (message) {
                  setError(message);
                  setBusy(false);
                }
              }}
              className={`border-rule text-ink-2 hover:border-ink-3 hover:text-ink rounded-control min-h-11 flex-1 border px-4 text-sm transition-colors disabled:opacity-50 ${FOCUS}`}
            >
              {busy ? 'Deleting' : 'Delete my account'}
            </button>
          </div>

          {error && (
            <p role="alert" className="text-ink-2 mt-3 text-xs leading-relaxed">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

