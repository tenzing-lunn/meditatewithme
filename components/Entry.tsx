'use client';

import { useCallback, useEffect, useState, type ComponentType } from 'react';

import type { MixPatch } from './Sounds';
import Journey from './Journey';

import { hasStoredSession, useAuth } from './useAuth';
import { useEmailUpdates } from './useEmailUpdates';
import { useMix } from './useMix';
import { usePractice } from './usePractice';
import { usePreferences } from './usePreferences';
import { useSyncPreferences } from './useSyncPreferences';

/**
 * What is at the root: the journey, for everybody. Signed in or not only
 * changes its corner — *Sign in*, or your name (`AccountCorner`).
 *
 * WHY EVERY SHARED HOOK IS CALLED HERE AND NOWHERE ELSE
 * Both screens read the practice log, both write preferences, and both need
 * the audio graph. Calling `usePreferences` in each would give two pieces of
 * React state over one localStorage key. So there is one of each, above
 * both, handed down. `usePresence` is deliberately NOT here: a heartbeat is
 * a claim to be here, and it belongs to the journey.
 *
 * NOTHING IS SHOWN UNTIL ALL THREE ARE KNOWN
 * The account, the stored preferences and the practice log all load in
 * effects. The journey decides its screens from them once, at mount, so it
 * waits for all three rather than deciding on defaults and correcting
 * itself a moment later.
 */
export default function Entry() {
  const {
    state: auth,
    linkError,
    signIn,
    signInWithGoogle,
    signInWithApple,
    verify,
    signOut,
    deleteAccount,
    updateName,
  } = useAuth();
  const { prefs, update, replace, loaded } = usePreferences();

  const userId = auth.status === 'signed-in' ? auth.user.id : null;
  const sync = useSyncPreferences({ userId, prefs, replace, loaded });
  useEmailUpdates(userId);

  // The log works signed out. Signing in only carries it between devices.
  const { entries, record, loaded: logLoaded } = usePractice(userId);

  // The ambient mix. Preferences own the levels; this only turns them into
  // sound, which is why it is handed prefs rather than any state of its own.
  const mix = useMix(prefs.soundMix);

  /**
   * `/?demo=sitting` and `/?demo=finished`, in `next dev` only. The import is
   * dynamic and inside the dead branch for the reason `useWorld` gives: a
   * static import would bundle the fixture into production, unreachable but
   * shipped.
   */
  const [demo, setDemo] = useState<{ which: string; Demo: ComponentType<{ which: string }> } | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const which = new URLSearchParams(window.location.search).get('demo');
      if (which === 'sitting' || which === 'finished' || which === 'live') {
        void import('./Demo').then((m) => setDemo({ which, Demo: m.default }));
      }
    }
  }, []);

  /** See the gate below: whether this browser has an account to wait for. */
  const [waitForAuth] = useState(hasStoredSession);

  /**
   * A sound fader moved, or a bed was pressed, or five were silenced at once
   * — a patch rather than a single level, because silence is one decision and
   * five calls in a tick would each start from this same object.
   *
   * `ensure()` first and synchronously, because this runs inside the change
   * event, which is the only place the browser will let a context start. The
   * levels themselves reach the graph through `useMix`, which pushes
   * preferences into it whenever they change.
   */
  const setSound = useCallback(
    (patch: MixPatch) => {
      mix.ensure();
      update({ soundMix: { ...prefs.soundMix, ...patch } });
    },
    [mix, update, prefs.soundMix],
  );

  if (demo) return <demo.Demo which={demo.which} />;

  /**
   * The wait, and who is made to do it.
   *
   * The preferences and the log are localStorage, read in an effect: one tick
   * after hydration, always. The account was the odd one out — a network
   * library, loaded and asked, before anything at all was drawn — and this
   * component waited on all three equally. A guest therefore paid for a
   * question about an account they do not have, on the site's front page.
   *
   * So the account is waited for only by a browser that has a session stored,
   * or one arriving from a magic link (`hasStoredSession`). Everybody else is
   * shown the doors as soon as storage has been read, and if the guess turns
   * out to be wrong the screen changes when the real answer lands — the same
   * change it makes when somebody signs in on any other path.
   *
   * Read once, at the first render: a probe that changed its mind mid-visit
   * would put the placeholder back over a page somebody was already reading.
   *
   * The ground is the room, not paper: it is the ground of the screen that
   * follows, so the wait is a dark window rather than a pale one that turns
   * dark. `bg-room` reads the `data-room` the layout's inline script has
   * already put on `<html>` before the first pixel.
   */
  if ((waitForAuth && auth.status === 'loading') || !loaded || !logLoaded) {
    return <main className="h-dvh bg-room" aria-busy />;
  }

  return (
    <>
      <h1 className="sr-only">Meditate with me</h1>
      <Journey
        prefs={prefs}
        update={update}
        onSound={setSound}
        mix={mix}
        entries={entries}
        record={record}
        auth={auth}
        sync={sync}
        signIn={signIn}
        signInWithGoogle={signInWithGoogle}
        signInWithApple={signInWithApple}
        verify={verify}
        linkError={linkError}
        signOut={signOut}
        deleteAccount={deleteAccount}
        updateName={updateName}
      />
    </>
  );
}
