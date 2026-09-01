'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { browserClient } from '@/lib/supabase';

/**
 * Who is signed in, if anyone.
 *
 * NOTHING HERE IS ALLOWED TO BREAK THE ROOM
 * Accounts are optional in the scope table and cuttable in the build order, and
 * that has to be true at runtime too, not just on paper. So every failure mode
 * — missing environment variables, an unreachable Supabase, a rejected token —
 * resolves to `unavailable` or `signed-out`, and the room carries on. Somebody
 * who came to meditate must never be shown an authentication error.
 *
 * `unavailable` is distinct from `signed-out` on purpose: signed-out means the
 * offer stands, unavailable means there is nothing to offer and the UI hides
 * itself rather than presenting a form that cannot work.
 */

export type AuthState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: User };

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let client;
    try {
      client = browserClient();
    } catch {
      // No configuration. Not an error worth surfacing — just no accounts.
      setState({ status: 'unavailable' });
      return;
    }

    let cancelled = false;

    // getSession resolves after detectSessionInUrl has consumed a magic-link
    // fragment, so arriving from an email lands here already signed in.
    client.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setState(
          data.session?.user
            ? { status: 'signed-in', user: data.session.user }
            : { status: 'signed-out' },
        );
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'signed-out' });
      });

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setState(
        session?.user
          ? { status: 'signed-in', user: session.user }
          : { status: 'signed-out' },
      );
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  /**
   * Send a magic link.
   *
   * No password means no password to choose, forget, reset, or reuse from
   * somewhere it has already leaked. It also means the entire reset flow —
   * which is where most auth bugs live — does not exist.
   *
   * Returns an error string rather than throwing, because every caller wants to
   * put it on screen.
   */
  const signIn = useCallback(async (email: string): Promise<string | null> => {
    try {
      const { error } = await browserClient().auth.signInWithOtp({
        email,
        options: {
          // Straight back to the room. The client picks the token out of the
          // fragment on load; there is no callback route to keep in sync.
          emailRedirectTo: window.location.origin,
        },
      });
      return error ? error.message : null;
    } catch {
      return 'Could not reach the sign-in service. Please try again.';
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await browserClient().auth.signOut();
    } catch {
      // onAuthStateChange still fires locally; and a failed sign-out on a
      // preferences-only account is not worth an error message.
    }
  }, []);

  return { state, signIn, signOut };
}
