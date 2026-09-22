'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import type { Cell, WorldPoint } from '@/lib/geo';
import type { Mode } from '@/lib/journey';
import type { Room } from '@/lib/room';
import RailBar from './RailBar';
import Switch from './Switch';
import Wordmark from './Wordmark';
import { FOCUS_ROOM } from './controls';

/**
 * Loaded only while the earth is drawn, for the reason `World` gives: it
 * touches `document`, and none of the geography belongs in the first bundle.
 */
const WorldMap = dynamic(() => import('./WorldMap'), {
  ssr: false,
  loading: () => null,
});

function Arrow({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M5 12h12.5M12 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * This hour's earth as the whole ground, with whatever is asked on it.
 *
 * The mode question and Home are both this: the night map full-bleed, the
 * same candles and breath as the sitting, so choosing how to sit is already a
 * look at the room. The earth covers the frame (`fit="cover"`): the whole
 * width on a laptop, and on a phone the part of it around you, large enough
 * that a light is a light. Your place is a dashed ring marked *You* — the
 * edge's guess at where the request came from, never stored — and before
 * that is known, the crop follows the device's time zone.
 *
 * A veil of dusk comes up from the bottom (`.earth-veil`), so what is asked
 * is read on the ground rather than on the map, and the map is only drawn
 * while `earth` is true: a screen nobody is looking at runs no canvas.
 */
export function EarthScene({
  points,
  you,
  room,
  earth,
  paused = false,
  className = '',
  children,
}: {
  points: WorldPoint[];
  you: Cell | null;
  /** Dawn or dusk: sets the tokens for everything inside, and the map's palette. */
  room: Room;
  earth: boolean;
  /** Something covers the map: hold its last frame. */
  paused?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-room={room}
      className={`relative isolate overflow-hidden bg-room text-room-ink ${className}`}
    >
      <div aria-hidden className="absolute inset-0 -z-10">
        {earth && (
          <WorldMap
            points={points}
            you={you}
            room={room}
            fit="cover"
            waiting
            paused={paused}
            className="absolute inset-0"
          />
        )}
        <div className="earth-veil absolute inset-0" />
      </div>
      {children}
    </div>
  );
}

/**
 * Who else is here, in a line over the question.
 *
 * `others` never includes the reader: on the rail the presence count does,
 * so the caller takes one off, and it is the same number the with-others
 * time screen says next. Unknown is said as nothing, never as nobody. With
 * nobody here but lights already lit this hour, it does not claim yours
 * would be the first.
 */
export function LiveLine({ others, lit }: { others: number | null; lit: boolean }) {
  // Unknown keeps the line's height, so the question under it does not jump
  // when the first count lands.
  if (others === null) return <p aria-hidden className="h-6" />;
  const none = others < 1;
  return (
    <p
      className={`flex items-center gap-2.5 text-[0.9375rem] font-semibold tabular-nums ${
        none ? 'text-room-ink-2' : 'text-room-action'
      }`}
    >
      <span
        aria-hidden
        className={`size-2 shrink-0 rounded-full ${
          none ? 'border-[1.5px] border-room-ink-2/70' : 'live-dot bg-room-action'
        }`}
      />
      {others >= 2
        ? `${others} others are here right now`
        : others === 1
          ? '1 other person is here right now'
          : lit
            ? 'Nobody else is here right now'
            : 'Nobody else yet. Yours will be the first light.'}
    </p>
  );
}

const DOOR =
  'group flex min-h-[4.875rem] w-full items-center justify-between gap-3 rounded-[1.25rem] pr-5 pl-[1.375rem] text-left transition-[background-color,border-color,filter] duration-200 active:scale-[0.99] motion-reduce:transition-none md:min-h-24 md:w-[19rem] md:pr-6 md:pl-[1.625rem]';

/**
 * The two doors: with everyone, or on your own.
 *
 * Choosing one is the way on; there is no Next. They are the same shape, the
 * same height and the same arrow in the same place, so neither reads as the
 * afterthought. *Sit with everyone* is lit — flame, the candle's own colour,
 * with dusk type — and *Sit on your own* is outlined on the ground: a lean,
 * not a push. Nothing is chosen on arrival; the saved mode is what the
 * questions after this remember, not something drawn here.
 *
 * The line under *with everyone* says what that door leads to
 * (`togetherLine` in `lib/journey.ts`): the shared bell, named before anyone
 * has learned the word, or a length of your own that the door keeps. Stacked
 * on a phone, in thumb reach; stacked beside the question from `md`; side by
 * side from `xl`.
 */
export function Doors({
  togetherLine,
  onChoose,
}: {
  /** "Everyone finishes together at 12:55", or "Your own length, with everyone". */
  togetherLine: string;
  onChoose: (mode: Mode) => void;
}) {
  return (
    <div role="group" aria-label="How to sit" className="flex flex-col gap-2.5 md:gap-3.5 xl:flex-row">
      <button
        type="button"
        onClick={() => onChoose('together')}
        className={`${DOOR} bg-room-action text-room-action-ink hover:brightness-110 ${FOCUS_ROOM}`}
      >
        <span className="flex min-w-0 flex-col">
          <span className="font-display text-[1.1875rem] font-bold tracking-[-0.01em] md:text-[1.3125rem]">
            Sit with everyone
          </span>
          <span className="mt-0.5 text-[0.84375rem] font-semibold text-room-action-ink-2 tabular-nums md:text-[0.90625rem]">
            {togetherLine}
          </span>
        </span>
        <Arrow className="size-[1.375rem] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </button>

      <button
        type="button"
        onClick={() => onChoose('alone')}
        className={`${DOOR} border-[1.5px] border-room-edge bg-room/55 text-room-ink backdrop-blur-sm hover:border-room-action ${FOCUS_ROOM}`}
      >
        <span className="flex min-w-0 flex-col">
          <span className="font-display text-[1.1875rem] font-bold tracking-[-0.01em] md:text-[1.3125rem]">
            Sit on your own
          </span>
          <span className="mt-0.5 text-[0.84375rem] font-semibold text-room-ink-2 md:text-[0.90625rem]">
            Your own length, the same sky
          </span>
        </span>
        <Arrow className="size-[1.375rem] shrink-0 transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-room-action motion-reduce:transition-none" />
      </button>
    </div>
  );
}

/**
 * "How would you like to sit?", on the earth — and for a guest, the front
 * page.
 *
 * The screen is the scene, not a `Screen`: the question and the doors sit at
 * the bottom over the veil, the question on the left and the doors on the
 * right from `md`, and Back in the foot where it is on every other question.
 * The menu over it takes its dusk trigger from `Journey`.
 *
 * THE FRONT PAGE IS THE ROOM
 * Until 19 September 2026 a guest met a paper title page first — the
 * wordmark, a line, *Come and sit* — with this hour's earth pale beside it,
 * and only then these doors. That was two front doors, and the second was
 * the better one: it shows the thing itself, everyone sitting this hour as a
 * light, where the first only described it. With `landing` the doors are the
 * site's first screen: the wordmark takes the question's place, choosing a
 * door is the first click (and the gesture that wakes the audio, silent),
 * and the foot holds the returning guest's usual and the switch to skip the
 * questions, set as housekeeping. No step marks: this is the way in, not one
 * of the questions.
 */
export default function ModeScreen({
  current,
  room,
  togetherLine,
  others,
  step,
  steps,
  points,
  you,
  onChoose,
  onBack,
  landing,
}: {
  current: boolean;
  room: Room;
  /** This question's place on the rail, as on every other question. */
  step?: number;
  steps?: number;
  /** The line under *Sit with everyone*; see `Doors`. */
  togetherLine: string;
  /** People here now besides you. Null when unknown. */
  others: number | null;
  points: WorldPoint[];
  you: Cell | null;
  onChoose: (mode: Mode) => void;
  onBack?: () => void;
  /** A guest's first screen: the wordmark for a title, and the usual in the foot. */
  landing?: {
    /** "10 minutes · singing bowl · in silence", once there is one to show. */
    usualLine: string | null;
    usual: boolean;
    onUsual: (next: boolean) => void;
  };
}) {
  return (
    <EarthScene points={points} you={you} room={room} earth={current} className="h-full w-full">
      <section className="relative flex h-full flex-col px-6 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-10 md:px-14 lg:px-20 xl:px-24">
        {!landing && <RailBar onBack={onBack} step={step} steps={steps} room />}
        <div className="flex flex-1 flex-col justify-end gap-6 pb-6 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:content-end md:items-end md:gap-12 md:pb-10">
          <div className="flex flex-col gap-2.5 md:gap-3.5">
            <LiveLine others={others} lit={points.length > 0} />
            {landing ? (
              <h2 tabIndex={-1} className="outline-none">
                <Wordmark room />
              </h2>
            ) : (
              <h2
                tabIndex={-1}
                className="font-display text-[2.125rem] leading-[1.08] font-bold tracking-[-0.015em] text-balance text-room-ink outline-none sm:text-[2.75rem] lg:text-[3.5rem]"
              >
                How would you like to sit?
              </h2>
            )}
          </div>
          <Doors togetherLine={togetherLine} onChoose={onChoose} />
        </div>
        {landing?.usualLine && (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
            <p className="text-[0.875rem] text-room-ink-2">
              Your usual is{' '}
              <span className="font-semibold text-room-ink">{landing.usualLine}</span>
            </p>
            <Switch
              room
              checked={landing.usual}
              onChange={landing.onUsual}
              label="Skip the questions next time"
            />
          </div>
        )}
      </section>
    </EarthScene>
  );
}
