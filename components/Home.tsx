'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { serverNow, syncClock } from '@/lib/clock';
import { localTime } from '@/lib/format';
import { NAME_MAX, ORIGIN_MAX, composeLabel } from '@/lib/label';
import { humanMinutes, type PracticeEntry } from '@/lib/practice';
import { nextSharedBellAt } from '@/lib/timer';
import type { UserPreferences } from '@/lib/types';
import Menu from './Menu';
import { Doors, type Mode } from './ModeScreen';
import Practice from './Practice';
import Switch from './Switch';
import Wordmark from './Wordmark';
import { CHIP, CHIP_ON, FIELD, PRIMARY, QUIET } from './controls';
import { settingsLine } from './settingsLine';
import { useCount } from './useCount';
import { useProfile } from './useProfile';
import { useUsual } from './useUsual';

/**
 * Home, for somebody signed in.
 *
 * It goes straight to the two doors: with others, or by yourself. Under
 * them, the settings the next sitting will use and a switch to skip the
 * questions, so a person who always sits the same way presses one door and
 * meets the bowl. Everything else is behind the three lines in the corner:
 * the account, the settings, the practice log, and the way out.
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
  onSettings,
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
  /** The three questions, from the menu. */
  onSettings: () => void;
  signOut: () => void;
  deleteAccount: () => Promise<string | null>;
  updateName: (name: string) => Promise<string | null>;
}) {
  const now = useCorrectedClock();
  const { count } = useCount();
  const { usual, setUsual, answered } = useUsual(prefs);
  const { profile, setProfile } = useProfile({ userId, name });
  const [panel, setPanel] = useState<'account' | 'practice' | null>(null);

  const mode: Mode = prefs.showCount ? 'together' : 'alone';
  const bellLabel = now === null ? null : localTime(nextSharedBellAt(now));

  return (
    <main className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between gap-4">
          <Wordmark size="sm" />
          <Menu
            items={[
              { label: 'Account', onSelect: () => setPanel('account') },
              { label: 'Settings', onSelect: onSettings },
              { label: 'Your practice', onSelect: () => setPanel('practice') },
              { label: 'Sign out', onSelect: signOut },
            ]}
          />
        </header>

        {panel === null && (
          <div className="flex flex-1 flex-col justify-center gap-7 py-10">
            <div>
              <h1 className="font-display text-[1.75rem] font-bold leading-[1.15] sm:text-[2.25rem]">
                {name ? `Hello, ${name}.` : 'Welcome back.'}
              </h1>
              {count !== null && count >= 2 && (
                <p className="mt-3 text-[0.9375rem] font-semibold text-ember" role="status">
                  {count} people are sitting right now.
                </p>
              )}
            </div>

            <Doors mode={mode} bellLabel={bellLabel} onChoose={onDoor} />

            <div className="rounded-card border border-rule bg-surface p-5">
              <p className="text-[0.8125rem] text-ink-3">Your usual</p>
              <p className="mt-1 text-[0.9375rem] font-semibold">{settingsLine(prefs, now)}</p>
              <div className="mt-4">
                <Switch
                  checked={usual}
                  onChange={setUsual}
                  label="Skip the questions and use these"
                  description={
                    answered
                      ? 'A door goes straight to the bowl. Change anything from the menu and the questions come back once.'
                      : undefined
                  }
                />
              </div>
            </div>
          </div>
        )}

        {panel === 'account' && (
          <Panel title="Your account" onClose={() => setPanel(null)}>
            <AccountPanel
              email={email}
              name={name}
              origin={profile.origin}
              share={profile.share === true}
              sittings={entries.length}
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
        <h1 className="font-display text-[1.75rem] font-bold leading-[1.15]">{title}</h1>
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
  sittings,
  onName,
  onProfile,
  deleteAccount,
}: {
  email: string | undefined;
  name: string | undefined;
  origin: string | null;
  share: boolean;
  sittings: number;
  onName: (name: string) => Promise<string | null>;
  onProfile: (origin: string, share: boolean) => void;
  deleteAccount: () => Promise<string | null>;
}) {
  const nameId = useId();
  const originId = useId();
  const [nameDraft, setNameDraft] = useState(name ?? '');
  const [originDraft, setOriginDraft] = useState(origin ?? '');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = composeLabel(nameDraft, originDraft) ?? 'you';

  return (
    <div className="flex flex-col gap-8">
      <p className="text-[0.9375rem] break-words text-ink-3">{email ?? 'Signed in.'}</p>

      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setNote(null);
          const message = nameDraft.trim() !== (name ?? '') ? await onName(nameDraft) : null;
          onProfile(originDraft, share);
          setSaving(false);
          setNote(message ?? 'Saved.');
        }}
      >
        <div>
          <label htmlFor={nameId} className="mb-1.5 block text-[0.8125rem] text-ink-3">
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
          <label htmlFor={originId} className="mb-1.5 block text-[0.8125rem] text-ink-3">
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
          checked={share}
          onChange={(next) => onProfile(originDraft, next)}
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
            {saving ? 'Saving' : 'Save'}
          </button>
          <p role="status" className="text-[0.8125rem] text-ink-3">
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
            <p className="text-[0.9375rem] leading-relaxed">
              This removes your account and everything it holds: your email address,
              your name, where you are from, your settings, and
              {sittings === 1 ? ' the one sitting ' : ` the ${sittings} sittings `}
              synced to it. It cannot be undone.
            </p>
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-3">
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
                {busy ? 'Deleting' : 'Delete my account'}
              </button>
            </div>
            {error && (
              <p role="alert" className="mt-3 text-[0.8125rem] leading-relaxed text-ink-2">
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
      <p className="text-[0.9375rem] text-ink-3">
        Nothing here yet. Your first sitting will be at the top.
      </p>
    );
  }
  const recent = entries.slice(0, 8);
  return (
    <div>
      <h2 className="mb-3 text-[0.8125rem] text-ink-3">Recent sittings</h2>
      <ul className="flex flex-col">
        {recent.map((entry) => (
          <li
            key={entry.id}
            className="flex items-baseline justify-between gap-4 border-b border-rule py-2.5 last:border-b-0"
          >
            <span className="text-[0.9375rem] text-ink-2">
              {dayLabel(entry.startedAt)}
              <span className="text-ink-3 tabular-nums">
                {' · '}
                {localTime(entry.startedAt)}
              </span>
            </span>
            <span className="shrink-0 text-[0.9375rem] tabular-nums">
              {humanMinutes(entry.minutes)}
              {!entry.completed && (
                <span className="text-[0.8125rem] text-ink-3"> · ended early</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {entries.length > recent.length && (
        <p className="mt-4 text-[0.8125rem] text-ink-3 tabular-nums">
          and {entries.length - recent.length} more
        </p>
      )}
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
