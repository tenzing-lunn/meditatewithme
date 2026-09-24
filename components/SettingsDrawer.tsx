'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { localTime } from '@/lib/format';
import {
  TIMER_STOPS,
  clampMinutes,
  durationLabel,
  nextSharedBellAt,
  timerStopIndex,
} from '@/lib/timer';
import type { Room } from '@/lib/room';
import type { BellKind, UserPreferences } from '@/lib/types';
import { CHARACTER, Glyph } from './BellScreen';
import Sounds from './Sounds';
import { BELLS, previewBell, unlockAudio } from './audio';
import { FOCUS_ROOM, ICON_ROOM, PRIMARY_ROOM_SM, QUIET_ROOM_SM } from './controls';

/**
 * The three lines' drawer: from the right over Home, full height, with the
 * menu down it — Account, Settings, Your practice, Sign out. Settings opens
 * in place, a disclosure rather than a page, so every setting a sitting uses
 * is one press from the corner and Home stays behind it.
 *
 * Until 19 September 2026 Settings was the rail again — the time, bell and
 * sound questions one screen at a time, then Done. That is the right shape
 * for somebody being asked, and the wrong one for somebody changing one
 * thing: three screens to reach the bell. *Change* on Home's bar opens this
 * same drawer with Settings already open.
 *
 * Choosing a bell rings it, as on the rail. Choosing a sound does not play
 * it: Home has no audio graph and building one here would start rain in
 * somebody's kitchen from a settings page. The level is set in the sitting.
 *
 * `onChange` rather than `update`: Home carries the skip switch with every
 * change (`useUsual`'s `forPrefs`), so a change made here never quietly
 * turns the questions back on.
 */
