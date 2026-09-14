'use client';

import { useCallback, useEffect, useState, type ComponentType } from 'react';

import type { MASTER_KEY, TrackSlug } from './mix';
import { unlockAudio } from './audio';
import Home from './Home';
import Journey from './Journey';
import { displayName, useAuth } from './useAuth';
import { useMix } from './useMix';
import { usePractice } from './usePractice';
import { usePreferences } from './usePreferences';
import { useSyncPreferences } from './useSyncPreferences';

/**
 * What is at the root, and which of the two things you get.
 *
 * A guest gets the journey, from its welcome screen. Somebody signed in gets
 * their home, and the journey from a door on it. Which one is decided here,
 * by exactly one fact: whether they are signed in.
 *
 * WHY EVERY SHARED HOOK IS CALLED HERE AND NOWHERE ELSE
 * Both screens read the practice log, both write preferences, and both need
 * the audio graph. Calling `usePreferences` in each would give two pieces of
 * React state over one localStorage key. So there is one of each, above
 * both, handed down. `usePresence` is deliberately NOT here: a heartbeat is
 * a claim to be here, and it belongs to the journey.
 *
 * NOTHING IS SHOWN UNTIL BOTH ARE KNOWN
 * The account and the stored preferences both load in effects. The journey
 * decides its screens from them once, at mount, so it waits for both rather
 * than deciding on defaults and correcting itself a moment later.
 */
export default function Entry() {
  const { state: auth, linkError, signIn, verify, signOut, deleteAccount } =
    useAuth();
  const { prefs, update, replace, loaded } = usePreferences();

  const userId = auth.status === 'signed-in' ? auth.user.id : null;
  const sync = useSyncPreferences({ userId, prefs, replace, loaded });

  // The log works signed out. Signing in only carries it between devices.
  const { entries, record } = usePractice(userId);

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
      if (which === 'sitting' || which === 'finished') {
        void import('./Demo').then((m) => setDemo({ which, Demo: m.default }));
      }
    }
  }, []);

  /** Signed in, and on the journey rather than at home. */
  const [seated, setSeated] = useState(false);
  const goHome = useCallback(() => setSeated(false), []);

  /**
   * A door on Home. The graph is built silent inside this click so that the
   * Bell and Sound screens have a context to play through; the bowl is what
   * raises it.
   */
  const startJourney = useCallback(() => {
    unlockAudio();
    mix.ensure({ silent: true });
    setSeated(true);
  }, [mix]);

  /**
   * A sound fader moved. `ensure()` first and synchronously, because this
   * runs inside the change event, which is the only place the browser will
   * let a context start.
   */
  const setSound = useCallback(
    (slug: TrackSlug | typeof MASTER_KEY, gain: number) => {
      mix.ensure();
      update({ soundMix: { ...prefs.soundMix, [slug]: gain } });
    },
    [mix, update, prefs.soundMix],
  );

  if (demo) return <demo.Demo which={demo.which} />;

  if (auth.status === 'loading' || !loaded) {
    return <main className="h-dvh bg-paper" aria-busy />;
  }

  const journey = (
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
        verify={verify}
        linkError={linkError}
        signOut={signOut}
        home={auth.status === 'signed-in' ? goHome : undefined}
        start={auth.status === 'signed-in' ? 'bowl' : undefined}
      />
    </>
  );

  if (auth.status !== 'signed-in') return journey;
  if (seated) return journey;

  return (
    <Home
      prefs={prefs}
      update={update}
      onSound={setSound}
      onSit={startJourney}
      entries={entries}
      email={auth.user.email}
      name={displayName(auth.user)}
      signOut={signOut}
      deleteAccount={deleteAccount}
    />
  );
}
