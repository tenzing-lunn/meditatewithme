'use client';

import { useId, useRef, type CSSProperties, type RefObject } from 'react';
import { FOCUS_ROOM } from './controls';
import { DEFAULT_MASTER, MASTER_KEY, TRACKS, type TrackSlug } from './mix';

/**
 * Silence, the five beds, and one Volume over them.
 *
 * Six tiles: silence, and the five beds. Silence is the usual answer, so it
 * is the one that starts chosen — but it is a tile among the others rather
 * than a switch in front of them, because it is a choice like they are.
 * Choosing a sound plays it at the level it was last left at, and the level
 * lives on the tile as a fader you drag. Under the grid, once anything is on,
 * one *Volume* — not a sixth sound but how loud the others are.
 *
 * ONE CONTROL, THREE PLACES
 * The rail's Sound step, *Underneath* in the settings drawer, and the sheet
 * the *Sound* button opens during a sitting. Until 20 September 2026 those
 * were three different controls: the rail had tiles with faders, the drawer
 * had tiles with no level at all and a line telling you to set it while
 * sitting, and the sitting had five play-and-fader rows left over from the
 * palette before the warm one. Three ways to say the same thing, so somebody
 * who learned the mix on the rail met a different instrument at every other
 * door. The rail's is the one that stayed, and this is it.
 *
 * WHY THE FADERS ARE ON THE TILES
 * A bed and how much of it are one decision, so they are one control: press
 * the tile to hear it, drag its bar to set it. Nothing is hidden and nothing
 * is a second screen.
 *
 * A FADER CANNOT REACH ZERO
 * Off is the tile, not the bottom of the bar. If the bar went to zero, then
 * dragging it there would turn the bed off and take the bar away from under
 * the finger still dragging it. So the fader spans a quiet minimum to full,
 * and the only way to silence a bed is to press it — which is also the only
 * way to bring it back, so the two can never disagree.
 *
 * WHAT IS ALLOWED TO BE HEARD
 * Nothing here builds an audio graph or raises a master on its own. Every
 * change goes out through `onSound`, and what that does with it belongs to
 * the caller: on the rail it runs inside the gesture that starts the context,
 * and `onFirst` unmutes on the first bed of the session; in the settings
 * drawer it only writes preferences, because Home has no graph and building
 * one there would start rain in somebody's kitchen from a settings page.
 * Choosing silence writes real zeros, so a declined mix is silent and not
 * merely hidden.
 */

/** A change to the mix: one bed, the master, or every bed at once. */
export type MixPatch = Partial<Record<TrackSlug | typeof MASTER_KEY, number>>;

/** Where a bed that has never been heard starts. Audible, not loud. */
export const AUDITION = 0.55;

/** The quietest a bed can be dragged to while it is still on. */
const FLOOR = 0.05;

const fill = (value: number) => `${((value - FLOOR) / (1 - FLOOR)) * 100}%`;

