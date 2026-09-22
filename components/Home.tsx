'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { serverNow, syncClock } from '@/lib/clock';
import { localTime } from '@/lib/format';
import { doorPatch, togetherLine, type Mode } from '@/lib/journey';
import { NAME_MAX, ORIGIN_MAX, composeLabel } from '@/lib/label';
import { humanMinutes, type PracticeEntry } from '@/lib/practice';
import { nextSharedBellAt } from '@/lib/timer';
import type { UserPreferences } from '@/lib/types';
import { Doors, EarthScene, LiveLine } from './ModeScreen';
import Practice from './Practice';
import RoomToggle from './RoomToggle';
import SettingsDrawer from './SettingsDrawer';
import Switch from './Switch';
import Wordmark from './Wordmark';
import { BELLS } from './audio';
import { CHIP, CHIP_ON, FIELD, FOCUS_ROOM, ICON, ICON_ROOM, PRIMARY, QUIET } from './controls';
import { durationAnswer, soundAnswer } from './settingsLine';
import { useCount } from './useCount';
import { useOrigin } from './useOrigin';
import { useProfile } from './useProfile';
import { useRoom } from './useRoom';
import { useUsual } from './useUsual';
import { useWorld } from './useWorld';

/**
 * Home, for somebody signed in.
 *
 * It is this hour's earth, full-bleed, with the two doors on it — the same
 * scene as the mode question (`EarthScene`), under a greeting. Under
 * them, one bar: the settings the next sitting will use, as three words that
 * open the settings drawer, and a switch to go straight to the bowl, so a
 * person who always sits the same way presses one door and meets the bowl.
 * Everything else is behind the three lines in the corner, which open the
 * same drawer on its menu: the account, the settings, the practice log, and
 * the way out.
 *
 * No time of day in the greeting: `now` is null until the clock has synced,
 * and a heading that changes half a second after it is read is a flicker on
 * the first thing anybody sees.
 */
