'use client';

import { useId } from 'react';

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
 * Every slider starts at zero. Silence is the default because sound arriving
 * unasked is the thing a meditation site can least afford, and because a mix
 * somebody assembled themselves is the one they will come back for.
 *
 * Rendered twice on the page — in the setup before a sitting, and in the
 * drawer during one — so the ids are generated rather than written, and no
 * state lives here.
 */
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

  return (
    <div className={compact ? 'w-full space-y-2.5' : 'w-full space-y-3'}>
      {compact && (
        <span className="text-ink-3 block text-sm">Underneath</span>
      )}

      {TRACKS.map((track) => {
        const value = soundMix[track.slug] ?? 0;
        const id = `${prefix}-${track.slug}`;
        return (
          <div key={track.slug} className="flex items-center gap-3">
            <label
              htmlFor={id}
              // The label carries the on/off state, so a track that is up
              // reads as up without a second indicator to keep in sync.
              // Sentence case in a wider column. "WATERFALL" in tracked mono
              // caps overflowed 5rem and sat on top of its own slider at 390px,
              // which is the width most of this site will be used at.
              className={`w-24 shrink-0 text-left text-sm transition-colors ${
                value > 0 ? 'text-ember' : 'text-ink-3'
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
              className="accent-ember w-full"
            />
          </div>
        );
      })}

      <div className="border-rule flex items-center gap-3 border-t pt-3">
        <label
          htmlFor={`${prefix}-master`}
          className="text-ink-3 w-24 shrink-0 text-left text-sm"
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
          className="accent-ember w-full"
        />
      </div>
    </div>
  );
}
