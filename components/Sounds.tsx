'use client';

import { useId, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { FOCUS_ROOM } from './controls';
import { DEFAULT_MASTER, MASTER_KEY, TRACKS, type TrackSlug } from './mix';

/**
 * Silence, the beds, and one Volume over whichever is on.
 *
 * Nine tiles since 23 September 2026: silence, and the eight beds. Silence
 * is the usual answer, so it is the one that starts chosen — but it is a tile among the others rather
 * than a switch in front of them, because it is a choice like they are.
 *
 * ONE SOUND, NOT A MIX — 22 September 2026
 * The beds used to stack: each tile was a toggle with its own fader, and
 * rain, wind and night could all be on at once with a master over the three.
 * The client's instruction is that they are individual — one sound at a time,
 * one volume control operating whichever it is. So the six are an exclusive
 * choice, the same shape as the three bells next door: a `radiogroup`, one
 * tab stop, arrows moving the choice. Choosing a bed silences the others in
 * the same patch, and the way to hear nothing is the Silence tile.
 *
 * That removes the per-tile faders, and with them the question of what a
 * fader means when there is only ever one bed under it. A chosen bed plays at
 * full and *Volume* — the master, the same control it always was — is how
 * loud it is. The beds are loudness-matched to −16 LUFS upstream of the fader
 * (see `mix.ts`), so one volume means the same amount of sound whichever bed
 * is under it, which is what makes a single control honest.
 *
 * ONE CONTROL, THREE PLACES
 * The rail's Sound step, *Underneath* in the settings drawer, and the sheet
 * the *Sound* button opens during a sitting. Until 20 September 2026 those
 * were three different controls, so somebody who learned the mix on the rail
 * met a different instrument at every other door. The rail's is the one that
 * stayed, and this is it — on the rail and in the drawer. Since 30 September
 * 2026 the sitting has its own, lighter control (`SoundLine`): one line of
 * words, no volume, because mid-sitting the device's own buttons are that.
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

/** A change to the mix: the bed chosen, the beds silenced, or the volume. */
export type MixPatch = Partial<Record<TrackSlug | typeof MASTER_KEY, number>>;

/** Silence first, then the beds, in the order they are shown. */
const CHOICES = [
  { slug: 'silence' as const, label: 'Silence' },
  ...TRACKS.map((t) => ({ slug: t.slug, label: t.label })),
];

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
      {slug === 'ocean' && (
        <path d="M4 20c7 0 9-11 17-11 5 0 6 5 2 6M28 20c7 0 9-11 17-11 5 0 6 5 2 6M52 20c7 0 9-11 17-11 5 0 6 5 2 6" {...line} />
      )}
      {slug === 'fire' && (
        <path d="M20 24h40M28 21c-4-4 3-7 0-12M40 21c-5-6 4-10 0-18M52 21c-4-4 3-7 0-12" {...line} />
      )}
      {slug === 'chimes' && (
        <path d="M18 3h44M24 3v11M34 3v17M44 3v8M54 3v14" {...line} />
      )}
      {slug === 'bowl' && (
        <path d="M28 12h24a12 12 0 0 1-24 0M22 7c3-2 6-2 9 0M49 7c3-2 6-2 9 0M14 5c4-3 8-3 12 0M54 5c4-3 8-3 12 0" {...line} />
      )}
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
}: {
  mix: Record<string, number>;
  /**
   * A patch rather than one key at a time, because choosing one bed is also
   * silencing four others and that is one decision. Five separate calls in
   * one tick would each start from the same preferences object and only the
   * last would survive. Runs inside the change event, because a graph can
   * only be started by a gesture.
   */
  onSound: (patch: MixPatch) => void;
  /** The first bed of the session is going on. The rail raises the master. */
  onFirst?: () => void;
}) {
  const prefix = useId();
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);

  // The one bed that is on, if any. Preferences can hold more than one after
  // a sync from a version that stacked them, and `normalize()` collapses
  // those on the way in; this takes the first regardless, so the grid can
  // never show two chosen tiles.
  const chosen: TrackSlug | 'silence' =
    TRACKS.find((t) => (mix[t.slug] ?? 0) > 0)?.slug ?? 'silence';
  const master = mix[MASTER_KEY] ?? DEFAULT_MASTER;

  const pick = (slug: TrackSlug | 'silence') => {
    if (slug !== 'silence' && chosen === 'silence') onFirst?.();
    const patch: MixPatch = {};
    for (const track of TRACKS) patch[track.slug] = track.slug === slug ? 1 : 0;
    onSound(patch);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const by =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (!by) return;
    e.preventDefault();
    const next = (i + by + CHOICES.length) % CHOICES.length;
    const choice = CHOICES[next];
    if (!choice) return;
    pick(choice.slug);
    tiles.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5"
        role="radiogroup"
        aria-label="Sounds"
      >
        {CHOICES.map((choice, i) => {
          const on = chosen === choice.slug;
          return (
            <button
              key={choice.slug}
              ref={(el) => {
                tiles.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => pick(choice.slug)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`flex flex-col items-start gap-1.5 rounded-card border p-2.5 text-left transition-colors duration-200 motion-reduce:transition-none sm:gap-2 sm:p-3 ${FOCUS_ROOM} ${
                on
                  ? 'border-room-action bg-room-action/15 text-room-action'
                  : 'border-room-edge text-room-ink-2 hover:border-room-action hover:text-room-action'
              }`}
            >
              <Texture slug={choice.slug} />
              <span
                className={`text-control font-semibold ${on ? 'text-room-action' : 'text-room-ink'}`}
              >
                {choice.label}
              </span>
            </button>
          );
        })}
      </div>

      {chosen !== 'silence' && (
        // Not a sixth sound: how loud the one that is on is. It only exists
        // once there is something for it to be the volume of.
        <div className="flex items-center gap-3">
          <label
            htmlFor={`${prefix}-master`}
            className="w-16 shrink-0 text-caption text-room-ink-2"
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
