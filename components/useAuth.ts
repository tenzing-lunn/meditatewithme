'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { browserClient } from '@/lib/supabase';
import { GMAIL_USES_GOOGLE, SERVICE_UNREACHABLE, authErrorMessage, emailReasonMessage } from '@/lib/authErrors';
import { isGoogleMail } from '@/lib/emailCode';
import { readLinkError } from '@/lib/authRedirect';

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

/**
 * What the email link came back saying, when it came back saying no.
 *
 * WHY THIS EXISTS AT ALL — IT COST AN EVENING TO FIND OUT
 * A used or superseded magic link does not fail loudly. Supabase answers the
 * `/verify` request with a 303 **to the site**, carrying the reason in the URL
 * fragment: `#error=access_denied&error_code=otp_expired&error_description=...`.
 * So the browser lands on the landing page, signed out, looking exactly like a
 * cold visit — and the room, which had the explanation in its own address bar,
 * rendered `Begin.` and said nothing. Tenzing hit this and reasonably concluded
 * the whole flow was broken; the auth logs said `One-time token not found`,
 * which is a used link, not a broken product.
 *
 * There is no public API for it. `detectSessionInUrl` recognises the error
 * fragment, abandons the sign-in and keeps the reason to itself —
 * `onAuthStateChange` never fires and `getSession()` just returns null. So the
 * fragment is read here, first-hand.
 *
 * Both the fragment and query string are checked by lib/authRedirect, which
 * also handles cancelled Google consent without calling it an expired email.
 */

/**
 * Whether this browser might already be signed in — answered synchronously,
 * without Supabase.
 *
 * `Entry` used to render nothing at all until `getSession()` had replied, so
 * a visitor who has never had an account waited for an auth library to load
 * and answer a question whose answer was always "no" before they were shown
 * the doors. This is that question, asked of localStorage directly, in the
 * same tick as the first render.
 *
 * Supabase keeps its session under `sb-<project ref>-auth-token`. The key is
 * matched by shape rather than composed from the project ref, so it survives
 * the URL changing and does not need the ref written down in a second place.
 *
 * FALSE IS A GUESS, NOT A VERDICT. It means "do not wait", never "signed
 * out": `useAuth` is still the only thing that decides, and if it comes back
 * signed-in a moment later the screen changes as it would have anyway. The
 * one case where the guess would be visibly wrong is arriving from a magic
 * link — the session is in the URL fragment, not in storage yet — so an
 * access token in the fragment counts as a maybe too.
 */
