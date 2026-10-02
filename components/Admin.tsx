'use client';

import { useCallback, useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { SERVICE_UNREACHABLE } from '@/lib/authErrors';
import { localTime } from '@/lib/format';
import { browserClient } from '@/lib/supabase';
import Brand from './Brand';
import LiveStream from './LiveStream';
import Switch from './Switch';
import { CHIP, CHIP_ON, FIELD, PRIMARY, QUIET_SM, WORD } from './controls';

type Application = { userId: string; name: string; about: string; at: string; email: string | null };
type Guide = {
  slug: string;
  name: string;
  email: string | null;
  account: boolean;
  alone: boolean;
  showName: boolean;
  live: 'on-air' | 'waiting' | null;
  since: string | null;
  hls: string | null;
};
type State = { kind: 'loading' } | { kind: 'out' } | { kind: 'refused' } | { kind: 'in'; applications: Application[]; guides: Guide[] };

const POLL_MS = 10_000;

async function call(method: 'GET' | 'POST', body?: object): Promise<{ status: number; reply: Record<string, unknown> }> {
  const client = await browserClient();
  const token = (await client.auth.getSession()).data.session?.access_token;
  if (!token) return { status: 401, reply: {} };
  const response = await fetch('/api/admin', {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, reply: await response.json().catch(() => ({})) };
}

const REASONS: Record<string, string> = {
  'no-account': 'Nobody has an account with that address yet. Ask them to sign in on the site once, then add them.',
  already: 'They are already a guide.',
  gone: 'That request was already answered.',
  empty: 'An email and a name are both needed.',
};

/**
 * Jonny's page for the guides (`app/admin`).
 *
 * Who is connected now, first: on air, or waiting for a go-ahead, with a
 * silent preview, *Put on air* and *Shut off*. Then requests to guide, to
 * accept or decline; a way to add someone directly; and every guide, with
 * whether they go on air by themselves, a new key, and removing them.
 * Refreshes every ten seconds. Everything it does is checked again on the
 * server; this page is only a view.
 */
export default function Admin() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { status, reply } = await call('GET');
      if (status === 401) return setState({ kind: 'out' });
      if (status === 403) return setState({ kind: 'refused' });
      if (reply.ok)
        setState({ kind: 'in', applications: reply.applications as Application[], guides: reply.guides as Guide[] });
    } catch {
      // Keep what is showing; the next poll tries again.
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const act = async (body: object, done: string) => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const { reply } = await call('POST', body);
      if (!reply.ok) {
        setNote(REASONS[String(reply.reason)] ?? SERVICE_UNREACHABLE);
        return false;
      }
      setNote(reply.emailed === false ? `${done} The email to them could not be sent; tell them yourself.` : done);
      await load();
      return true;
    } catch {
      setNote(SERVICE_UNREACHABLE);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main" className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto flex w-full max-w-2xl flex-col px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(3rem+env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between gap-4">
          <Brand />
          <Link href="/" className={WORD}>
            Back
          </Link>
        </header>
        <h1 className="mt-8 font-display text-question font-bold leading-[1.15]">Guides</h1>
        <p role="status" className="mt-3 min-h-6 text-caption leading-relaxed text-ink-3">
          {note ?? ''}
        </p>

        {state.kind === 'loading' && <p className="mt-6 text-body text-ink-3">Loading…</p>}
        {state.kind === 'out' && (
          <p className="mt-6 text-body leading-relaxed text-ink-2">
            Sign in on the <Link href="/" className="underline underline-offset-4">site</Link> first, then come back
            here.
          </p>
        )}
        {state.kind === 'refused' && (
          <p className="mt-6 text-body leading-relaxed text-ink-2">This page is for the people who run the site.</p>
        )}
        {state.kind === 'in' && (
          <div className="mt-6 flex flex-col gap-12">
            <OnNow guides={state.guides.filter((g) => g.live !== null)} busy={busy} act={act} />
            <Requests applications={state.applications} busy={busy} act={act} />
            <AddGuide busy={busy} act={act} />
            <AllGuides guides={state.guides} busy={busy} act={act} />
          </div>
        )}
      </div>
    </main>
  );
}

type Act = (body: object, done: string) => Promise<boolean | undefined>;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-answer-sm font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

