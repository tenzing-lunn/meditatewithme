'use client';

import { useId, useState } from 'react';
import type { AuthState } from './useAuth';
import type { SyncStatus } from './useSyncPreferences';

/**
 * The account offer.
 *
 * WHAT IT PROMISES IS WHAT IT DOES
 * An account carries your practice and your settings between devices. It is not
 * what creates them: the log and the streak work signed out, in localStorage,
 * and always have. So the copy offers to carry them, not to save them — a guest
 * who is told to sign in "to save your practice" would reasonably conclude
 * theirs is not being kept, and it is.
 *
 * WHERE IT SITS
 * At the foot of the frame after a sitting, separated from the ending by the
 * whole height of the photograph. That gap is deliberate: everything in the
 * band above is about the sitting you just did, and this is the one thing on
 * screen that is about the product. In among the stats it read as another line
 * of the receipt. The sitting works identically signed out, which is the
 * promise the scope table makes with the word "optional".
 *
 * Closed, it is one button that says `Sign in`. What the account is *for* is on
 * the form that opens, next to the field asking for an address — a line of grey
 * explanation in front of somebody who has not decided to look yet is a caption
 * on a photograph, not an offer.
 */

export default function SignIn({
  state,
  sync,
  signIn,
  signOut,
  className,
}: {
  state: AuthState;
  sync: SyncStatus;
  signIn: (email: string) => Promise<string | null>;
  signOut: () => void;
  /**
   * The button style, handed in by the room.
   *
   * This sits at the foot of the frame now, on the photograph rather than in
   * the dark band above the flame, and `finished` is the brightest the room
   * ever is — the camera comes back at brightness 1.14 with the vignette all
   * but off. No colour of ink clears 4.5:1 down there. What does is a control
   * with its own surface, measured against that surface: `LIFTED` in `Room`.
   *
   * Passed rather than imported so this file does not have to know where in the
   * frame it has been put.
   */
  className?: string;
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
      <button type="button" onClick={signOut} className={className}>
        Sign out
        <span className="sr-only"> ({state.user.email})</span>
        {sync === 'error' && ' · not saved'}
      </button>
    );
  }

  if (sent) {
    return (
      <p className={className}>Check your email — the link signs you in.</p>
    );
  }

  if (!open) {
    return (
      // One button, and it says what it does. It used to be a line of grey
      // explanation with a grey phrase underneath it, which at the foot of a
      // photograph is a caption, not an offer. What the account is FOR belongs
      // on the form that opens, next to the field it is asking for — not in
      // front of somebody who has not decided to look yet.
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Sign in
      </button>
    );
  }

  return (
    <form
      // Centred, not left-aligned: this sits at the foot of the frame, on the
      // centre line the whole composition is built on.
      //
      // Its own surface, for the same reason the button that opened it has one
      // — see `className`. The field and the label are readable because of
      // this, not because of anything the photograph is doing behind it.
      className="rounded-control mx-auto flex w-full max-w-sm flex-col items-center gap-3 border border-white/20 bg-[#1c1410]/90 p-5"
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
      {/* Here, on the form, is where the reason belongs: somebody is being
          asked for their address and this is what it buys them. It is also
          honest about what an account is not — the log already works, signed
          out, and always has. */}
      <label htmlFor={emailId} className="text-center text-sm text-white/70">
        Every sitting is already logged on this device. An account carries it to
        your others.
      </label>

      <input
        id={emailId}
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        aria-label="Your email"
        className="focus-visible:border-ember focus-visible:ring-ember rounded-control min-h-11 w-full border border-white/25 bg-transparent px-5 text-center text-sm text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:outline-none"
      />

      {/* No password field, and so no reset flow — which is where most of the
          bugs in an auth implementation usually live. */}
      <button
        type="submit"
        disabled={sending}
        className="border-ember text-ember hover:bg-ember rounded-control focus-visible:ring-ember focus-visible:ring-offset-paper min-h-11 border px-7 text-sm transition-colors duration-500 hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
      >
        {sending ? 'Sending' : 'Send me a link'}
      </button>

      {error && (
        <p role="alert" className="max-w-[34ch] text-center text-xs text-white">
          {error}
        </p>
      )}
    </form>
  );
}
