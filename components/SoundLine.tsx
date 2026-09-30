'use client';

import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { SOUND_WORDS } from './Arrive';
import { FOCUS } from './controls';
import { TRACKS, type TrackSlug } from './mix';
import type { MixPatch } from './Sounds';

/**
 * The sounds during a sitting: one line of words over the water.
 *
 * 30 September 2026, replacing the tile sheet, which was the rail's old
 * instrument in a bordered card. These are the same words the arrival's
 * sentence uses (*with rain*, *in silence*), in the same serif, so what you
 * chose before Begin is what you change here. One tap on a word and it is
 * playing; the line scrolls sideways under a thumb for the rest, and opens
 * with the one that is on in the middle. There is no volume: mid-sitting
 * the device's own buttons are that.
 *
 * An exclusive choice, so a `radiogroup` with one tab stop and the arrows
 * moving the choice, like `Sounds`. `onTouch` tells the sitting someone is
 * still here, so the line does not close under them.
 */

const CHOICES = ['silence', ...TRACKS.map((t) => t.slug)] as const;

export default function SoundLine({
  mix,
  onSound,
  onTouch,
}: {
  mix: Record<string, number>;
  onSound: (patch: MixPatch) => void;
  onTouch: () => void;
}) {
  const strip = useRef<HTMLDivElement | null>(null);
  const words = useRef<(HTMLButtonElement | null)[]>([]);
  const chosen: TrackSlug | 'silence' =
    TRACKS.find((t) => (mix[t.slug] ?? 0) > 0)?.slug ?? 'silence';

  const centre = (i: number, smooth: boolean) => {
    const box = strip.current;
    const word = words.current[i];
    if (!box || !word) return;
    box.scrollTo({
      left: word.offsetLeft - (box.clientWidth - word.offsetWidth) / 2,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  // Opened on the one that is on, before the first paint.
  useLayoutEffect(() => {
    centre(CHOICES.indexOf(chosen), false);
    // Only ever on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (i: number) => {
    const slug = CHOICES[i];
    if (!slug) return;
    const patch: MixPatch = {};
    for (const t of TRACKS) patch[t.slug] = t.slug === slug ? 1 : 0;
    onSound(patch);
    onTouch();
    centre(i, true);
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
    pick(next);
    words.current[next]?.focus({ preventScroll: true });
  };

  return (
    <div
      ref={strip}
      role="radiogroup"
      aria-label="Sound"
      onScroll={onTouch}
      className="relative flex snap-x snap-mandatory gap-6 overflow-x-auto px-[50%] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{
        maskImage: 'linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)',
      }}
    >
      {CHOICES.map((slug, i) => {
        const on = slug === chosen;
        return (
          <button
            key={slug}
            ref={(el) => {
              words.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => pick(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`min-h-11 shrink-0 snap-center rounded-sm whitespace-nowrap font-display text-answer transition-colors duration-200 motion-reduce:transition-none ${FOCUS} ${
              on
                ? 'text-ink underline decoration-ember decoration-1 underline-offset-[0.2em]'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            {SOUND_WORDS[slug]}
          </button>
        );
      })}
    </div>
  );
}
