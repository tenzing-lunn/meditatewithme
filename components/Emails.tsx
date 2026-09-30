'use client';

import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import { SERVICE_UNREACHABLE, emailReasonMessage } from '@/lib/authErrors';
import { browserClient } from '@/lib/supabase';
import { FIELD, PRIMARY, QUIET, WORD } from './controls';

type List = { main: string; others: string[] };

/** One call to `app/api/account/emails`, with this session's token. */
async function call(method: string, body?: object): Promise<{ ok: boolean; reason?: string } & Partial<List>> {
  const client = await browserClient();
  const token = (await client.auth.getSession()).data.session?.access_token;
  if (!token) return { ok: false };
  const response = await fetch('/api/account/emails', {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}

/**
 * The addresses on the account. Every one signs in; the first is the main
 * one, where our own emails go. *Connect another email* sends a code to the
 * new address and adds it once the code comes back; any address can be
 * removed while another is left, and removing the main one hands that role
 * to the newest (`app/api/account/emails`).
 */
export default function Emails({ email }: { email: string | undefined }) {
  const id = useId();
  const [list, setList] = useState<List | null>(email ? { main: email, others: [] } : null);
  const [adding, setAdding] = useState<'no' | 'email' | 'code'>('no');
  const [draft, setDraft] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const take = useCallback((reply: Partial<List>) => {
    if (reply.main !== undefined && reply.others) setList({ main: reply.main, others: reply.others });
  }, []);

  useEffect(() => {
    void call('GET').then(take).catch(() => {});
  }, [take]);

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

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (adding === 'email') {
        const reply = await call('POST', { email: draft });
        if (!reply.ok) return setNote(emailReasonMessage(reply.reason));
        setCode('');
        setAdding('code');
      } else {
        const reply = await call('PUT', { email: draft, code });
        if (!reply.ok) return setNote(emailReasonMessage(reply.reason));
        take(reply);
        setAdding('no');
        setDraft('');
        setNote(`${draft.trim()} is connected. You can sign in with it now.`);
      }
    });
  };

  const remove = (address: string) =>
    void run(async () => {
      const reply = await call('DELETE', { email: address });
      if (!reply.ok) return setNote(emailReasonMessage(reply.reason));
      take(reply);
      // The main address moved: refresh so the session's user carries it.
      if (address === list?.main) await (await browserClient()).auth.refreshSession();
      setNote(`${address} is removed.`);
    });

  const all = list ? [list.main, ...list.others] : [];

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {all.map((address, i) => (
          <li key={address} className="flex flex-wrap items-center justify-between gap-x-3">
            <span className="min-w-0 break-all text-body text-ink">
              {address}
              {i === 0 && all.length > 1 && <span className="text-caption text-ink-3"> · main</span>}
            </span>
            {all.length > 1 && (
              <button type="button" disabled={busy} className={WORD} onClick={() => remove(address)}>
                Remove<span className="sr-only"> {address}</span>
              </button>
            )}
          </li>
        ))}
      </ul>

      {adding === 'no' ? (
        <button type="button" className={`${QUIET} self-start`}
          onClick={() => { setNote(null); setDraft(''); setAdding('email'); }}>
          Connect another email
        </button>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label htmlFor={`${id}-${adding}`} className="text-caption text-ink-3">
            {adding === 'email' ? 'Another email' : `The six-digit code sent to ${draft.trim()}`}
          </label>
          {adding === 'email' ? (
            <input id={`${id}-email`} type="email" autoComplete="email" spellCheck={false} autoCapitalize="none"
              required value={draft} onChange={(e) => setDraft(e.target.value)} className={FIELD} autoFocus />
          ) : (
            <input id={`${id}-code`} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}"
              maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={FIELD} autoFocus />
          )}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={busy || (adding === 'code' && code.length !== 6)} className={PRIMARY}>
              {adding === 'email' ? 'Send me a code' : 'Connect'}{busy ? '…' : ''}
            </button>
            <button type="button" disabled={busy} className={WORD} onClick={() => { setAdding('no'); setNote(null); }}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <p role="status" className="min-h-4 text-caption leading-relaxed text-ink-3">{note ?? ''}</p>
    </div>
  );
}
