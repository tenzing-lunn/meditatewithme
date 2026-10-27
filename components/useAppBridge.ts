'use client';

import { useEffect, useRef, useState } from 'react';

import type { Screen } from '@/lib/journey';
import type { UserPreferences } from '@/lib/types';
import type { Profile } from '@/lib/label';
import type { Mix } from './useMix';

/**
 * The iPhone app's way into the journey (`mobile/App.tsx`), and nobody
 * else's: it is only ever set up when the user agent says `MeditateWithMeApp`.
 *
 * In the app the arrival and the sitting are native — the pond, the
 * sentence, the wheels, the throw, the sound, the bells and the timer are
 * the phone's own — and this page waits behind it, loaded and still. It is
 * still the one that holds the account (the session, the profile, the
 * practice log, the preferences on the server), so the two talk:
 *
 * - **To the app** (`ReactNativeWebView.postMessage`): `arrive`, whenever
 *   the arrival is where the journey is, with the preferences, the guide's
 *   line, the signed-in name, the word this page's own corner would show
 *   (`corner`: the first name, else the email's first part, else *Account*;
 *   null when signed out), the label the person has chosen to be seen by,
 *   and the questions this page would ask after Begin (`ask`, from
 *   `screensFor`), so the native sentence, corner, fish and Begin read what
 *   this page knows; `sitting`, with `on`, when a guided sitting here begins and when
 *   it is over — after the held beat at the bell, as this page keeps the
 *   name on the water — so the app can show it and take the name off with
 *   it; and `recorded`, with the ids of the sittings it has just
 *   logged, so the app lets go of its copies only once they are here. A
 *   guided sitting is the one still sat on this page, for its live video,
 *   until that is native too.
 * - **From the app** (`window.mwmApp`, called by injected script): write a
 *   preference, record the sittings the app sat (into this page's practice
 *   log, which syncs them to the account as it syncs its own), write the
 *   answers to those questions into this page's profile (`profile`, which
 *   syncs the place and the switch to the account), and begin a guided
 *   sitting.
 *
 * Back at the arrival inside the app, this page mutes its own beds. After
 * a guided sitting its sound graph is still built, and every sound the app
 * chooses is written here as a preference: unmuted, the page would raise
 * its beds again under the phone's. Muted, not hushed, so the sitting's own
 * fade still runs out rather than being cut.
 *
 * There is no gesture inside this page when the app asks it to begin. The
 * app's web view is made with `mediaPlaybackRequiresUserAction` off, which
 * is what lets the audio context start without one.
 */

export interface SatEntry {
  id: string;
  startedAt: number;
  seconds: number;
  completed: boolean;
}

export interface AppBridge {
  update: (patch: Partial<UserPreferences>) => void;
  begin: (guided: boolean, prefs?: Partial<UserPreferences>) => void;
  record: (entries: SatEntry[]) => void;
  profile: (patch: Partial<Profile>) => void;
}

type Native = { ReactNativeWebView?: { postMessage: (m: string) => void }; mwmApp?: AppBridge };

/** Read at the moment it is asked, on the client only. */
export function inAppUserAgent(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('MeditateWithMeApp');
}

export function useInApp(): boolean {
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    setInApp(inAppUserAgent());
  }, []);
  return inApp;
}

function post(message: object): void {
  (window as unknown as Native).ReactNativeWebView?.postMessage(JSON.stringify(message));
}

export function useAppBridge({
  inApp,
  atArrive,
  sitting,
  prefs,
  guide,
  name,
  corner,
  label,
  ask,
  update,
  record,
  profile,
  mix,
  onBegin,
}: {
  inApp: boolean;
  atArrive: boolean;
  sitting: boolean;
  prefs: UserPreferences;
  guide: string;
  name: string | null;
  /** What this page's corner says when signed in; null when signed out. */
  corner: string | null;
  /** "Ana from Lisbon", if they chose to be seen; null otherwise. */
  label: string | null;
  /** The questions after Begin, in order: none, or the name and the place. */
  ask: readonly Exclude<Screen, 'arrive'>[];
  update: (patch: Partial<UserPreferences>) => void;
  record: (entry: SatEntry) => void;
  profile: (patch: Partial<Profile>) => void;
  mix: Mix;
  onBegin: (guided: boolean) => void;
}): void {
  const latest = useRef({ update, record, profile, mix, onBegin });
  latest.current = { update, record, profile, mix, onBegin };

  useEffect(() => {
    if (!inApp) return;
    const w = window as unknown as Native;
    w.mwmApp = {
      update: (patch) => latest.current.update(patch),
      begin: (guided, patch) => {
        if (patch) latest.current.update(patch);
        latest.current.onBegin(guided);
      },
      record: (entries) => {
        for (const e of entries) latest.current.record(e);
        post({ type: 'recorded', ids: entries.map((e) => e.id) });
      },
      profile: (patch) => latest.current.profile(patch),
    };
    return () => {
      delete w.mwmApp;
    };
  }, [inApp]);

  useEffect(() => {
    if (inApp && atArrive) post({ type: 'arrive', prefs, guide, name, corner, label, ask });
    // `ask` is a fresh array each render; its contents are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inApp, atArrive, prefs, guide, name, corner, label, ask.join()]);

  useEffect(() => {
    if (inApp && atArrive) latest.current.mix.mute();
  }, [inApp, atArrive]);

  useEffect(() => {
    if (inApp) post({ type: 'sitting', on: sitting });
  }, [inApp, sitting]);
}