export default function SettingsDrawer({
  open,
  onClose,
  room,
  onAccount,
  onPractice,
  onSignOut,
  prefs,
  onChange,
  now,
}: {
  /** Closed, open on the menu, or open with Settings already expanded. */
  open: 'menu' | 'settings' | null;
  onClose: () => void;
  room: Room;
  onAccount: () => void;
  onPractice: () => void;
  onSignOut: () => void;
  prefs: UserPreferences;
  onChange: (patch: Partial<UserPreferences>) => void;
  now: number | null;
}) {
  const titleId = useId();
  const settingsId = useId();
  const [settings, setSettings] = useState(open === 'settings');
  const panel = useRef<HTMLDivElement>(null);
  const closer = useRef<HTMLButtonElement>(null);
  // Mounted for the length of the slide out, then let go.
  const [mounted, setMounted] = useState(open !== null);
  const [entered, setEntered] = useState(false);
  // Sign out asks once more in its row before it acts, the delete confirm's
  // pattern: it sits directly under Your practice, and one press that ends
  // the session on this device is one press too few.
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSettings(open === 'settings');
      setLeaving(false);
      setMounted(true);
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    const t = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(t);
  }, [open]);

  // Read through a ref: Home passes a new function every render, and the
  // effect below re-running on each one moved focus off the slider mid-drag.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open || !mounted) return;
    const back = document.activeElement as HTMLElement | null;
    closer.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      // Kept inside the page while it is open: the Home behind is inert.
      const stops = panel.current.querySelectorAll<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])',
      );
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      back?.focus();
    };
  }, [open, mounted]);

  if (!mounted) return null;

  return (
    <div data-room={room} className="fixed inset-0 z-40">
      <div
        aria-hidden
        onClick={onClose}
        className={`absolute inset-0 bg-scrim/45 transition-opacity duration-300 motion-reduce:transition-none ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute inset-y-0 right-0 flex w-full max-w-[26rem] flex-col border-l border-room-edge/60 bg-room text-room-ink transition-transform duration-300 ease-[var(--ease-lift)] motion-reduce:transition-none ${
          entered ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between gap-4 px-6 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-2">
          <h2 id={titleId} className="font-display text-section font-bold">
            Menu
          </h2>
          <button
            ref={closer}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className={ICON_ROOM}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <nav
          aria-labelledby={titleId}
          className="flex flex-1 flex-col overflow-y-auto px-6 pt-2 pb-[calc(2rem+env(safe-area-inset-bottom))]"
        >
          <button type="button" onClick={onAccount} className={ROW}>
            Account
          </button>
          <button
            type="button"
            aria-expanded={settings}
            aria-controls={settingsId}
            onClick={() => setSettings((v) => !v)}
            className={ROW}
          >
            Settings
            <svg
              viewBox="0 0 24 24"
              className={`size-5 transition-transform duration-200 motion-reduce:transition-none ${settings ? 'rotate-180' : ''}`}
              fill="none"
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {/* Collapsed by rows rather than height, so it opens to whatever it holds. */}
          <div
            id={settingsId}
            inert={!settings}
            className={`grid border-b border-room-edge/50 transition-[grid-template-rows] duration-300 ease-[var(--ease-lift)] motion-reduce:transition-none ${
              settings ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] border-b-transparent'
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-9 pt-4 pb-8">
                <Length prefs={prefs} onChange={onChange} now={now} />
                <Bells endBell={prefs.endBell} onPick={(endBell) => onChange({ endBell })} />
                <Underneath prefs={prefs} onChange={onChange} />
              </div>
            </div>
          </div>
          <button type="button" onClick={onPractice} className={ROW}>
            Your practice
          </button>
          {!leaving ? (
            <button type="button" onClick={() => setLeaving(true)} className={ROW}>
              Sign out
            </button>
          ) : (
            <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-room-edge/50 py-3">
              <p className="text-masthead font-semibold text-room-ink">Sign out?</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setLeaving(false)} className={PRIMARY_ROOM_SM}>
                  Stay
                </button>
                <button type="button" onClick={onSignOut} className={QUIET_ROOM_SM}>
                  Yes, sign out
                </button>
              </div>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}

/** A row on the menu is a control, so it is Nunito 600 like every other. */
const ROW = `flex min-h-14 w-full items-center justify-between gap-4 border-b border-room-edge/50 text-left text-masthead font-semibold text-room-ink transition-colors duration-200 hover:text-room-action motion-reduce:transition-none ${FOCUS_ROOM}`;

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-body font-semibold text-room-ink">
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

const tile = (on: boolean) =>
  `flex flex-col items-start gap-1.5 rounded-card border p-3 text-left transition-colors duration-200 motion-reduce:transition-none ${FOCUS_ROOM} ${
    on
      ? 'border-room-action bg-room-action/15 text-room-action'
      : 'border-room-edge text-room-ink-2 hover:border-room-action hover:text-room-action'
  }`;

/**
 * The length, on the timer's stops, and one more past the last: until the
 * shared bell. The bell is with everyone, so choosing it chooses the door
 * too; by yourself a stored `untilBell` shows as the length, since no bell
 * will ring for it.
 */
function Length({
  prefs,
  onChange,
  now,
}: {
  prefs: UserPreferences;
  onChange: (patch: Partial<UserPreferences>) => void;
  now: number | null;
}) {
  const bellLabel = now === null ? null : localTime(nextSharedBellAt(now));
  const stops = TIMER_STOPS.length;
  const untilBell = prefs.untilBell && prefs.showCount;
  const stop = untilBell ? TIMER_STOPS.length : timerStopIndex(prefs.timerMinutes);
  const duration = durationLabel(prefs.timerMinutes);
  const said = untilBell
    ? `Until the bell${bellLabel ? ` at ${bellLabel}` : ''}`
    : `${duration.value} ${duration.unit}`;

  return (
    <Section title="How long">
      <p aria-hidden className="font-display text-sentence leading-none font-bold text-room-action tabular-nums">
        {untilBell ? (
          <>Until {bellLabel ?? 'the bell'}</>
        ) : (
          <>
            {duration.value} <span className="text-masthead text-room-ink-2">{duration.unit}</span>
          </>
        )}
      </p>
      <input
        type="range"
        min={0}
        max={stops}
        step={1}
        value={stop}
        aria-label="How long to sit"
        aria-valuetext={said}
        onChange={(e) => {
          const i = Number(e.target.value);
          if (i === TIMER_STOPS.length) {
            onChange({ untilBell: true, showCount: true });
            return;
          }
          onChange({
            timerMinutes: clampMinutes(TIMER_STOPS[i] ?? prefs.timerMinutes),
            untilBell: false,
          });
        }}
        className="room-range range-room w-full"
        style={{ '--range-fill': `${(stop / stops) * 100}%` } as CSSProperties}
      />
      <div aria-hidden className="flex justify-between text-caption text-room-ink-2 tabular-nums">
        <span>{TIMER_STOPS[0]} min</span>
        <span>Until the bell</span>
      </div>
    </Section>
  );
}

/**
 * The three bells, the rail's cards smaller: one `radiogroup` of `radio`s
 * like `BellScreen`, so there is one tab stop and the arrows move the choice
 * and ring the bell they land on, as a tap does.
 */
function Bells({ endBell, onPick }: { endBell: BellKind; onPick: (kind: BellKind) => void }) {
  const kinds = Object.keys(BELLS) as BellKind[];
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);

  const ring = (kind: BellKind) => {
    onPick(kind);
    unlockAudio();
    previewBell(kind);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    const by =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (!by) return;
    e.preventDefault();
    const next = (i + by + kinds.length) % kinds.length;
    const kind = kinds[next];
    if (!kind) return;
    ring(kind);
    tiles.current[next]?.focus();
  };

  return (
    <Section title="The bell" aside={<span className="text-caption text-room-ink-2">Tap to hear</span>}>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="The bell">
        {kinds.map((kind, i) => {
          const chosen = endBell === kind;
          return (
            <button
              key={kind}
              ref={(el) => {
                tiles.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={chosen}
              tabIndex={chosen ? 0 : -1}
              onClick={() => ring(kind)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={tile(chosen)}
            >
              <Glyph kind={kind} />
              <span className={`text-control leading-tight font-semibold ${chosen ? '' : 'text-room-ink'}`}>
                {BELLS[kind].label}
              </span>
              <span className="text-caption leading-snug text-room-ink-2">{CHARACTER[kind]}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

/**
 * Silence, or any of the five beds, with their levels and one Volume — the
 * same control as the rail's Sound step and the sheet during a sitting.
 *
 * Until 20 September 2026 this was the tiles alone, with a line saying to set
 * the level while sitting, and it was the only one of the three places that
 * could not. Nothing rings here: Home has no audio graph and building one
 * from a settings page would start rain in somebody's kitchen, so this writes
 * the mix that the next sitting opens with.
 */
function Underneath({
  prefs,
  onChange,
}: {
  prefs: UserPreferences;
  onChange: (patch: Partial<UserPreferences>) => void;
}) {
  return (
    <Section title="Underneath" aside={<span className="text-caption text-room-ink-2">Heard in the sitting</span>}>
      <Sounds
        mix={prefs.soundMix}
        onSound={(patch) => onChange({ soundMix: { ...prefs.soundMix, ...patch } })}
      />
    </Section>
  );
}
