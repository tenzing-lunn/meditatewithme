'use client';

import { useEffect, useRef, useState } from 'react';
import { APPLE, PRIMARY, QUIET } from './controls';

type Props = {
  signIn: () => Promise<string | null>;
  disabled?: boolean;
  onError: (message: string | null) => void;
  onBusyChange: (busy: boolean) => void;
};

/** One press at a time, its busy state reported up, its error handed back. */
function useStart({ signIn, disabled, onError, onBusyChange }: Props, name: string) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const start = async () => {
    if (pending.current || disabled) return;
    pending.current = true;
    setBusy(true);
    onBusyChange(true);
    onError(null);
    try {
      onError(await signIn());
    } catch {
      onError(`Could not start ${name} sign-in. Please try again.`);
    } finally {
      pending.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  };
  return { busy, start };
}

export default function GoogleSignIn({ primary = false, ...props }: Props & {
  /** The screen's one filled action; the mark then sits on a white disc. */
  primary?: boolean;
}) {
  const { busy, start } = useStart(props, 'Google');
  const { disabled } = props;
  return (
    <button type="button" disabled={disabled || busy} onClick={() => void start()}
      className={`${primary ? PRIMARY : QUIET} w-full gap-3 disabled:opacity-60`}>
      <svg aria-hidden viewBox="0 0 24 24" className={`shrink-0 ${primary ? 'size-6 rounded-full bg-white p-[3px]' : 'size-5'}`}>
        <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" />
        <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.05v2.59A10 10 0 0 0 12 22Z" />
        <path fill="#FBBC05" d="M6.4 13.92a6 6 0 0 1 0-3.84V7.49H3.05a10 10 0 0 0 0 9.02l3.35-2.59Z" />
        <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.35 2.59C7.19 7.72 9.4 5.96 12 5.96Z" />
      </svg>
      {busy ? 'Connecting…' : 'Continue with Google'}
    </button>
  );
}

// Whether Supabase has the Apple provider on, asked once per page load:
// until it is, the button is not shown at all rather than shown and refused.
let appleOn: Promise<boolean> | null = null;
function useAppleOn(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    appleOn ??= fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((settings) => settings?.external?.apple === true)
      .catch(() => false);
    let live = true;
    void appleOn.then((v) => live && setOn(v));
    return () => {
      live = false;
    };
  }, []);
  return on;
}

/**
 * Sign in with Apple, since 3 October 2026. Apple's rules for the button
 * (Human Interface Guidelines): black, the Apple mark in white, *Continue
 * with Apple*, and no smaller than any other way to sign in — so it is the
 * Google button's size, under it, and never the outlined one. Not shown
 * until Supabase has the provider on (`useAppleOn`). App Store
 * guideline 4.8 is why it is here at all: Google sign-in needs a private
 * equivalent beside it.
 */
export function AppleSignIn(props: Props) {
  const { busy, start } = useStart(props, 'Apple');
  const on = useAppleOn();
  if (!on) return null;
  return (
    <button type="button" disabled={props.disabled || busy} onClick={() => void start()}
      className={`${APPLE} w-full gap-3 disabled:opacity-60`}>
      <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0" fill="currentColor">
        <path d="M16.37 1.43c0 1.14-.49 2.27-1.18 3.08-.74.9-1.99 1.57-2.99 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.57-2.27 1.21-2.98.8-.94 2.14-1.64 3.25-1.68.03.13.05.28.05.43Zm4.56 15.71c-.03.07-.46 1.58-1.52 3.12-.94 1.34-1.94 2.71-3.43 2.71-1.52 0-1.9-.88-3.63-.88-1.7 0-2.3.91-3.67.91-1.38 0-2.33-1.26-3.43-2.8C4 18.38 2.96 15.57 2.96 12.92c0-4.28 2.8-6.55 5.55-6.55 1.45 0 2.68.95 3.6.95.87 0 2.22-1.01 3.9-1.01.62 0 2.89.06 4.38 2.19-.13.09-2.39 1.37-2.39 4.19 0 3.26 2.86 4.42 2.96 4.45Z" />
      </svg>
      {busy ? 'Connecting…' : 'Continue with Apple'}
    </button>
  );
}
