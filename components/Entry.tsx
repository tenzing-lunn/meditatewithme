'use client';

import { useCallback, useState } from 'react';

import type { MASTER_KEY, TrackSlug } from './mix';
import { unlockAudio } from './audio';
import Home from './Home';
import Room from './Room';
import { displayName, useAuth } from './useAuth';
import { useMix } from './useMix';
import { usePractice } from './usePractice';
import { usePreferences } from './usePreferences';
import { useSyncPreferences } from './useSyncPreferences';

/**
 * What is at the root, and which of the two things you get.
 *
 * There are two screens now and they are genuinely different objects: the room
 * is a photograph that does not scroll and asks one thing at a time, and Home
 * is a page. Which one somebody sees is decided here, and by exactly one fact —
 * whether they are signed in.
 *
 * WHY EVERY SHARED HOOK IS CALLED HERE AND NOWHERE ELSE
 * Both screens read the practice log, both write preferences, and both need the
 * audio graph. Calling `usePreferences` in each would give two pieces of React
 * state over one localStorage key: changing the duration on Home would persist,
 * and the room — mounted from the same click — would still be holding the value
 * it read at mount. Two `usePractice` would each run the sync loop against the
 * same table. So there is one of each, above both, handed down.
 *
 * `usePresence` is deliberately NOT here. It writes heartbeats, and a heartbeat
 * is a claim to be in the room. It stays inside `Room` — see the note there.
 *
 * WHY THE SWITCH IS STATE AND NOT A ROUTE
 * A route change unmounts the scene, and the room's opening move depends on
 * `CandleScene` staying mounted while the camera travels off `load`. It would
 * also mean a client-side auth redirect on every load, which flashes. The globe
 * is a route because it genuinely is another page; sitting is not.
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

  /** Signed in, and in the room rather than on Home. */
  const [seated, setSeated] = useState(false);

  // Stable, because it is in an effect's dependencies inside `Room`. A fresh
  // function every render would re-run that effect on every clock tick — it is
  // guarded by a ref and would do nothing, but "does nothing four times a
  // second" is not a property worth relying on.
  const goHome = useCallback(() => setSeated(false), []);

  /**
   * `Sit`, from Home.
   *
   * THE TWO LINES ABOVE `setSeated` ARE THE WHOLE REASON THIS IS A CALLBACK.
   * Autoplay policy only lets an AudioContext start inside a user gesture. In
   * the guest flow the gesture is `Begin.`, which is why `openSetup` unlocks
   * there. Home has no flow — the room starts itself on arrival, from an effect
   * — and an effect is not a gesture. So the unlock has to happen in this
   * click, before the room exists.
   *
   * If a sitting is ever silent, or the closing bell never rings, this is the
   * first place to look.
   */
  const startSitting = useCallback(() => {
    unlockAudio();
    mix.ensure();
    setSeated(true);
  }, [mix]);

  /**
   * A sound fader moved on Home.
   *
   * `ensure()` first and synchronously, for the same reason `Room` does it:
   * this runs inside the change event, which is the only place the browser will
   * let a context start. Persisting goes through React and would not count.
   */
  const setSound = useCallback(
    (slug: TrackSlug | typeof MASTER_KEY, gain: number) => {
      mix.ensure();
      update({ soundMix: { ...prefs.soundMix, [slug]: gain } });
    },
    [mix, update, prefs.soundMix],
  );

  /**
   * Nobody is shown anything until it is known which of the two they get.
   *
   * The alternative is picking one and correcting it a moment later, which is
   * either the room's five-second opening move being thrown away or a dashboard
   * appearing in front of somebody who is not signed in. `getSession()` reads a
   * token that is already in localStorage, so in the ordinary case this frame
   * lasts a few milliseconds.
   *
   * It is not blank. The page's own dark ground is the room's dark ground, so
   * this is the first frame of the lights coming up either way.
   */
  if (auth.status === 'loading') {
    return <main className="bg-paper h-dvh" aria-busy />;
  }

  const room = (
    // Exactly one viewport, and it does not scroll. The room is a photograph
    // and this is the frame of it — the moment the page scrolls the type and
    // the picture come apart, because the picture is fixed and the type is not.
    //
    // `isolate` keeps the scene's -z-10 behind the column but in front of the
    // page.
    <main className="relative isolate h-dvh overflow-hidden">
      <Room
        prefs={prefs}
        update={update}
        mix={mix}
        entries={entries}
        record={record}
        auth={auth}
        sync={sync}
        signIn={signIn}
        verify={verify}
        // Only ever set when somebody arrived by following a link that did not
        // work. It opens the account panel with the reason in it — see
        // `readLinkError`.
        linkError={linkError}
        signOut={signOut}
        // Present only when signed in, and it carries the whole difference
        // between the two ways the room is used. See `RoomProps`.
        home={auth.status === 'signed-in' ? goHome : undefined}
      />
    </main>
  );

  if (auth.status !== 'signed-in') return room;
  if (seated) return room;

  return (
    <Home
      prefs={prefs}
      update={update}
      onSound={setSound}
      onSit={startSitting}
      entries={entries}
      email={auth.user.email}
      // Undefined for everybody who made an account before the flow asked for
      // a name. Home falls back to its own masthead rather than inventing one.
      name={displayName(auth.user)}
      signOut={signOut}
      deleteAccount={deleteAccount}
    />
  );
}