/** Asks once, in place, before an act that cannot be taken back. */
function Confirm({ label, question, busy, onYes }: { label: string; question: string; busy: boolean; onYes: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button type="button" disabled={busy} className={WORD} onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  return (
    <div className="w-full rounded-card border border-rule bg-surface p-4">
      <p className="text-control leading-relaxed">{question}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={`${CHIP} ${CHIP_ON} flex-1`} onClick={() => setAsking(false)}>
          Keep it
        </button>
        <button type="button" disabled={busy} className={`${CHIP} flex-1`} onClick={() => { setAsking(false); onYes(); }}>
          {label}
        </button>
      </div>
    </div>
  );
}

function OnNow({ guides, busy, act }: { guides: Guide[]; busy: boolean; act: Act }) {
  const [watching, setWatching] = useState<string | null>(null);
  return (
    <Section title="On now">
      {guides.length === 0 && <p className="text-body text-ink-3">Nobody is connected.</p>}
      {guides.map((g) => (
        <div key={g.slug} className="flex flex-col gap-3 border-b border-rule pb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="text-body text-ink">
              {g.name}
              <span className="text-caption text-ink-3">
                {' · '}
                {g.live === 'on-air' ? 'on air' : 'connected, waiting for you'}
                {g.since ? ` since ${localTime(Date.parse(g.since))}` : ''}
              </span>
            </p>
          </div>
          {watching === g.slug && g.hls && (
            <div className="relative aspect-video w-full overflow-hidden rounded-card border border-rule bg-scrim">
              <LiveStream src={g.hls} className="absolute inset-0 h-full w-full" />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {g.hls && (
              <button type="button" className={QUIET_SM} onClick={() => setWatching(watching === g.slug ? null : g.slug)}>
                {watching === g.slug ? 'Stop watching' : 'Watch (silent)'}
              </button>
            )}
            {g.live === 'waiting' && (
              <button type="button" disabled={busy} className={QUIET_SM}
                onClick={() => act({ action: 'on-air', slug: g.slug }, `${g.name} is on air until the end of this hour.`)}>
                Put on air
              </button>
            )}
            <Confirm
              label="Shut off"
              busy={busy}
              question={`Shut off ${g.name}? Viewers see that the session was stopped and will be back soon, their key stops working, and their connection is cut within half a minute. To have them back, add them again and they get a new key.`}
              onYes={() => void act({ action: 'shut-off', slug: g.slug }, `${g.name} is shut off.`)}
            />
          </div>
        </div>
      ))}
    </Section>
  );
}

function Requests({ applications, busy, act }: { applications: Application[]; busy: boolean; act: Act }) {
  return (
    <Section title="Asking to guide">
      {applications.length === 0 && <p className="text-body text-ink-3">No requests waiting.</p>}
      {applications.map((a) => (
        <div key={a.userId} className="flex flex-col gap-2 border-b border-rule pb-4">
          <p className="text-body text-ink">
            {a.name}
            <span className="break-all text-caption text-ink-3"> · {a.email ?? 'no email'}</span>
          </p>
          <p className="whitespace-pre-line text-body leading-relaxed text-ink-2">{a.about}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy} className={QUIET_SM}
              onClick={() => act({ action: 'accept', userId: a.userId }, `${a.name} can guide. They have been emailed.`)}>
              Accept
            </button>
            <button type="button" disabled={busy} className={WORD}
              onClick={() => act({ action: 'decline', userId: a.userId }, `${a.name}'s request is declined.`)}>
              Decline
            </button>
          </div>
        </div>
      ))}
    </Section>
  );
}

function AddGuide({ busy, act }: { busy: boolean; act: Act }) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await act({ action: 'invite', email, name }, `${name.trim()} can guide. They have been emailed.`)) {
      setEmail('');
      setName('');
    }
  };
  return (
    <Section title="Add a guide">
      <p className="text-caption leading-relaxed text-ink-3">
        For someone you already know. They need an account: they sign in on the site once first.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label htmlFor={`${id}-email`} className="text-caption text-ink-3">Their email</label>
        <input id={`${id}-email`} type="email" required autoComplete="off" spellCheck={false} autoCapitalize="none"
          value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} />
        <label htmlFor={`${id}-name`} className="text-caption text-ink-3">The name viewers would know them by</label>
        <input id={`${id}-name`} type="text" required maxLength={60} autoComplete="off"
          value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
        <button type="submit" disabled={busy} className={`${PRIMARY} self-start`}>
          Add
        </button>
      </form>
    </Section>
  );
}

function AllGuides({ guides, busy, act }: { guides: Guide[]; busy: boolean; act: Act }) {
  return (
    <Section title="Everyone who can guide">
      {guides.length === 0 && <p className="text-body text-ink-3">Nobody yet.</p>}
      {guides.map((g) => (
        <div key={g.slug} className="flex flex-col gap-3 border-b border-rule pb-4">
          <p className="text-body text-ink">
            {g.name}
            <span className="break-all text-caption text-ink-3">
              {' · '}
              {g.account ? g.email ?? 'account' : 'key sent by hand'}
              {g.showName ? ' · named to viewers' : ''}
            </span>
          </p>
          <Switch
            checked={g.alone}
            onChange={(on) =>
              void act({ action: 'alone', slug: g.slug, on }, on ? `${g.name} goes on air by themselves.` : `${g.name} waits for your go-ahead.`)
            }
            label="Goes on air by themselves"
            description={g.alone ? 'Shown as soon as they connect.' : 'Connected, they wait until you press Put on air.'}
          />
          <div className="flex flex-wrap items-center gap-2">
            {g.account && (
              <Confirm
                label="New key"
                busy={busy}
                question={`Give ${g.name} a new key? Their old one stops working the next time they connect; the new one is in their account.`}
                onYes={() => void act({ action: 'renew', slug: g.slug }, `${g.name} has a new key, in their account.`)}
              />
            )}
            <Confirm
              label="Remove"
              busy={busy}
              question={`Remove ${g.name} as a guide? Their key stops working, and a stream they are running is cut within half a minute.`}
              onYes={() => void act({ action: 'remove', slug: g.slug }, `${g.name} is no longer a guide.`)}
            />
          </div>
        </div>
      ))}
    </Section>
  );
}
