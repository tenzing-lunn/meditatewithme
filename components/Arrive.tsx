'use client';

import { useState, type ReactNode } from 'react';

import { TIMER_STOPS } from '@/lib/timer';
import { BELL_KINDS, type BellKind, type UserPreferences } from '@/lib/types';
import type { Point } from '@/lib/pond';
import Brand from './Brand';
import { FOCUS } from './controls';
import Picker from './Picker';
import { TRACKS, type TrackSlug } from './mix';
import type { MixPatch } from './Sounds';

/**
 * The arrival, on the water: one sentence and Begin.
 *
 * What the rail asked across four screens (how long, which bell, what
 * sound, and the bowl) is one sentence here, and each choice in it is a
 * phrase you can press: *Sit for [15 minutes], end with [a singing bowl],
 * [in silence].* Pressing one opens its wheel in the middle of the screen
 * (`Picker`), where the bell and the sounds can be played before choosing.
 * The sentence always reads as what will happen, so Begin throws the stone.
 *
 * Pale water, 22 September 2026. The pond itself is drawn by `Journey`,
 * under this, so it carries on unchanged into the sitting.
 */

const BELL_WORDS: Record<BellKind, string> = {
  'singing-bowl': 'a singing bowl',
  gong: 'a gong',
  'struck-bell': 'a struck bell',
};

const SOUND_WORDS: Record<TrackSlug | 'silence', string> = {
  silence: 'silence',
  rain: 'rain',
  wind: 'wind',
  waterfall: 'a waterfall',
  ocean: 'the sea',
  fire: 'a fire',
  hum: 'a low hum',
  chimes: 'wind chimes',
  gong: 'a ringing gong',
  night: 'night sounds',
};

const PHRASE = `rounded-sm underline decoration-ink-3/60 decoration-1 underline-offset-[0.18em] transition-colors duration-200 hover:text-ember hover:decoration-ember motion-reduce:transition-none ${FOCUS}`;


