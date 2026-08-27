'use client';

import { useId, useState } from 'react';
import type { AuthState } from './useAuth';
import type { SyncStatus } from './useSyncPreferences';

/**
 * The account offer.
 *
 * WHAT IT PROMISES IS WHAT IT DOES
 * An account keeps your settings on every device. It does not keep a practice
 * log — there is no table, no policy and no view for one, and offering to
 * "save your practice" would be describing a feature that does not exist. When
 * a practice log is built the copy here changes; until then it stays honest.
 *
 * WHERE IT SITS
 * Underneath everything, small, and never in the way. This is the one part of
 * the page nobody came for. The sitting works identically signed out, which is
 * the promise the scope table makes with the word "optional".
 */

export default function SignIn({
  state,
  sync,
  signIn,
  signOut,
}: {
  state: AuthState;
  sync: SyncStatus;
  signIn: (email: string) => Promise<string | null>;
  signOut: () => void;
}) {
  const emailId = useId();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nothing to offer, or we don't know yet. Render nothing rather than a
  // control that flickers into existence under someone's cursor.
  if (state.status === 'loading' || state.status === 'unavailable') return null;

  if (state.status === 'signed-in') {
    return (
      <div className="text-ink-3 mt-10 flex flex-col items-center gap-1 font-mono text-xs tracking-[0.13em] uppercase">
        <span>
          {state.user.email}
          {sync === 'error' && ' · settings not saved'}
          {sync === 'syncing' && ' · saving'}
        </span>
        <button
          type="button"
          onClick={signOut}
          className="hover:text-ink-2 underline underline-offset-4 transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  if (sent) {
    return (
      <p className="text-ink-3 mt-10 max-w-[34ch] text-center font-mono text-xs leading-relaxed tracking-[0.13em] uppercase">
        Check your email. The link signs you in.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-ink-3 hover:text-ink-2 focus-visible:ring-ember focus-visible:ring-offset-paper mt-10 rounded-sm font-mono text-xs tracking-[0.13em] uppercase underline underline-offset-4 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Keep these settings on every device
      </button>
    );
  }

  return (
    <form
      className="mt-10 flex w-full max-w-sm flex-col items-center gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (sending) return;
        setSending(true);
        setError(null);
        const message = await signIn(email.trim());
        setSending(false);
        if (message) setError(message);
        else setSent(true);
      }}
    >
      <label
        htmlFor={emailId}
        className="text-ink-3 font-mono text-xs tracking-[0.13em] uppercase"
      >
        Your email
      </label>

      <input
        id={emailId}
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="border-ink-3 focus-visible:border-ember focus-visible:ring-ember w-full rounded-full border bg-transparent px-5 py-2.5 text-center text-sm focus-visible:ring-1 focus-visible:outline-none"
      />

      {/* No password field, and so no reset flow — which is where most of the
          bugs in an auth implementation usually live. */}
      <button
        type="submit"
        disabled={sending}
        className="border-ember text-ember hover:bg-ember focus-visible:ring-ember focus-visible:ring-offset-paper rounded-full border px-7 py-2.5 font-mono text-xs tracking-[0.15em] uppercase transition-colors duration-500 hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
      >
        {sending ? 'Sending' : 'Send me a link'}
      </button>

      {error && (
        <p role="alert" className="text-ink-2 max-w-[34ch] text-center text-xs">
          {error}
        </p>
      )}
    </form>
  );
}
