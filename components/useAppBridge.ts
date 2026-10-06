'use client';

import { useEffect, useRef, useState } from 'react';

import type { BellKind, TrackSlug, UserPreferences } from '@/lib/types';
import { previewBell, stopPreviewBell, unlockAudio } from './audio';
import type { Mix } from './useMix';

/**
 * The iPhone app's way into the journey (`mobile/App.tsx`), and nobody
 * else's: it is only ever set up when the user agent says `MeditateWithMeApp`.
 *
 * In the app the arrival is native — the pond, the sentence, the wheels and
 * the throw are drawn by the phone — and this page waits behind it, loaded
 * and still. So the two talk:
 *
 * - **To the app** (`ReactNativeWebView.postMessage`): `arrive`, whenever
 *   the arrival is where the journey is, with the preferences, the guide's
 *   line and the signed-in name, so the native sentence reads what this page
 *   would have said; and `sitting`, once a sitting has begun, so the app can
 *   show it.
 * - **From the app** (`window.mwmApp`, called by injected script): write a
 *   preference, play a bell or a bed for the wheels, and begin.
 *
 * There is no gesture inside this page when the app asks it to sound or to
 * begin. The app's web view is made with `mediaPlaybackRequiresUserAction`
 * off, which is what lets the audio context start without one.
 */

export interface AppBridge {
  update: (patch: Partial<UserPreferences>) => void;
  begin: (guided: boolean, prefs?: Partial<UserPreferences>) => void;
  bell: (kind: BellKind) => void;
  stopBell: () => void;
  taste: (slug: TrackSlug) => void;
  hush: () => void;
}

type Native = { ReactNativeWebView?: { postMessage: (m: string) => void }; mwmApp?: AppBridge };

export function useInApp(): boolean {
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    setInApp(navigator.userAgent.includes('MeditateWithMeApp'));
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
  update,
  mix,
  onBegin,
}: {
  inApp: boolean;
  atArrive: boolean;
  sitting: boolean;
  prefs: UserPreferences;
  guide: string;
  name: string | null;
  update: (patch: Partial<UserPreferences>) => void;
  mix: Mix;
  onBegin: (guided: boolean) => void;
}): void {
  const latest = useRef({ update, mix, onBegin });
  latest.current = { update, mix, onBegin };

  useEffect(() => {
    if (!inApp) return;
    const w = window as unknown as Native;
    w.mwmApp = {
      update: (patch) => latest.current.update(patch),
      begin: (guided, patch) => {
        if (patch) latest.current.update(patch);
        latest.current.onBegin(guided);
      },
      bell: (kind) => {
        unlockAudio();
        previewBell(kind);
      },
      stopBell: stopPreviewBell,
      taste: (slug) => {
        unlockAudio();
        latest.current.mix.taste(slug);
      },
      hush: () => latest.current.mix.hush(),
    };
    return () => {
      delete w.mwmApp;
    };
  }, [inApp]);

  useEffect(() => {
    if (inApp && atArrive) post({ type: 'arrive', prefs, guide, name });
  }, [inApp, atArrive, prefs, guide, name]);

  useEffect(() => {
    if (inApp && sitting) post({ type: 'sitting' });
  }, [inApp, sitting]);
}