export default function Arrive({
  prefs,
  update,
  onSound,
  bellLabel,
  others,
  clock,
  menu,
  ready,
  leaving,
  onBegin,
  onPreviewBell,
  onTaste,
  onHush,
  onWater,
}: {
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  onSound: (patch: MixPatch) => void;
  /** "21:55", the next shared bell, once the clock is known. */
  bellLabel: string | null;
  /** Everybody else sitting this hour; null until the count is known. */
  others: number | null;
  clock: string | null;
  menu?: ReactNode;
  /** The clock has been read; a sitting can be timed. */
  ready: boolean;
  /** Begin was pressed: the words fade while the stone is in the air. */
  leaving: boolean;
  onBegin: (from: Point) => void;
  onPreviewBell: (kind: BellKind) => void;
  /** A few seconds of a bed that is not chosen yet: the play button in the sound wheel. */
  onTaste: (slug: TrackSlug) => void;
  /** Stop that, now. */
  onHush: () => void;
  /** A tap on bare water, in client pixels: somewhere to skim a pebble to. */
  onWater?: (at: Point) => void;
}) {
  const [open, setOpen] = useState<'t' | 'b' | 's' | null>(null);
  const together = prefs.showCount && prefs.untilBell;
  const sound: TrackSlug | 'silence' =
    TRACKS.find((t) => (prefs.soundMix[t.slug] ?? 0) > 0)?.slug ?? 'silence';

  const pickSound = (slug: TrackSlug | 'silence') => {
    const patch: MixPatch = {};
    for (const t of TRACKS) patch[t.slug] = t.slug === slug ? 1 : 0;
    onSound(patch);
  };

  return (
    <div
      className={`relative flex h-full w-full flex-col px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] transition-opacity duration-700 motion-reduce:transition-none sm:px-14 lg:px-24 ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      inert={leaving}
      onClick={(e) => {
        // Only bare water: never a phrase, a list, Begin, the menu or a word.
        const hit = e.target as Element;
        if (hit.closest('button, a, input, [role="menu"], [role="dialog"], header, p')) return;
        onWater?.({ x: e.clientX, y: e.clientY });
      }}
    >
      <header className="flex items-center justify-between">
        <Brand />
        <div className="flex items-center gap-3 text-caption text-ink-3">
          {clock && <span className="tabular-nums">{clock}</span>}
          {menu}
        </div>
      </header>

      <div className="mt-auto max-w-[36rem]">
        {others !== null && others > 0 && (
          <p className="mb-4 text-body text-ink-2">Each stone is someone sitting this hour.</p>
        )}
        <p className="font-display text-question leading-[1.35] text-ink-2 sm:text-question-lg">
          {together ? 'Sit ' : 'Sit for '}
          <Phrase name="How long" onOpen={() => setOpen('t')}>
            {together ? `until the bell${bellLabel ? ` at ${bellLabel}` : ''}` : minutes(prefs.timerMinutes)}
          </Phrase>
          {', end with '}
          <Phrase name="The bell" onOpen={() => setOpen('b')}>
            {BELL_WORDS[prefs.endBell]}
          </Phrase>
          {sound === 'silence' ? ', in ' : ', with '}
          <Phrase name="Sound" onOpen={() => setOpen('s')}>
            {SOUND_WORDS[sound]}
          </Phrase>
          .
        </p>

        <button
          type="button"
          disabled={!ready}
          onClick={(e) => {
            const r = e.currentTarget.querySelector('[data-stone]')?.getBoundingClientRect();
            onBegin(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 });
          }}
          className={`mt-10 inline-flex min-h-12 items-center gap-3 rounded-sm pr-2 text-answer text-ink transition-opacity duration-200 hover:opacity-80 disabled:opacity-40 motion-reduce:transition-none ${FOCUS}`}
        >
          <span data-stone className={`block h-2.5 w-3 rounded-[52%_46%_50%_48%/56%_50%_47%_44%] ${leaving ? 'bg-transparent' : 'bg-ember'}`} />
          Begin
        </button>
      </div>

      {open === 't' && (
        <Picker
          title="How long"
          value={together ? 'bell' : String(prefs.timerMinutes)}
          options={[
            ...TIMER_STOPS.map((m) => ({ value: String(m), label: minutes(m) })),
            { value: 'bell', label: `until the bell${bellLabel ? ` at ${bellLabel}` : ''}` },
          ]}
          onConfirm={(v) => {
            update(v === 'bell' ? { untilBell: true, showCount: true } : { timerMinutes: Number(v), untilBell: false });
            setOpen(null);
          }}
          onCancel={() => setOpen(null)}
        />
      )}
      {open === 'b' && (
        <Picker
          title="The bell at the end"
          value={prefs.endBell}
          options={BELL_KINDS.map((k) => ({ value: k, label: BELL_WORDS[k], audible: true }))}
          onConfirm={(v) => {
            update({ endBell: v as BellKind });
            setOpen(null);
          }}
          onCancel={() => setOpen(null)}
          onPlay={(v) => onPreviewBell(v as BellKind)}
          playMs={4000}
        />
      )}
      {open === 's' && (
        <Picker
          title="While you sit"
          value={sound}
          options={(['silence', ...TRACKS.map((t) => t.slug)] as const).map((slug) => ({
            value: slug,
            label: SOUND_WORDS[slug],
            audible: slug !== 'silence',
          }))}
          onConfirm={(v) => {
            pickSound(v as TrackSlug | 'silence');
            setOpen(null);
          }}
          onCancel={() => setOpen(null)}
          onPlay={(v) => onTaste(v as TrackSlug)}
          onStop={onHush}
        />
      )}
    </div>
  );
}

function minutes(m: number): string {
  return `${m} ${m === 1 ? 'minute' : 'minutes'}`;
}

/** A phrase in the sentence: pressing it opens its wheel (`Picker`). */
function Phrase({
  name,
  onOpen,
  children,
}: {
  name: string;
  onOpen: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`${name}: ${children}`}
      onClick={onOpen}
      className={`${PHRASE} text-ink`}
    >
      {children}
    </button>
  );
}