export function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.location.hash.includes('access_token')) return true;
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) return true;
    }
  } catch {
    // Storage blocked outright. Nothing is stored, so nothing is waited for.
  }
  return false;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  /**
   * Read during the first render, which is before any effect anywhere in the
   * tree — including the ones in child components that also reach for the
   * Supabase client. Reading it in an effect here would be a race with those,
   * since React runs child effects before the parent's.
   */
  const [linkError, setLinkError] = useState<string | null>(() =>
    typeof window === 'undefined'
      ? null
      : readLinkError(window.location.hash, window.location.search),
  );

  // Take it out of the address bar once it has been read, so a reload is a
  // clean arrival rather than the same complaint again.
  useEffect(() => {
    if (!linkError || typeof window === 'undefined') return;
    window.history.replaceState(null, '', window.location.pathname);
  }, [linkError]);

  useEffect(() => {
    let cancelled = false;
    /**
     * Set once the client exists, so the cleanup can undo whatever the
     * asynchronous setup below managed to do before it ran. The client is
     * behind an `import()` now (see `lib/supabase.ts`), so unmounting between
     * mount and the library landing is a real ordering, not a theoretical one
     * — `cancelled` is checked after every await for the same reason.
     */
    let teardown: (() => void) | undefined;

    void (async () => {
      let client;
      try {
        client = await browserClient();
      } catch {
        // No configuration, or the library could not be fetched. Not an error
        // worth surfacing — just no accounts.
        if (!cancelled) setState({ status: 'unavailable' });
        return;
      }
      if (cancelled) return;

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

      /**
       * The same token, arriving without a page load.
       *
       * THIS IS THE BUG THAT LOOKED LIKE "LOGGING IN DOESN'T WORK"
       * `detectSessionInUrl` reads the URL exactly once, when the client is
       * constructed — which is on page load. That covers the case it was written
       * for: the link opens a new tab, the document loads, the fragment is there.
       *
       * It does not cover the link landing in a tab that is *already* open on the
       * page it redirects to. The email is requested from the site, so the tab is
       * sitting on `/`; the link's `redirect_to` is that same `/`. A URL that
       * differs from the current one only by its fragment is a **same-document**
       * navigation — the browser fires `hashchange` and does not reload. So the
       * client is never rebuilt, nothing re-reads the URL, and a perfectly good
       * access token sits in the address bar being ignored. The visitor is shown
       * `Let's begin.` and told nothing, because there is no error to tell them
       * about: Supabase verified the link and logged the login server-side.
       *
       * Reproduced by pasting a link into an open tab, or by any mail client that
       * reuses the tab rather than opening a new one.
       *
       * `setSession` rather than a reload: the token is right here, already
       * parsed, and reloading would throw away the room's mounted scene for no
       * reason — see the note on the switch in `Entry`. It is public API, and it
       * fires `onAuthStateChange` above, so the screen changes the same way it
       * does on every other path.
       */
      const onHashChange = () => {
        if (cancelled) return;

        const hash = window.location.hash;
        const params = new URLSearchParams(
          hash.startsWith('#') ? hash.slice(1) : hash,
        );
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const error = readLinkError(hash, '');

        // Somebody navigating the page's own anchors, not arriving from an email.
        if (!accessToken && !error) return;

        // Read, so take it out of the address bar — same reason as on load: a
        // reload should be a clean arrival, not a second attempt at a spent
        // token. Safe before `setSession`, which reads the values, not the URL.
        window.history.replaceState(null, '', window.location.pathname);

        if (error) {
          setLinkError(error);
          return;
        }

        // An implicit-flow fragment always carries both. If it somehow does not,
        // there is nothing to set and nothing worth saying.
        if (!accessToken || !refreshToken) return;

        client.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error: setError }) => {
            if (cancelled || !setError) return;
            setLinkError(
              'That link could not be used. Send yourself a fresh one.',
            );
          })
          .catch(() => {
            if (!cancelled) {
              setLinkError(
                'Could not reach the sign-in service. Please try again.',
              );
            }
          });
      };

      window.addEventListener('hashchange', onHashChange);

      teardown = () => {
        sub.subscription.unsubscribe();
        window.removeEventListener('hashchange', onHashChange);
      };
      // Unmounted while the library was in flight: nothing above ran until
      // now, so tear it straight back down.
      if (cancelled) teardown();
    })();

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  /**
   * Addresses the site sent its own code to — connected ones, which Supabase
   * does not know (`app/api/signin`) — so `verify` knows where to take it.
   */
  const connected = useRef(new Set<string>());

  /**
   * Send the email that makes an account.
   *
   * No password means no password to choose, forget, reset, or reuse from
   * somewhere it has already leaked. It also means the entire reset flow —
   * which is where most auth bugs live — does not exist.
   *
   * `signInWithOtp` is deliberately both doors: it creates the user if the
   * address is new and signs them in if it is not. That is why the room can
   * offer "Create account" and still let somebody who has one back in without
   * a second form behind a second button.
   *
   * `name` is written to `user_metadata` and only ever takes on the request
   * that creates the user — Supabase ignores `data` for an address it already
   * knows. So a returning visitor cannot be renamed by retyping the flow, and
   * the account flow can ask the question without qualifying it.
   *
   * Returns an error string rather than throwing, because every caller wants to
   * put it on screen — in the site's own words (`lib/authErrors.ts`), never
   * Supabase's.
   */
  const signIn = useCallback(
    async (email: string, name?: string): Promise<string | null> => {
      // Gmail goes through the Google button only; see `isGoogleMail`.
      if (isGoogleMail(email)) return GMAIL_USES_GOOGLE;
      // A connected address first: Supabase would make it a new account.
      // If the route cannot be reached, fall through to Supabase rather than
      // let a fault here stop everybody signing in.
      try {
        const response = await fetch('/api/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const reply = await response.json();
        if (reply.kind === 'connected') {
          connected.current.add(email.trim().toLowerCase());
          return reply.ok ? null : emailReasonMessage(reply.reason);
        }
      } catch {
        // Supabase's own path below.
      }
      try {
        const { error } = await (await browserClient()).auth.signInWithOtp({
          email,
          options: {
            // Straight back to the room. The client picks the token out of the
            // fragment on load; there is no callback route to keep in sync.
            //
            // Still sent even though the flow now asks for a code instead: the
            // same email carries both, and the link is the working path until
            // `{{ .Token }}` is added to the Supabase email template. See the
            // note on `verify`.
            emailRedirectTo: window.location.origin,
            data: name ? { name } : undefined,
          },
        });
        return error ? authErrorMessage(error.code, error.message) : null;
      } catch {
        return SERVICE_UNREACHABLE;
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    try {
      // Check before leaving the app: a disabled provider otherwise lands the
      // visitor on a raw JSON error page at the authorization endpoint.
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return SERVICE_UNREACHABLE;
      const settings = await response.json();
      if (!settings.external?.google) {
        return 'Google sign-in is not available yet. You can use an email code below.';
      }
      const { error } = await (await browserClient()).auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      });
      return error ? 'Could not start Google sign-in. Try again, or use an email code.' : null;
    } catch {
      return SERVICE_UNREACHABLE;
    }
  }, []);

  /**
   * Finish it here, without leaving the room.
   *
   * The magic link works and is not going anywhere, but it ends a meditation
   * site's only signup flow in somebody's inbox and brings them back to a page
   * that reloads from nothing. Typing six digits keeps them where they were.
   *
   * REQUIRES ONE DASHBOARD CHANGE THIS REPOSITORY CANNOT MAKE
   * Supabase's stock Magic Link template contains only `{{ .ConfirmationURL }}`.
   * The same email will carry the code once `{{ .Token }}` is added to it in
   * Authentication → Email Templates. Until then the code box is there and the
   * arriving email has nothing to put in it, which is why the flow keeps saying
   * the link in that email works too. `plans/launch-readiness.md` carries this
   * alongside the SMTP item it depends on.
   *
   * Success needs no return value: `onAuthStateChange` above fires and the
   * whole app changes screen underneath the form.
   */
  const verify = useCallback(
    async (email: string, token: string): Promise<string | null> => {
      if (connected.current.has(email.trim().toLowerCase())) {
        try {
          const response = await fetch('/api/signin', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code: token }),
          });
          const reply = await response.json();
          if (!reply.ok) return emailReasonMessage(reply.reason);
          const { error } = await (await browserClient()).auth.verifyOtp({
            token_hash: reply.tokenHash,
            type: 'magiclink',
          });
          return error ? authErrorMessage(error.code, error.message) : null;
        } catch {
          return SERVICE_UNREACHABLE;
        }
      }
      try {
        const { error } = await (await browserClient()).auth.verifyOtp({
          email,
          token,
          type: 'email',
        });
        return error ? authErrorMessage(error.code, error.message) : null;
      } catch {
        return SERVICE_UNREACHABLE;
      }
    },
    [],
  );

  /**
   * Sign out of this device, and only this device.
   *
   * `scope: 'local'` is not a detail and not the library's default — bare
   * `signOut()` is `scope: 'global'`, which revokes **every** session the
   * account has anywhere. So pressing `Sign out` on a laptop would silently
   * sign the same person out on their phone, and the next time they opened the
   * room there they would be a stranger to it: no practice log carried across,
   * no name in the masthead, and another email to wait for. Nobody pressing a
   * button on one machine is asking for that to happen on another.
   *
   * Signing out everywhere is a real thing to want, but it is a deliberate
   * security action — the answer to a lost phone — and it belongs behind its
   * own control saying so, not silently attached to the ordinary one.
   */
  const signOut = useCallback(async () => {
    try {
      await (await browserClient()).auth.signOut({ scope: 'local' });
    } catch {
      // onAuthStateChange still fires locally; and a failed sign-out on a
      // preferences-only account is not worth an error message.
    }
  }, []);

  /**
   * Delete the account, for good.
   *
   * The browser cannot do this itself — see the note in `app/api/account`. All
   * this does is present the current access token to that handler, which is the
   * only thing that proves which account to remove.
   *
   * `scope: 'local'` on the way out, and that is not a detail. The default
   * sign-out POSTs to `/logout` with a token belonging to a user who no longer
   * exists, which fails — and a caught failure there would leave the session in
   * localStorage, so the app would carry on rendering Home for a deleted
   * account until the token expired. A local sign-out has no server to disagree
   * with: it clears the stored session and fires `onAuthStateChange`, which is
   * exactly what is wanted once the account is already gone.
   *
   * Returns an error string rather than throwing, like `signIn` and `verify`,
   * because the caller puts it on screen. A null return means the account is
   * deleted and the app is already changing screen underneath the panel.
   */
  const deleteAccount = useCallback(async (): Promise<string | null> => {
    try {
      const client = await browserClient();
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        return 'You are no longer signed in, so there is nothing here to delete.';
      }

      const response = await fetch('/api/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return response.status === 401
          ? 'That session has expired. Sign in again and you can delete the account from here.'
          : 'The account could not be deleted just now. Nothing has been changed — please try again.';
      }

      await client.auth.signOut({ scope: 'local' });
      return null;
    } catch {
      return 'Could not reach the server. Nothing has been changed — please try again.';
    }
  }, []);

  /**
   * Change what to call them. `user_metadata.name` is where the name has
   * always lived; `onAuthStateChange` fires USER_UPDATED with the new user,
   * so the greeting follows without a reload. An error string, or null.
   */
  const updateName = useCallback(async (name: string): Promise<string | null> => {
    try {
      const { error } = await (await browserClient()).auth.updateUser({
        data: { name: name.trim() || null },
      });
      return error ? 'The name could not be saved just now. Please try again.' : null;
    } catch {
      return 'Could not reach the server. Please try again.';
    }
  }, []);

  return {
    state,
    linkError,
    signIn,
    signInWithGoogle,
    verify,
    signOut,
    deleteAccount,
    updateName,
  };
}

/**
 * What to call somebody, if they told us.
 *
 * Undefined rather than a fallback string, because the one caller wants to
 * choose its own — a masthead that reads "Hello, friend" to everybody who
 * signed up before this flow existed would be worse than the site's own name.
 *
 * Guarded rather than cast: `user_metadata` is a free-form JSON column and the
 * only thing standing between it and the page is this function.
 */
export function displayName(user: User): string | undefined {
  const name = user.user_metadata?.name;
  if (typeof name !== 'string') return undefined;
  const trimmed = name.trim();
  return trimmed === '' ? undefined : trimmed;
}