export default function Home({
  prefs,
  update,
  entries,
  userId,
  email,
  name,
  onDoor,
  signOut,
  deleteAccount,
  updateName,
}: {
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  entries: PracticeEntry[];
  userId: string;
  email: string | undefined;
  /** Undefined for accounts that predate the name question. */
  name: string | undefined;
  /** A door. Runs inside the click, so the audio can be unlocked in it. */
  onDoor: (mode: Mode) => void;
  signOut: () => void;
  deleteAccount: () => Promise<string | null>;
  updateName: (name: string) => Promise<string | null>;
}) {
  const now = useCorrectedClock();
  const { count } = useCount();
  const { usual, setUsual } = useUsual(prefs);
  const { profile, setProfile } = useProfile({ userId, name });
  const [panel, setPanel] = useState<'account' | 'practice' | null>(null);
  const [drawer, setDrawer] = useState<'menu' | 'settings' | null>(null);
  // Read-only, like the count: the with-others door is drawn as this hour's earth.
  const world = useWorld(panel === null);
  const origin = useOrigin();
  const { room, toggle } = useRoom();

  const go = (to: 'account' | 'practice') => {
    setDrawer(null);
    setPanel(to);
  };
  const menuButton = (onRoom: boolean) => (
    <button
      type="button"
      onClick={() => setDrawer('menu')}
      aria-haspopup="dialog"
      aria-expanded={drawer !== null}
      aria-label="Menu"
      className={onRoom ? ICON_ROOM : ICON}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    </button>
  );
  const bellLabel = now === null ? null : localTime(nextSharedBellAt(now));

  // A change in the drawer keeps the skip switch as it was; see `useUsual`.
  const change = (patch: Partial<UserPreferences>) => {
    update(patch);
    if (usual) setUsual(true, { ...prefs, ...patch });
  };
  const sound = soundAnswer(prefs);
  const summary = [
    durationAnswer(prefs, now),
    BELLS[prefs.endBell].label,
    sound === 'in silence' ? 'Silence' : sound.charAt(0).toUpperCase() + sound.slice(1),
  ];

  const drawerEl = (
    <SettingsDrawer
      open={drawer}
      onClose={() => setDrawer(null)}
      room={room}
      onAccount={() => go('account')}
      onPractice={() => go('practice')}
      onSignOut={signOut}
      prefs={prefs}
      onChange={change}
      now={now}
    />
  );

  if (panel === null) {
    return (
      <EarthScene points={world.points} you={origin.cell} room={room} earth paused={drawer !== null} className="min-h-dvh">
        {/* The foot grows at `lg` with the side gutters: at 1.5rem against
            5rem sides the settings bar sat on the bottom edge of a laptop. */}
        <main id="main" className="flex min-h-dvh flex-col px-6 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-10 md:px-14 lg:px-20 lg:pb-[calc(3.5rem+env(safe-area-inset-bottom))] xl:px-24">
          <header className="flex items-center justify-between gap-4">
            <Wordmark size="sm" room />
            <div className="flex items-center gap-2">
              <RoomToggle room={room} onToggle={toggle} />
              {menuButton(true)}
            </div>
          </header>

          <div className="flex flex-1 flex-col justify-end gap-6 pt-16 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:content-end md:items-end md:gap-12">
            <div className="flex flex-col gap-2.5 md:gap-3.5">
              {/* useCount reads without beating, so nobody it counts is you. */}
              <LiveLine others={count} lit={world.points.length > 0} />
              <h1 className="font-display text-sentence leading-[1.08] font-bold tracking-[-0.015em] text-balance text-room-ink sm:text-sentence-sm lg:text-sentence-lg">
                {name ? `Hello, ${name}.` : 'Welcome back.'}
              </h1>
            </div>
            <Doors
              togetherLine={togetherLine(prefs, bellLabel)}
              onChoose={(m) => {
                // Written before the door's patch lands, so the journey
                // it opens reads a skip that matches the patched answers.
                if (usual) setUsual(true, { ...prefs, ...doorPatch(m, prefs) });
                onDoor(m);
              }}
            />
          </div>

          {/* One bar, on its own ground so it reads over the map: what the
              next sitting will be, which opens the drawer, and the skip. */}
          <div className="mt-6 flex flex-col gap-3 rounded-card border border-room-edge/50 bg-room/90 p-3 sm:p-4 md:flex-row md:items-center md:justify-between md:gap-8 md:py-3 md:pr-5 md:pl-4">
            <button
              type="button"
              onClick={() => setDrawer('settings')}
              aria-label={`Your sitting: ${summary.join(', ')}. Change`}
              className={`group flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2 rounded-control text-left ${FOCUS_ROOM}`}
            >
              <span className="text-control text-room-ink-2">
                Your sitting
              </span>
              <span className="flex flex-wrap gap-1.5">
                {summary.map((part) => (
                  <span
                    key={part}
                    className="rounded-full border border-room-edge px-3 py-1 text-control font-semibold text-room-ink transition-colors duration-200 group-hover:border-room-action motion-reduce:transition-none"
                  >
                    {part}
                  </span>
                ))}
              </span>
              <span className="text-control font-semibold text-room-action underline decoration-room-action/40 underline-offset-4 group-hover:decoration-room-action">
                Change
              </span>
            </button>
            <Switch room checked={usual} onChange={setUsual} label="Go straight to the bowl" />
          </div>

          {drawerEl}
        </main>
      </EarthScene>
    );
  }

  return (
    <main id="main" className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between gap-4">
          <Wordmark size="sm" />
          {menuButton(false)}
        </header>

        {panel === 'account' && (
          <Panel title="Your account" onClose={() => setPanel(null)}>
            <AccountPanel
              email={email}
              name={name}
              origin={profile.origin}
              share={profile.share === true}
              onName={updateName}
              onProfile={(origin, share) => setProfile({ origin, share })}
              deleteAccount={deleteAccount}
            />
          </Panel>
        )}

        {panel === 'practice' && (
          <Panel title="Your practice" onClose={() => setPanel(null)}>
            <div className="flex flex-col gap-8">
              <div className="flex justify-center">
                <Practice entries={entries} now={now ?? Date.now()} />
              </div>
              <RecentSittings entries={entries} />
            </div>
          </Panel>
        )}

        {drawerEl}
      </div>
    </main>
  );
}

/**
 * The corrected clock, at a pace a home needs: every thirty seconds, and
 * still `serverNow()` rather than `Date.now()`, because "the bell at" has
 * to name the same moment on a laptop whose clock is three minutes fast.
 * Null until the first tick, so nothing renders a time during SSR.
 */
function useCorrectedClock(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let timer: number | undefined;
    const tick = () => setNow(serverNow());
    void syncClock().then(() => {
      tick();
      timer = window.setInterval(tick, 30_000);
    });
    const onFocus = () => void syncClock().then(tick);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);
  return now;
}

/** A page behind the menu: a heading, a way back, and its content. */
function Panel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-1 flex-col gap-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-question font-bold leading-[1.15]">{title}</h1>
        <button type="button" onClick={onClose} className={QUIET}>
          Back
        </button>
      </div>
      {children}
    </section>
  );
}

/**
 * The account: what to call you, where you are from and whether others
 * see it, and the way out of the account altogether.
 *
 * NO RED, ON PURPOSE. There is no danger colour in this palette. The safe
 * choice, Keep it, takes the picked-chip treatment; the destructive one is
 * the plain bounded chip beside it.
 */
