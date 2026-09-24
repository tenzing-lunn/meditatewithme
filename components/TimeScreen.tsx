'use client';

import { joinStops } from '@/lib/dial';
import { localTime } from '@/lib/format';
import { TIMER_STOPS, clampMinutes, durationLabel, nextSharedBellAt } from '@/lib/timer';
import type { UserPreferences } from '@/lib/types';
import Candle from './Candle';
import Screen from './Screen';
import TimerDial from './TimerDial';

interface TimeProps {
  current: boolean;
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  now: number | null;
  onBack: () => void;
  onNext: () => void;
  step?: number;
  steps?: number;
}

const SENTENCE =
  'font-display text-sentence font-bold leading-[1.1] text-balance text-room-ink sm:text-sentence-sm lg:text-sentence-lg';

/**
 * "How long will you sit?"
 *
 * Two answers under one name, because the two doors ask different things.
 * By yourself, it is a sentence and a candle whose height is the length,
 * with a light for everyone else sitting now (`CandleTime`). With others, it
 * is a sentence about the sitting you are joining, with a timer dial that
 * turns the length inside it (`JoinTime`). Settings on Home has its own
 * slider (`SettingsDrawer`).
 */
export default function TimeScreen({
  count,
  ...props
}: TimeProps & {
  /** People present now, you among them. Null when unknown. */
  count: number | null;
}) {
  return props.prefs.showCount ? (
    <JoinTime {...props} count={count} />
  ) : (
    <CandleTime {...props} count={count} />
  );
}

/**
 * By yourself: your length, and the feeling that you are not the only one.
 *
 * *You're sitting for 10 minutes.* over *11 others are here right now.
 * They'll come and go; your time is your own.* — and beside it on
 * a laptop, under it on a phone, the candle that sets the length. Nobody
 * joins anybody here, so the length is chosen freely and the people are
 * only company: a count and a light each, no names and no places. The count
 * is everyone with the page open, you among them, so the number said is one
 * less; with nobody else there, the line is about the ones who will come.
 */
function CandleTime({
  current,
  prefs,
  update,
  count,
  onBack,
  onNext,
  step,
  steps,
}: TimeProps & { count: number | null }) {
  const minutes = clampMinutes(prefs.timerMinutes);
  const duration = durationLabel(minutes);
  const others = count === null ? 0 : Math.max(0, count - 1);

  return (
    <Screen
      current={current}
      title={
        <>
          You’re sitting for{' '}
          <span className="tabular-nums">
            {duration.value} {duration.unit}
          </span>
          .
        </>
      }
      lede={
        others >= 1 ? (
          <>
            <span
              aria-hidden
              className="live-dot mr-2 mb-0.5 inline-block size-2 rounded-full bg-glow align-middle"
            />
            <span className="tabular-nums">{others}</span>{' '}
            {others === 1 ? 'other person is' : 'others are'} here right now.
            They’ll come and go; your time is your own.
          </>
        ) : (
          <>Others will come and go while you sit; your time is your own.</>
        )
      }
      titleClassName={SENTENCE}
      onBack={onBack}
      onNext={onNext}
      split="md:grid-cols-[minmax(0,1fr)_18rem] lg:grid-cols-[minmax(0,1fr)_22rem]"
      middle
      step={step}
      steps={steps}
      room
    >
      <Candle
        minutes={minutes}
        others={others}
        label="How long to sit"
        valueText={`${duration.value} ${duration.unit}`}
        onChange={(m) => update({ timerMinutes: m, untilBell: false })}
      />
    </Screen>
  );
}

/**
 * With others: the sentence is the screen, and the dial turns it.
 *
 * *You're sitting for 10 minutes with 11 people.* — or *until 10:55*, when
 * the dial is on the bell. The count is everyone with the page open, you
 * among them, so the number said is one less; below one it is not a number
 * at all but *with anyone who joins*, which is true whoever arrives. No
 * names: a name is shown to others only while its owner is sitting with
 * them, and somebody reading this has not sat down yet.
 *
 * The dial turns through every length with the shared bell placed where it
 * falls in time (`joinStops`), so a dial twelve minutes before the bell goes
 * 1, 5, 10, the bell, 15. On a laptop the sentence takes the width and the
 * dial sits beside it; on a phone the dial is under the sentence.
 */
function JoinTime({
  current,
  prefs,
  update,
  now,
  count,
  onBack,
  onNext,
  step,
  steps,
}: TimeProps & { count: number | null }) {
  const bellAt = now === null ? null : nextSharedBellAt(now);
  const bellLabel = bellAt === null ? null : localTime(bellAt);
  const minutesToBell =
    bellAt === null || now === null ? null : Math.ceil((bellAt - now) / 60_000);
  const stops = joinStops(TIMER_STOPS, minutesToBell);
  const bellIndex = stops.findIndex((s) => s.bell);
  const minutes = clampMinutes(prefs.timerMinutes);
  const index = prefs.untilBell
    ? bellIndex
    : Math.max(0, stops.findIndex((s) => !s.bell && s.minutes === minutes));
  const duration = durationLabel(minutes);
  const others = count === null ? 0 : count - 1;

  const time = prefs.untilBell ? (
    <>
      until <span className="tabular-nums">{bellLabel ?? 'the bell'}</span>
    </>
  ) : (
    <>
      for{' '}
      <span className="tabular-nums">
        {duration.value} {duration.unit}
      </span>
    </>
  );

  return (
    <Screen
      current={current}
      title={
        others >= 1 ? (
          <>
            You’re sitting {time} with{' '}
            <span className="tabular-nums">
              {others} {others === 1 ? 'person' : 'people'}
            </span>
            .
          </>
        ) : (
          <>You’re sitting {time}, with anyone who joins.</>
        )
      }
      titleClassName={SENTENCE}
      onBack={onBack}
      onNext={onNext}
      split="md:grid-cols-[minmax(0,1fr)_16rem] lg:grid-cols-[minmax(0,1fr)_19rem]"
      middle
      step={step}
      steps={steps}
      room
    >
      <div className="w-full max-w-60 md:max-w-none">
        <TimerDial
          count={stops.length}
          index={index}
          marked={bellIndex}
          markLabel="bell"
          label="How long to sit"
          valueText={
            prefs.untilBell
              ? `Until the bell${bellLabel ? ` at ${bellLabel}` : ''}`
              : `${duration.value} ${duration.unit}`
          }
          onChange={(i) => {
            const stop = stops[i];
            if (!stop) return;
            update(
              stop.bell
                ? { untilBell: true }
                : { timerMinutes: stop.minutes ?? prefs.timerMinutes, untilBell: false },
            );
          }}
          centre={
            prefs.untilBell ? (
              <>
                <span className="font-display text-section font-bold text-room-ink tabular-nums">
                  {bellLabel ?? 'Bell'}
                </span>
                <span className="text-caption text-room-ink-2">the bell</span>
              </>
            ) : (
              <>
                <span className="font-display text-sentence leading-none font-bold text-room-ink tabular-nums">
                  {duration.value}
                </span>
                <span className="mt-1 text-caption text-room-ink-2">{duration.unit}</span>
              </>
            )
          }
        />
      </div>
    </Screen>
  );
}
