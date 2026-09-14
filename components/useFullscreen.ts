'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'mwm.display';

function readWanted(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const v = JSON.parse(raw) as { fullscreen?: unknown };
    return v.fullscreen === true;
  } catch {
    return false;
  }
}

/**
 * Full screen on a desktop, as a remembered choice. The Fullscreen API only
 * answers a gesture, so `enter()` is called inside the same click that
 * strikes the bowl; `exit()` at the end of the sitting. `supported` is false
 * on iPhone and inside anything that is not a real window, and the toggle
 * is simply not drawn there.
 */
export function useFullscreen() {
  const [supported, setSupported] = useState(false);
  const [wanted, setWantedState] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    setSupported(
      typeof document !== 'undefined' &&
        document.fullscreenEnabled === true &&
        window.matchMedia('(pointer: fine)').matches,
    );
    setWantedState(readWanted());
    const onChange = () => setActive(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const setWanted = useCallback((v: boolean) => {
    setWantedState(v);
    try {
      localStorage.setItem(KEY, JSON.stringify({ fullscreen: v }));
    } catch {
      // Private mode. The choice lasts the session and that is fine.
    }
  }, []);

  const enter = useCallback(() => {
    if (!document.fullscreenEnabled || document.fullscreenElement) return;
    void document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  const exit = useCallback(() => {
    if (!document.fullscreenElement) return;
    void document.exitFullscreen().catch(() => {});
  }, []);

  return { supported, wanted, setWanted, active, enter, exit };
}
