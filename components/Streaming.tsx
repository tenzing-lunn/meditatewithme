'use client';

import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { SERVICE_UNREACHABLE } from '@/lib/authErrors';
import { browserClient } from '@/lib/supabase';
import Switch from './Switch';
import { CHIP, CHIP_ON, FIELD, PRIMARY, QUIET_SM, WORD } from './controls';

type Stream = { name: string; showName: boolean; server: string; streamKey: string; url: string };

/** One call to `app/api/account/stream`, with this session's token. */
type Reply = { ok: boolean; approved?: boolean; admin?: boolean; application?: 'pending' | 'declined' | null; reason?: string };

async function call(method: string, body?: object): Promise<Reply & Partial<Stream>> {
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
 * Guiding, under Account.
 *
 * For a guide: where they stream to (`GuideKey`). For anyone else: a short
 * application — the name to be known by and a few words — which an admin
 * accepts or declines at `/admin`; once sent it says it is with us, and if
 * declined it says so plainly and lets them ask again. For an admin, a way
 * to `/admin` as well. Nothing shows until the first answer arrives.
 */
export default function Streaming({ heading }: { heading: ReactNode }) {
  const [reply, setReply] = useState<(Reply & Partial<Stream>) | null>(null);

  useEffect(() => {
    void call('GET')
      .then((r) => r.ok && setReply(r))
      .catch(() => {});
  }, []);

  if (!reply) return null;
  const adminLink = reply.admin && (
    <a href="/admin" className={`${WORD} self-start`}>
      Admin: guides, and who is on air
    </a>
  );

  if (reply.approved && whole(reply)) {
    return (
      <div className="flex flex-col gap-4">
        <GuideKey heading={heading} initial={{ ...reply, name: reply.name ?? '', showName: reply.showName === true }} />
        {adminLink}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {heading}
      <Apply application={reply.application ?? null} />
      {adminLink}
    </div>
  );
}

function Apply({ application }: { application: 'pending' | 'declined' | null }) {
  const id = useId();
  const [status, setStatus] = useState(application);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (status === 'pending') {
    return (
      <p className="text-body leading-relaxed text-ink-2">
        Your request to guide is with us. If it is accepted you will get an email, and
        your server and key will appear here.
      </p>
    );
  }

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const r = await call('PUT', { name, about });
      if (r.ok) setStatus('pending');
      else setNote(r.reason === 'empty' ? 'Both are needed.' : SERVICE_UNREACHABLE);
    } catch {
      setNote(SERVICE_UNREACHABLE);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body leading-relaxed text-ink-2">
        {status === 'declined'
          ? 'Your last request to guide was not taken up this time. You are welcome to ask again.'
          : 'Lead sittings on camera, for everyone who chooses to sit with a guide.'}
      </p>
      {!open ? (
        <button type="button" className={`${QUIET_SM} self-start`} onClick={() => setOpen(true)}>
          Ask to guide
        </button>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-4">
          <div>
            <label htmlFor={`${id}-name`} className="mb-1.5 block text-caption text-ink-3">
              The name viewers would know you by
            </label>
            <input id={`${id}-name`} type="text" maxLength={60} required value={name}
              onChange={(e) => setName(e.target.value)} className={FIELD} autoFocus />
          </div>
          <div>
            <label htmlFor={`${id}-about`} className="mb-1.5 block text-caption text-ink-3">
              Your practice, and how you would stream
            </label>
            <textarea id={`${id}-about`} maxLength={1000} required rows={5} value={about}
              onChange={(e) => setAbout(e.target.value)} className={`${FIELD} py-3`} />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={busy} className={PRIMARY}>
              {busy ? 'Send…' : 'Send'}
            </button>
            <button type="button" disabled={busy} className={WORD} onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
          <p role="status" className="min-h-4 text-caption leading-relaxed text-ink-3">{note ?? ''}</p>
        </form>
      )}
    </div>
  );
}

/**
 * Where an approved guide streams to: the server and key for most apps,
 * the one-line address Moblin takes, whether viewers are told their name,
 * and a way to make a new key if the old one got out.
 */
function GuideKey({ heading, initial }: { heading: ReactNode; initial: Stream }) {
  const id = useId();
  const [stream, setStream] = useState<Stream>(initial);
  const [reveal, setReveal] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

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
