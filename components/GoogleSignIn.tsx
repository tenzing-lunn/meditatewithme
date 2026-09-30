'use client';

import { useRef, useState } from 'react';
import { QUIET } from './controls';

export default function GoogleSignIn({ signIn, disabled, onError, onBusyChange }: {
  signIn: () => Promise<string | null>;
  disabled?: boolean;
  onError: (message: string | null) => void;
  onBusyChange: (busy: boolean) => void;
}) {
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
      onError('Could not start Google sign-in. Please try again.');
    } finally {
      pending.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  };
  return (
    <button type="button" disabled={disabled || busy} onClick={() => void start()}
      className={`${QUIET} w-full gap-3 disabled:opacity-60`}>
      <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0">
        <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" />
        <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.05v2.59A10 10 0 0 0 12 22Z" />
        <path fill="#FBBC05" d="M6.4 13.92a6 6 0 0 1 0-3.84V7.49H3.05a10 10 0 0 0 0 9.02l3.35-2.59Z" />
        <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.35 2.59C7.19 7.72 9.4 5.96 12 5.96Z" />
      </svg>
      {busy ? 'Connecting…' : 'Continue with Google'}
    </button>
  );
}
