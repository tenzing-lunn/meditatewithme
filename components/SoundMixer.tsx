'use client';

import { useId, useRef, type CSSProperties } from 'react';

import {
  DEFAULT_MASTER,
  MASTER_KEY,
  TRACKS,
  type TrackSlug,
} from './mix';

/**
 * What you hear underneath.
 *
 * Five beds, each with its own level, and one master. Not a preset list —
 * the proposal is explicit that people build "the exact atmosphere they want",
 * which means every track needs its own fader rather than a choice between
 * somebody else's combinations.
 *
 * YOU CAN HEAR IT BEFORE YOU CHOOSE IT
 * Each track has a play/pause of its own, and that is the whole difference
 * between this and a settings screen. Previously the only way to find out what
 * `Waterfall` sounded like was to drag its fader up and hope — you were asked
 * to build an atmosphere out of five words. Now you press play, listen, and
 * move the fader while it runs; pause leaves everything else playing so you can
 * audition one against another.
 *
 * Play and pause are the level, not a second piece of state beside it. A track
 * you can hear is a track that is up, so there is nothing to keep in sync and
 * nothing that can disagree with what you are hearing. Pausing remembers where
 * the fader was so play puts it back rather than starting from a guess.
 *
 * Every track starts silent. Sound arriving unasked is the thing a meditation
 * site can least afford, and a mix somebody assembled themselves is the one
 * they will come back for.
 *
 * Rendered twice — in the setup before a sitting, and in the drawer during one
 * — so the ids are generated rather than written.
 */

/** Where play puts a track that has never been heard. Audible, not loud. */
const AUDITION_LEVEL = 0.55;

export default function SoundMixer({
  soundMix,
  onChange,
  compact = false,
}: {
  soundMix: Record<string, number>;
  /** Called with a track slug or MASTER_KEY. Must run inside a user gesture. */
  onChange: (slug: TrackSlug | typeof MASTER_KEY, gain: number) => void;
  compact?: boolean;
}) {
  const prefix = useId();
  const master = soundMix[MASTER_KEY] ?? DEFAULT_MASTER;

  // Where each fader was when it was paused. A ref rather than state: nothing
  // renders from it, and writing it must not cost a frame in the middle of a
  // gesture that is also starting an AudioContext.
  const remembered = useRef<Record<string, number>>({});

  return (
    <div className={compact ? 'w-full space-y-2' : 'w-full space-y-1'}>
      {compact && (
        <span className="text-ink-3 block text-sm">Underneath</span>
      )}

      {TRACKS.map((track) => {
        const value = soundMix[track.slug] ?? 0;
        const playing = value > 0;
        const id = `${prefix}-${track.slug}`;
        return (
          <div key={track.slug} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (playing) {
                  remembered.current[track.slug] = value;
                  onChange(track.slug, 0);
                } else {
                  onChange(
                    track.slug,
                    remembered.current[track.slug] || AUDITION_LEVEL,
                  );
                }
              }}
              aria-pressed={playing}
              aria-label={`${playing ? 'Pause' : 'Play'} ${track.label}`}
              className={`rounded-action focus-visible:ring-ember focus-visible:ring-offset-paper flex size-11 shrink-0 items-center justify-center border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                playing
                  ? 'border-ember text-ember'
                  : 'border-rule text-ink-2 hover:border-ink-3 hover:text-ink'
              }`}
            >
              <PlayPause playing={playing} />
            </button>

            <label
              htmlFor={id}
              // The label carries the on/off state too, so a track that is up
              // reads as up without a second indicator to keep in sync.
              // Sentence case in a wider column: "WATERFALL" in tracked mono
              // caps overflowed 5rem and sat on top of its own slider at 390px,
              // which is the width most of this site will be used at.
              className={`w-20 shrink-0 text-left text-sm transition-colors ${
                playing ? 'text-ember' : 'text-ink-2'
              }`}
            >
              {track.label}
            </label>

            <input
              id={id}
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={value}
              aria-valuetext={`${Math.round(value * 100)} percent`}
              onChange={(e) => onChange(track.slug, Number(e.target.value))}
              className="room-range w-full"
              style={{ '--range-fill': `${value * 100}%` } as CSSProperties}
            />
          </div>
        );
      })}

      <div className="border-rule mt-1 flex items-center gap-3 border-t pt-2">
        {/* No play button. `All` is not a sound, it is how loud the others are,
            and a pause here would be a second mute competing with five. */}
        <span className="size-11 shrink-0" aria-hidden />
        <label
          htmlFor={`${prefix}-master`}
          className="text-ink-2 w-20 shrink-0 text-left text-sm"
        >
          All
        </label>
        <input
          id={`${prefix}-master`}
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={master}
          aria-valuetext={`${Math.round(master * 100)} percent`}
          onChange={(e) => onChange(MASTER_KEY, Number(e.target.value))}
          className="room-range w-full"
          style={{ '--range-fill': `${master * 100}%` } as CSSProperties}
        />
      </div>
    </div>
  );
}

/** Two shapes, no icon font, no dependency. `currentColor` so the button's
 *  own state colours it. */
function PlayPause({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
      {playing ? (
        <>
          <rect x="3.5" y="2.5" width="3.5" height="11" rx="1" />
          <rect x="9" y="2.5" width="3.5" height="11" rx="1" />
        </>
      ) : (
        <path d="M4.5 2.9c0-.7.8-1.2 1.4-.8l7 5.1a1 1 0 0 1 0 1.6l-7 5.1c-.6.4-1.4 0-1.4-.8V2.9Z" />
      )}
    </svg>
  );
}
