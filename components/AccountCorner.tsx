'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { localTime } from '@/lib/format';
import { NAME_MAX, ORIGIN_MAX, composeLabel } from '@/lib/label';
import { humanMinutes, type PracticeEntry } from '@/lib/practice';
import Brand from './Brand';
import Practice from './Practice';
import Switch from './Switch';
import { CHIP, CHIP_ON, FIELD, PRIMARY, QUIET, WORD } from './controls';
import type { Profile } from '@/lib/label';

type Page = 'account' | 'settings' | 'layout';

const WORDS: { page: Page; label: string }[] = [
  { page: 'account', label: 'Account' },
  { page: 'settings', label: 'Settings' },
  { page: 'layout', label: 'Layout' },
];

/**
 * The corner, for somebody signed in: their name, where a guest has *Sign in*.
 *
 * Pressing it fades the name and slides *Account · Settings · Layout* out of
 * the place it stood; pressing elsewhere, Escape, or a word slides them back
 * in and the name returns. Each word opens its page over the pond.
 *
 * The slide is measured rather than guessed: each word starts pushed right by
 * exactly the distance between its own right edge and the corner's, so all
 * three begin stacked where the name is. Transform and opacity only.
 */
export default function AccountCorner({
  name,
  email,
  entries,
  now,
  profile,
  onProfile,
  updateName,
  updateEmail,
  signOut,
  deleteAccount,
}: {
  name: string | undefined;
  email: string | undefined;
  entries: PracticeEntry[];
  now: number | null;
  profile: Profile;
  onProfile: (patch: Partial<Profile>) => void;
  updateName: (name: string) => Promise<string | null>;
  updateEmail: (email: string) => Promise<string | null>;
  signOut: () => void;
  deleteAccount: () => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<Page | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const words = useRef<(HTMLButtonElement | null)[]>([]);
  const [offsets, setOffsets] = useState<number[]>([]);

  // First name in the corner: it is a label, not a greeting, and a full name
  // pushes the clock off a phone's header. The email's first part stands in
  // for an account that was never given a name.
  const shown = name?.split(/\s+/)[0] ?? email?.split('@')[0] ?? 'Account';

  // Layout offsets rather than bounding rects: a rect includes the word's
  // own transform, so measuring a closed corner would read every slide as 0.
  const measure = useCallback(() => {
    setOffsets(
      words.current.map((w) =>
        w?.offsetParent ? (w.offsetParent as HTMLElement).offsetWidth - (w.offsetLeft + w.offsetWidth) : 0,
      ),
    );
  }, []);
  useLayoutEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) words.current[0]?.focus();
  }, [open]);

  const choose = (to: Page) => {
    setOpen(false);
    setPage(to);
  };

  return (
    <>
      <div ref={wrap} data-corner-open={open || undefined} className="relative flex items-center justify-end">
        {/* Laid over the corner rather than beside it, so the closed words take
            no room; while open they cover where the clock was, and `Arrive`
            fades the clock for them. */}
        <nav aria-label="Your account" aria-hidden={!open} className={`absolute inset-y-0 right-0 flex items-center gap-1 ${open ? '' : 'pointer-events-none'}`}>
          {WORDS.map((w, i) => (
            <button
              key={w.page}
              ref={(el) => {
                words.current[i] = el;
              }}
              type="button"
              tabIndex={open ? 0 : -1}
              onClick={() => choose(w.page)}
              style={{
                transform: open ? 'none' : `translateX(${offsets[i] ?? 0}px)`,
                // Out from the name, the nearest first; back in, the farthest first.
                transitionDelay: `${(open ? WORDS.length - 1 - i : i) * 40}ms`,
              }}
              className={`${WORD} transition-[transform,opacity,color] duration-300 ease-out motion-reduce:transition-none ${
                open ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              {w.label}
            </button>
          ))}
        </nav>
        <button
          ref={trigger}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-label={`${shown}: account, settings and layout`}
          tabIndex={open ? -1 : 0}
          // Gone at once on the way out, and back only once the words have
          // slid home, so the two are never on top of each other.
          style={{ transitionDelay: open ? '0ms' : '260ms' }}
          className={`${WORD} max-w-[10rem] truncate transition-opacity duration-200 motion-reduce:transition-none ${
            open ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          <span className="truncate">{shown}</span>
        </button>
      </div>

      {page !== null && (
        <Sheet title={WORDS.find((w) => w.page === page)!.label} onClose={() => setPage(null)}>
          {page === 'account' && (
            <AccountPage
              name={name}
              email={email}
              entries={entries}
              now={now}
              updateName={updateName}
              updateEmail={updateEmail}
              signOut={signOut}
              deleteAccount={deleteAccount}
            />
          )}
          {page === 'settings' && <SettingsPage name={name} profile={profile} onProfile={onProfile} />}
          {page === 'layout' && (
            <p className="text-body leading-relaxed text-ink-2">
              Themes are on their way. Soon you will be able to change how the whole
              place looks, from the water to the words.
            </p>
          )}
        </Sheet>
      )}
    </>
  );
}

/** A page over the pond: the brand, its title, a way back, its content. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-paper text-ink"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between gap-4">
          <Brand />
          <button type="button" onClick={onClose} className={WORD}>
            Back
          </button>
        </header>
        <section className="flex flex-col gap-8 py-8">
          <h1 className="font-display text-question font-bold leading-[1.15]">{title}</h1>
          {children}
        </section>
      </div>
    </div>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="text-caption font-semibold tracking-wide text-ink-3 uppercase">{children}</h2>;
}

/**
 * The account: what to call you, the address, the practice log, and the two
 * ways out. No red, on purpose — there is no danger colour in this palette;
 * the safe choice, Keep it, takes the picked-chip treatment.
 */
function AccountPage({
  name,
  email,
  entries,
  now,
  updateName,
  updateEmail,
  signOut,
  deleteAccount,
}: {
  name: string | undefined;
  email: string | undefined;
  entries: PracticeEntry[];
  now: number | null;
  updateName: (name: string) => Promise<string | null>;
  updateEmail: (email: string) => Promise<string | null>;
  signOut: () => void;
  deleteAccount: () => Promise<string | null>;
}) {
  const nameId = useId();
  const emailId = useId();
  const [nameDraft, setNameDraft] = useState(name ?? '');
  const [emailDraft, setEmailDraft] = useState(email ?? '');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameChanged = nameDraft.trim() !== (name ?? '');
  const emailChanged = emailDraft.trim() !== '' && emailDraft.trim() !== (email ?? '');

  return (
    <div className="flex flex-col gap-10">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!nameChanged && !emailChanged) return;
          setSaving(true);
          setNote(null);
          const nameError = nameChanged ? await updateName(nameDraft) : null;
          const emailError = !nameError && emailChanged ? await updateEmail(emailDraft) : null;
          setSaving(false);
          setNote(
            nameError ??
              emailError ??
              (emailChanged
                ? `We have sent a link to ${emailDraft.trim()}. The address changes once you follow it.`
                : 'Saved.'),
          );
        }}
      >
        <div>
          <label htmlFor={nameId} className="mb-1.5 block text-caption text-ink-3">
            Your name
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
          <label htmlFor={emailId} className="mb-1.5 block text-caption text-ink-3">
            Email
          </label>
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            spellCheck={false}
            autoCapitalize="none"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            className={FIELD}
          />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving || (!nameChanged && !emailChanged)} className={PRIMARY}>
            {saving ? 'Save…' : 'Save'}
          </button>
          <p role="status" className="text-caption leading-relaxed text-ink-3">
            {note ?? ''}
          </p>
        </div>
      </form>

      <div className="flex flex-col gap-4">
        <Heading>Your practice</Heading>
        <div className="flex justify-center">
          <Practice entries={entries} now={now ?? Date.now()} />
        </div>
        <RecentSittings entries={entries} />
      </div>

      <div className="flex flex-col items-start gap-4 border-t border-rule pt-6">
        <button type="button" onClick={signOut} className={QUIET}>
          Sign out
        </button>
        {!confirming ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
            className={WORD}
          >
            Delete account
          </button>
        ) : (
          <div className="w-full rounded-card border border-rule bg-surface p-4">
            <p className="text-control leading-relaxed">
              This removes your account and everything it holds: your email address,
              your name, where you are from, your settings, and the sittings synced to
              it. It cannot be undone.
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
                  // No success branch: the account is gone and the corner
                  // becomes Sign in underneath this page.
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
 * General preferences. For now the one that exists: whether your name and
 * place are shown to others while you sit with them. Animations, sound and
 * your own sounds are to come.
 */
function SettingsPage({
  name,
  profile,
  onProfile,
}: {
  name: string | undefined;
  profile: Profile;
  onProfile: (patch: Partial<Profile>) => void;
}) {
  const originId = useId();
  const [originDraft, setOriginDraft] = useState(profile.origin ?? '');
  const [shareDraft, setShareDraft] = useState(profile.share === true);
  const [note, setNote] = useState<string | null>(null);
  const label = composeLabel(name ?? '', originDraft) ?? 'you';

  return (
    <div className="flex flex-col gap-10">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onProfile({ origin: originDraft.trim() || null, share: shareDraft });
          setNote('Saved.');
        }}
      >
        <Heading>Privacy</Heading>
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
              Let others see <em className="not-italic text-ink">{label}</em> while you sit
              with them
            </>
          }
          description="Off, and nobody sees your name or where you are from."
        />
        <div className="flex items-center gap-3">
          <button type="submit" className={PRIMARY}>
            Save
          </button>
          <p role="status" className="text-caption text-ink-3">
            {note ?? ''}
          </p>
        </div>
      </form>

      <p className="text-caption leading-relaxed text-ink-3">
        Coming soon: animations, sound, and adding your own sounds.
      </p>
    </div>
  );
}

/**
 * The last few sittings. Not a scoreboard: no targets, nothing missing. A
 * sitting ended early is marked, quietly, because it is a different fact.
 */
function RecentSittings({ entries }: { entries: PracticeEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-control text-ink-3">Nothing here yet. Your first sitting will be at the top.</p>;
  }
  return (
    <ul className="flex flex-col">
      {entries.slice(0, 8).map((entry) => (
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
            {!entry.completed && <span className="text-caption text-ink-3"> · ended early</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * "Today", "Yesterday", or a date. Calendar fields rather than millisecond
 * arithmetic: a day's milliseconds land on the same local day twice a year
 * in DST countries.
 */
function dayLabel(atMs: number): string {
  const d = new Date(atMs);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
  });
}
