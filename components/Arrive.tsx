'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';

import { SITTING_OPTIONS } from '@/lib/journey';
import { TIMER_STOPS } from '@/lib/timer';
import { BELL_KINDS, type BellKind, type UserPreferences } from '@/lib/types';
import type { Point } from '@/lib/pond';
import Brand from './Brand';
import { stopPreviewBell } from './audio';
import { FOCUS, POND_ACTION } from './controls';
import Picker from './Picker';
import Pebble from './Pebble';
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
  gong: 'a tongue drum',
  'struck-bell': 'a struck bell',
};

const SOUND_WORDS: Record<TrackSlug | 'silence', string> = {
  silence: 'silence',
  rain: 'rain',
  wind: 'wind',
  waterfall: 'a creek',
  ocean: 'the sea',
  fire: 'a fire',
  hum: 'a low hum',
  chimes: 'wind chimes',
  bowl: 'a humming bowl',
  night: 'evening sounds',
};

/** Everything but the sentence, on Begin: it goes quietly, before the words. */
const FADE = 'transition-opacity duration-300 motion-reduce:transition-none';

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
  guided,
  guide,
  onGuided,
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
  /** Sitting with whoever is on camera, rather than by yourself. */
  guided: boolean;
  /** Who is guiding: "Live now", or when the next session starts. */
  guide: string;
  onGuided: (guided: boolean) => void;
}) {
  const fade = `${FADE} ${leaving ? 'opacity-0' : ''}`;
  const [open, setOpen] = useState<'m' | 't' | 'b' | 's' | null>(null);
  const together = prefs.showCount && prefs.untilBell;
  const sound: TrackSlug | 'silence' =
    TRACKS.find((t) => (prefs.soundMix[t.slug] ?? 0) > 0)?.slug ?? 'silence';

  // Each word and phrase of the sentence, numbered in reading order, so on
  // Begin they go into the water one after another (`.sink`).
  let n = 0;
  const sink = (): CSSProperties => ({ '--i': n++ }) as CSSProperties;
  const words = (text: string) =>
    text.split(/(\s+)/).map((part, k) =>
      part.trim() === '' ? part : (
        <span key={k} className="sink" style={sink()}>
          {part}
        </span>
      ),
    );
  const sentence = (
    <>
      {words('Sit ')}
      <Phrase name="How" onOpen={() => setOpen('m')} style={sink()}>
        {guided ? 'with a guide' : 'by yourself'}
      </Phrase>
      {/* A guided sitting is the session's: it ends on the shared bell. */}
      {guided ? (
        words(` until the bell${bellLabel ? ` at ${bellLabel}` : ''}`)
      ) : (
        <>
          {together ? ' ' : words(' for ')}
          <Phrase name="How long" onOpen={() => setOpen('t')} style={sink()}>
            {together ? `until the bell${bellLabel ? ` at ${bellLabel}` : ''}` : minutes(prefs.timerMinutes)}
          </Phrase>
        </>
      )}
      {words(', end with ')}
      <Phrase name="The bell" onOpen={() => setOpen('b')} style={sink()}>
        {BELL_WORDS[prefs.endBell]}
      </Phrase>
      {words(sound === 'silence' ? ', in ' : ', with ')}
      {/* The full stop stays with the last phrase, never a line of its own. */}
      <span className="whitespace-nowrap">
        <Phrase name="Sound" onOpen={() => setOpen('s')} style={sink()}>
          {SOUND_WORDS[sound]}
        </Phrase>
        <span className="sink" style={sink()}>
          .
        </span>
      </span>
    </>
  );

  const pickSound = (slug: TrackSlug | 'silence') => {
    const patch: MixPatch = {};
    for (const t of TRACKS) patch[t.slug] = t.slug === slug ? 1 : 0;
    onSound(patch);
  };

  return (
    <div
      className={`relative flex h-full w-full flex-col px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-14 lg:px-24 ${
        leaving ? 'pointer-events-none' : ''
      }`}
      inert={leaving}
      data-leaving={leaving || undefined}
      onClick={(e) => {
        // Only bare water: never a phrase, a list, Begin, the menu or a word.
        const hit = e.target as Element;
        if (hit.closest('button, a, input, [role="menu"], [role="dialog"], header, p')) return;
        onWater?.({ x: e.clientX, y: e.clientY });
      }}
    >
      <header className={`group/head flex items-center justify-between ${fade}`}>
        {/* On a phone the open account words need the wordmark's room too. */}
        <span className="flex transition-opacity duration-200 motion-reduce:transition-none max-sm:group-has-[[data-corner-open]]/head:pointer-events-none max-sm:group-has-[[data-corner-open]]/head:opacity-0">
          <Brand />
        </span>
        <div className="group flex items-baseline gap-3 text-caption text-ink-3">
          {clock && (
            <span className="tabular-nums transition-opacity duration-200 group-has-[[data-corner-open]]:opacity-0 motion-reduce:transition-none">
              {clock}
            </span>
          )}
          {/* The word's own padding pulled back into the gutter, so its ink
              ends on the same line the wordmark's ink starts from. */}
          <div className="-mr-2">{menu}</div>
        </div>
      </header>

      <div className="mt-auto max-w-[36rem]">
        {others !== null && others > 0 && (
          <p className={`mb-4 text-body text-ink-2 ${fade}`}>Each fish is someone sitting this hour.</p>
        )}
        <p
          className="font-display text-question leading-[1.35] text-ink-2 sm:text-question-lg"
          style={{ '--n': n } as CSSProperties}
        >
          {sentence}
        </p>
        {guided && <p className={`mt-3 text-body text-ink-3 ${fade}`}>{guide}.</p>}

        <button
          type="button"
          disabled={!ready}
          onClick={(e) => {
            const r = e.currentTarget.querySelector('[data-stone]')?.getBoundingClientRect();
            onBegin(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 });
          }}
          className={`mt-10 -ml-2 ${POND_ACTION}`}
        >
          {/* The pebble in your hand: it hands over to the thrown one, which
              fades up out of the same spot over the same fifth of a second. */}
          <span
            data-stone
            className={`block transition-opacity duration-200 ease-out motion-reduce:transition-none ${
              leaving ? 'opacity-0' : ''
            }`}
          >
            <Pebble />
          </span>
          <span className={fade}>Begin</span>
        </button>
      </div>

      {open === 'm' && (
        <Picker
          title="How you sit"
          value={guided ? 'guided' : 'alone'}
          options={SITTING_OPTIONS}
          onConfirm={(v) => {
            onGuided(v === 'guided');
            setOpen(null);
          }}
          onCancel={() => setOpen(null)}
        />
      )}
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
          onStop={stopPreviewBell}
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
  style,
  children,
}: {
  name: string;
  onOpen: () => void;
  /** Its place in the sentence, for the sink on Begin. */
  style?: CSSProperties;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`${name}: ${children}`}
      onClick={onOpen}
      className={`${PHRASE} sink text-ink`}
      style={style}
    >
      {children}
    </button>
  );
}
