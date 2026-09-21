'use client';

import { useCallback, useEffect, useState, type ComponentType } from 'react';

import type { MixPatch } from './Sounds';
import { unlockAudio } from './audio';
import Home from './Home';
import Journey from './Journey';
import { doorPatch, type Mode } from './ModeScreen';
import { displayName, useAuth } from './useAuth';
import { useMix } from './useMix';
import { usePractice } from './usePractice';
import { usePreferences } from './usePreferences';
import { useSyncPreferences } from './useSyncPreferences';

/**
 * What is at the root, and which of the two things you get.
 *
 * A guest gets the journey, from its doors. Somebody signed in gets
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
  const {
    state: auth,
    linkError,
    signIn,
    verify,
    signOut,
    deleteAccount,
    updateName,
  } = useAuth();
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

  /** Signed in: at home, or through a door. Settings is a drawer on Home. */
  const [view, setView] = useState<'home' | 'journey'>('home');
  const goHome = useCallback(() => setView('home'), []);

  /**
   * A door on Home. The graph is built silent inside this click so that the
   * Bell and Sound screens have a context to play through; the bowl is what
   * raises it. The door's answer is written here, in the same click.
   */
  const openDoor = useCallback(
    (mode: Mode) => {
      unlockAudio();
      mix.ensure({ silent: true });
      update(doorPatch(mode, prefs));
      setView('journey');
    },
    [mix, update, prefs],
  );

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
        afterMode={auth.status === 'signed-in' && view === 'journey'}
      />
    </>
  );

  if (auth.status !== 'signed-in') return journey;
  if (view !== 'home') return journey;

  return (
    <Home
      prefs={prefs}
      update={update}
      entries={entries}
      userId={auth.user.id}
      email={auth.user.email}
      name={displayName(auth.user)}
      onDoor={openDoor}
      signOut={signOut}
      deleteAccount={deleteAccount}
      updateName={updateName}
    />
  );
}