function AccountPanel({
  email,
  name,
  origin,
  share,
  onName,
  onProfile,
  deleteAccount,
}: {
  email: string | undefined;
  name: string | undefined;
  origin: string | null;
  share: boolean;
  onName: (name: string) => Promise<string | null>;
  onProfile: (origin: string, share: boolean) => void;
  deleteAccount: () => Promise<string | null>;
}) {
  const nameId = useId();
  const originId = useId();
  const [nameDraft, setNameDraft] = useState(name ?? '');
  const [originDraft, setOriginDraft] = useState(origin ?? '');
  // A draft like the two fields, committed by Save, as the origin question
  // on the rail does it. Until 22 September 2026 the switch saved at once,
  // and took the unsaved origin with it.
  const [shareDraft, setShareDraft] = useState(share);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = composeLabel(nameDraft, originDraft) ?? 'you';

  return (
    <div className="flex flex-col gap-8">
      <p className="text-control break-words text-ink-3">{email ?? 'Signed in.'}</p>

      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setNote(null);
          const message = nameDraft.trim() !== (name ?? '') ? await onName(nameDraft) : null;
          onProfile(originDraft, shareDraft);
          setSaving(false);
          setNote(message ?? 'Saved.');
        }}
      >
        <div>
          <label htmlFor={nameId} className="mb-1.5 block text-caption text-ink-3">
            What we call you
          </label>
          <input
            id={nameId}
            type="text"
            autoComplete="off"
            maxLength={NAME_MAX}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Your name"
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor={originId} className="mb-1.5 block text-caption text-ink-3">
            Where you are from
          </label>
          <input
            id={originId}
            type="text"
            autoComplete="off"
            maxLength={ORIGIN_MAX}
            value={originDraft}
            onChange={(e) => setOriginDraft(e.target.value)}
            placeholder="Lisbon, Portugal"
            className={FIELD}
          />
        </div>
        <Switch
          checked={shareDraft}
          onChange={setShareDraft}
          label={
            <>
              Let others see <em className="not-italic text-ink">{label}</em> while you
              sit with them
            </>
          }
          description="Only while you sit with others, and only while this is on."
        />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className={PRIMARY}>
            {saving ? 'Save…' : 'Save'}
          </button>
          <p role="status" className="text-caption text-ink-3">
            {note ?? ''}
          </p>
        </div>
      </form>

      <div className="border-t border-rule pt-6">
        {!confirming ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
            className={QUIET}
          >
            Delete account
          </button>
        ) : (
          <div className="rounded-card border border-rule bg-surface p-4">
            <p className="text-control leading-relaxed">
              This removes your account and everything it holds: your email address,
              your name, where you are from, your settings, and the sittings
              synced to it. It cannot be undone.
            </p>
            <p className="mt-3 text-caption leading-relaxed text-ink-3">
              Your practice log stays on this device. Closing the account only removes
              the copy we hold.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setConfirming(false);
                }}
                className={`${CHIP} ${CHIP_ON} flex-1`}
              >
                Keep it
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  const message = await deleteAccount();
                  // No success branch: `onAuthStateChange` fires and this
                  // whole page unmounts.
                  if (message) {
                    setError(message);
                    setBusy(false);
                  }
                }}
                className={`${CHIP} flex-1`}
              >
                {busy ? 'Delete my account…' : 'Delete my account'}
              </button>
            </div>
            {error && (
              <p role="alert" className="mt-3 text-caption leading-relaxed text-ink-2">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The last few sittings, as a list. Not a scoreboard: no targets, nothing
 * missing, nothing red. A sitting that was ended early is marked, quietly,
 * because "20 minutes" and "20 minutes, ended early" are different facts.
 */
function RecentSittings({ entries }: { entries: PracticeEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-control text-ink-3">
        Nothing here yet. Your first sitting will be at the top.
      </p>
    );
  }
  const recent = entries.slice(0, 8);
  return (
    <div>
      <h2 className="mb-3 text-caption text-ink-3">Recent sittings</h2>
      <ul className="flex flex-col">
        {recent.map((entry) => (
          <li
            key={entry.id}
            className="flex items-baseline justify-between gap-4 border-b border-rule py-2.5 last:border-b-0"
          >
            <span className="text-control text-ink-2">
              {dayLabel(entry.startedAt)}
              <span className="text-ink-3 tabular-nums">
                {' · '}
                {localTime(entry.startedAt)}
              </span>
            </span>
            <span className="shrink-0 text-control tabular-nums">
              {humanMinutes(entry.minutes)}
              {!entry.completed && (
                <span className="text-caption text-ink-3"> · ended early</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "Today", "Yesterday", or a date. Calendar fields, not millisecond
 * arithmetic, for the reason `lib/practice.ts` gives: subtracting a day's
 * milliseconds lands on the same local day twice a year in DST countries.
 */
function dayLabel(atMs: number): string {
  const d = new Date(atMs);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
  });
}