export function Texture({ slug }: { slug: TrackSlug | 'silence' }) {
  const line = { stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' } as const;
  return (
    <svg viewBox="0 0 80 26" fill="none" aria-hidden className="h-5 w-full sm:h-6">
      {slug === 'silence' && <path d="M8 13h64" {...line} />}
      {slug === 'rain' && <path d="M10 4v7M22 8v7M34 3v7M46 9v7M58 4v7M70 8v7" {...line} />}
      {slug === 'wind' && (
        <path d="M6 9h44a6 6 0 1 0-6-6M6 17h34a5 5 0 1 1-5 5" {...line} />
      )}
      {slug === 'waterfall' && <path d="M14 2v16M26 2v20M38 2v14M50 2v20M62 2v16" {...line} />}
      {slug === 'hum' && <path d="M4 13c8-9 14 9 22 0s14 9 22 0 14 9 22 0" {...line} />}
      {slug === 'night' && (
        <>
          <circle cx="16" cy="9" r="1.6" fill="currentColor" />
          <circle cx="34" cy="16" r="1.6" fill="currentColor" />
          <circle cx="52" cy="7" r="1.6" fill="currentColor" />
          <circle cx="66" cy="15" r="1.6" fill="currentColor" />
          <circle cx="24" cy="20" r="1.6" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

export default function Sounds({
  mix,
  onSound,
  onFirst,
  remembered: held,
  tight = false,
}: {
  mix: Record<string, number>;
  /**
   * A patch rather than one key at a time, because silencing five beds is one
   * decision. Five separate calls in one tick would each start from the same
   * preferences object and only the last would survive. Runs inside the
   * change event, because a graph can only be started by a gesture.
   */
  onSound: (patch: MixPatch) => void;
  /** The first bed of the session is going on. The rail raises the master. */
  onFirst?: () => void;
  /**
   * Where each bed was when it was last silenced, when the caller wants to
   * keep that longer than this component lives. The sitting's sheet unmounts
   * on close, so it holds the ref itself; the rail and the drawer stay
   * mounted and let this component keep its own.
   */
  remembered?: RefObject<Record<string, number>>;
  /**
   * Three across at every width, for the sheet during a sitting. The same six
   * tiles, wrapped differently because they are not alone on the screen:
   * two-across on a phone made the grid three rows, and at 375×667 that left
   * the earth 52 pixels tall while the sheet was open. Everywhere else the
   * question has the screen to itself and the tiles stay two-across, which is
   * the size a thumb wants.
   */
  tight?: boolean;
}) {
  const prefix = useId();

  // Where each bed was when it was last silenced, so pressing it again puts
  // it back rather than starting from a guess. A ref: nothing renders from
  // it, and writing it must not cost a frame inside the gesture that is also
  // starting an AudioContext. The caller's, if it passed one.
  const own = useRef<Record<string, number>>({});
  const remembered = held ?? own;

  const level = (slug: TrackSlug) => mix[slug] ?? 0;
  const anyOn = TRACKS.some((t) => level(t.slug) > 0);
  const master = mix[MASTER_KEY] ?? DEFAULT_MASTER;

  const silence = () => {
    const silent: MixPatch = {};
    for (const track of TRACKS) {
      const value = level(track.slug);
      if (value > 0) remembered.current[track.slug] = value;
      silent[track.slug] = 0;
    }
    onSound(silent);
  };

  const press = (slug: TrackSlug) => {
    if (level(slug) > 0) {
      remembered.current[slug] = level(slug);
      onSound({ [slug]: 0 });
      return;
    }
    if (!anyOn) onFirst?.();
    onSound({ [slug]: remembered.current[slug] || AUDITION });
  };

  const tile = (on: boolean) =>
    `flex flex-col gap-1.5 rounded-card border p-2.5 transition-colors sm:gap-2 sm:p-3 duration-200 motion-reduce:transition-none ${
      on ? 'border-room-action bg-room-action/15' : 'border-room-edge'
    }`;

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div
        className={`grid gap-2 sm:gap-2.5 ${tight ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}
        role="group"
        aria-label="Sounds"
      >
        <div className={tile(!anyOn)}>
          <button
            type="button"
            onClick={silence}
            aria-pressed={!anyOn}
            className={`flex w-full flex-col items-start gap-1.5 rounded-control ${FOCUS_ROOM} ${
              !anyOn ? 'text-room-action' : 'text-room-ink-2 hover:text-room-action'
            }`}
          >
            <Texture slug="silence" />
            <span
              className={`font-display text-[0.875rem] font-semibold ${
                !anyOn ? 'text-room-action' : 'text-room-ink'
              }`}
            >
              Silence
            </span>
          </button>
          {/* The beds' faders are 44px tall; this keeps the six tiles one
              height without a control that would have nothing to set. */}
          <span aria-hidden className="h-11" />
        </div>

        {TRACKS.map((track) => {
          const value = level(track.slug);
          const on = value > 0;
          const id = `${prefix}-${track.slug}`;
          return (
            <div key={track.slug} className={tile(on)}>
              <button
                type="button"
                onClick={() => press(track.slug)}
                aria-pressed={on}
                className={`flex w-full flex-col items-start gap-1.5 rounded-control ${FOCUS_ROOM} ${
                  on ? 'text-room-action' : 'text-room-ink-2 hover:text-room-action'
                }`}
              >
                <Texture slug={track.slug} />
                <span
                  className={`font-display text-[0.875rem] font-semibold ${
                    on ? 'text-room-action' : 'text-room-ink'
                  }`}
                >
                  {track.label}
                </span>
              </button>
              {on ? (
                <>
                  <label htmlFor={id} className="sr-only">
                    {track.label} level
                  </label>
                  <input
                    id={id}
                    type="range"
                    min={FLOOR}
                    max={1}
                    step={0.02}
                    value={value}
                    aria-valuetext={`${Math.round(value * 100)} percent`}
                    onChange={(e) => onSound({ [track.slug]: Number(e.target.value) })}
                    className="room-range range-room range-tile w-full"
                    style={{ '--range-fill': fill(value) } as CSSProperties}
                  />
                </>
              ) : (
                <span aria-hidden className="h-11" />
              )}
            </div>
          );
        })}
      </div>

      {anyOn && (
        // Not a sixth sound: how loud the others are. It only exists once
        // there is something for it to be the volume of.
        <div className="flex items-center gap-3">
          <label
            htmlFor={`${prefix}-master`}
            className="w-16 shrink-0 text-[0.875rem] text-room-ink-2"
          >
            Volume
          </label>
          <input
            id={`${prefix}-master`}
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={master}
            aria-valuetext={`${Math.round(master * 100)} percent`}
            onChange={(e) => onSound({ [MASTER_KEY]: Number(e.target.value) })}
            className="room-range range-room w-full"
            style={{ '--range-fill': `${master * 100}%` } as CSSProperties}
          />
        </div>
      )}
    </div>
  );
}
