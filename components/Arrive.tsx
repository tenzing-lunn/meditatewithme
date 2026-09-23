'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { TIMER_STOPS } from '@/lib/timer';
import { BELL_KINDS, type BellKind, type UserPreferences } from '@/lib/types';
import type { Point } from '@/lib/pond';
import Brand from './Brand';
import { FOCUS } from './controls';
import { TRACKS, type TrackSlug } from './mix';
import type { MixPatch } from './Sounds';

/**
 * The arrival, on the water: one sentence and Begin.
 *
 * What the rail asked across four screens (how long, which bell, what
 * sound, and the bowl) is one sentence here, and each choice in it is a
 * phrase you can press: *Sit for [15 minutes], end with [a singing bowl],
 * [in silence].* The sentence always reads as what will happen, so there is
 * nothing to confirm; Begin throws the stone.
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
  hum: 'a low hum',
  night: 'night sounds',
};

const PHRASE = `rounded-sm underline decoration-ink-3/60 decoration-1 underline-offset-[0.18em] transition-colors duration-200 hover:text-ember hover:decoration-ember motion-reduce:transition-none ${FOCUS}`;

const OPTION = `min-h-11 rounded-control px-3 text-left text-control transition-colors duration-150 hover:bg-ember-soft focus-visible:bg-ember-soft focus-visible:outline-none motion-reduce:transition-none`;

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
}) {
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
          <Phrase label={together ? `until the bell${bellLabel ? ` at ${bellLabel}` : ''}` : minutes(prefs.timerMinutes)} name="How long">
            {(close) => (
              <span className="grid grid-cols-4 gap-1">
                <span className="col-span-full px-3 pt-1 pb-1 text-caption text-ink-3">Minutes</span>
                {TIMER_STOPS.map((m) => (
                  <Option
                    key={m}
                    on={!together && prefs.timerMinutes === m}
                    onPick={() => {
                      update({ timerMinutes: m, untilBell: false });
                      close();
                    }}
                    label={minutes(m)}
                  >
                    {m}
                  </Option>
                ))}
                <Option
                  wide
                  on={together}
                  onPick={() => {
                    update({ untilBell: true, showCount: true });
                    close();
                  }}
                >
                  Until the bell{bellLabel ? ` at ${bellLabel}` : ''}, with everyone
                </Option>
              </span>
            )}
          </Phrase>
          {', end with '}
          <Phrase label={BELL_WORDS[prefs.endBell]} name="The bell">
            {(close) => (
              <span className="flex flex-col">
                {BELL_KINDS.map((kind) => (
                  <Option
                    key={kind}
                    on={prefs.endBell === kind}
                    onPick={() => {
                      update({ endBell: kind });
                      onPreviewBell(kind);
                      close();
                    }}
                  >
                    {BELL_WORDS[kind]}
                  </Option>
                ))}
              </span>
            )}
          </Phrase>
          {sound === 'silence' ? ', in ' : ', with '}
          <Phrase label={SOUND_WORDS[sound]} name="Sound">
            {(close) => (
              <span className="flex flex-col">
                {(['silence', ...TRACKS.map((t) => t.slug)] as const).map((slug) => (
                  <Option
                    key={slug}
                    on={sound === slug}
                    onPick={() => {
                      pickSound(slug);
                      close();
                    }}
                  >
                    {SOUND_WORDS[slug]}
                  </Option>
                ))}
              </span>
            )}
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
    </div>
  );
}

function minutes(m: number): string {
  return `${m} ${m === 1 ? 'minute' : 'minutes'}`;
}

/**
 * A phrase in the sentence, and the short list it opens. A menu of radio
 * items, closed by Escape, by a pick, or by pressing anywhere else.
 */
function Phrase({
  label,
  name,
  children,
}: {
  label: string;
  name: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef<HTMLSpanElement | null>(null);
  const button = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const list = box.current?.querySelector<HTMLElement>('[role="menu"]');
    (list?.querySelector<HTMLElement>('[aria-checked="true"]') ?? list?.querySelector<HTMLElement>('button'))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setOpen(false);
      button.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <span ref={box} className="relative inline">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`${name}: ${label}`}
        onClick={() => setOpen((v) => !v)}
        className={`${PHRASE} ${open ? 'text-ember decoration-ember' : 'text-ink'}`}
      >
        {label}
      </button>
      {open && (
        <span
          id={id}
          role="menu"
          aria-label={name}
          className="absolute bottom-full left-0 z-30 mb-2 block w-[min(20rem,calc(100vw-3rem))] rounded-card border border-rule bg-surface p-2 font-body text-ink shadow-menu"
        >
          {children(() => {
            setOpen(false);
            button.current?.focus();
          })}
        </span>
      )}
    </span>
  );
}

function Option({
  on,
  wide = false,
  label,
  onPick,
  children,
}: {
  on: boolean;
  wide?: boolean;
  /** When the words shown are not enough on their own: "15" is "15 minutes". */
  label?: string;
  onPick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={on}
      aria-label={label}
      onClick={onPick}
      className={`${OPTION} ${wide ? 'col-span-full' : ''} ${on ? 'font-semibold text-ember' : 'text-ink-2'}`}
    >
      {children}
    </button>
  );
}
