'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { SERVICE_UNREACHABLE } from '@/lib/authErrors';
import { browserClient } from '@/lib/supabase';
import Switch from './Switch';
import { CHIP, CHIP_ON, FIELD, QUIET_SM, WORD } from './controls';

type Stream = { name: string; showName: boolean; server: string; streamKey: string; url: string };

/** One call to `app/api/account/stream`, with this session's token. */
async function call(method: string, body?: object): Promise<{ ok: boolean; approved?: boolean } & Partial<Stream>> {
  const client = await browserClient();
  const token = (await client.auth.getSession()).data.session?.access_token;
  if (!token) return { ok: false };
  const response = await fetch('/api/account/stream', {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}

const whole = (r: Partial<Stream>): r is Stream =>
  typeof r.server === 'string' && typeof r.streamKey === 'string' && typeof r.url === 'string';

/**
 * Where an approved guide streams to, under Account.
 *
 * Nothing at all — not even the heading — for an account that is not
 * approved; approving is `npm run live:key -- approve`, never asked for
 * here. For one that is: the server and key for most apps, the one-line
 * address Moblin takes, whether viewers are told their name, and a way to
 * make a new key if the old one got out.
 */
export default function Streaming({ heading }: { heading: ReactNode }) {
  const id = useId();
  const [stream, setStream] = useState<Stream | null>(null);
  const [reveal, setReveal] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void call('GET')
      .then((r) => {
        if (r.ok && r.approved && whole(r)) setStream({ ...r, name: r.name ?? '', showName: r.showName === true });
      })
      .catch(() => {});
  }, []);

  if (!stream) return null;

  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNote(`${what} copied.`);
    } catch {
      setNote(`Could not copy. Press Show and copy the ${what.toLowerCase()} by hand.`);
    }
  };

  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      await work();
    } catch {
      setNote(SERVICE_UNREACHABLE);
    } finally {
      setBusy(false);
    }
  };

  const showName = (next: boolean) =>
    void run(async () => {
      const r = await call('PATCH', { showName: next });
      if (!r.ok) return setNote(SERVICE_UNREACHABLE);
      setStream({ ...stream, showName: next });
      setNote(next ? `Viewers will see “${stream.name} is guiding.”` : 'Viewers will not see your name.');
    });

  const renew = () =>
    void run(async () => {
      const r = await call('POST');
      if (!r.ok || !whole(r)) return setNote(SERVICE_UNREACHABLE);
      setStream({ ...stream, ...r });
      setRenewing(false);
      setReveal(true);
      setNote('This is your new key. Put it in your streaming app; the old one no longer works.');
    });

  const masked = `${stream.streamKey.split('?')[0]}?key=${'•'.repeat(12)}`;

  return (
    <div className="flex flex-col gap-4">
      {heading}
      <p className="text-body leading-relaxed text-ink-2">
        You can guide. Point your streaming app here, and you are on the water for
        everyone sitting with a guide.
      </p>

      <Field id={`${id}-server`} label="Server" value={stream.server}
        action={<button type="button" className={QUIET_SM} onClick={() => copy('Server', stream.server)}>Copy</button>} />
      <Field id={`${id}-key`} label="Stream key" value={reveal ? stream.streamKey : masked}
        action={
          <>
            <button type="button" className={WORD} aria-pressed={reveal} onClick={() => setReveal(!reveal)}>
              {reveal ? 'Hide' : 'Show'}
            </button>
            <button type="button" className={QUIET_SM} onClick={() => copy('Stream key', stream.streamKey)}>Copy</button>
          </>
        } />
      <Field id={`${id}-url`} label="Moblin, or any app that takes one address" value={reveal ? stream.url : `${stream.server}/${masked}`}
        action={<button type="button" className={QUIET_SM} onClick={() => copy('Address', stream.url)}>Copy</button>} />

      <Switch
        checked={stream.showName}
        onChange={showName}
        label="Show my name to viewers"
        description={`Under your video: “${stream.name} is guiding.” Off, it says only that it is live.`}
      />

      {!renewing ? (
        <button type="button" disabled={busy} className={`${WORD} self-start`} onClick={() => { setNote(null); setRenewing(true); }}>
          Make a new key
        </button>
      ) : (
        <div className="rounded-card border border-rule bg-surface p-4">
          <p className="text-control leading-relaxed">
            Your old key stops working the next time you connect, so do this only if it got
            out. A stream already running carries on.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" disabled={busy} className={`${CHIP} ${CHIP_ON} flex-1`} onClick={() => setRenewing(false)}>
              Keep it
            </button>
            <button type="button" disabled={busy} className={`${CHIP} flex-1`} onClick={renew}>
              {busy ? 'Make a new key…' : 'Make a new key'}
            </button>
          </div>
        </div>
      )}
      <p role="status" className="min-h-4 text-caption leading-relaxed text-ink-3">{note ?? ''}</p>
    </div>
  );
}

function Field({ id, label, value, action }: { id: string; label: string; value: string; action: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-caption text-ink-3">{label}</label>
      <input id={id} type="text" readOnly value={value} spellCheck={false} autoComplete="off"
        onFocus={(e) => e.currentTarget.select()} className={FIELD} />
      <div className="mt-2 flex items-center justify-end gap-2">{action}</div>
    </div>
  );
}
