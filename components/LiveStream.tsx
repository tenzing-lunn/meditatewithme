'use client';

import { useEffect, useRef } from 'react';
import { liveVideo } from './liveVideo';

/**
 * A live stream, silent, filling its box. No controls, no sound, ever.
 *
 * `hls.js` plays it wherever it can (loaded only when a stream is actually
 * shown); Safari's own HLS is the fallback for iPhones without MediaSource.
 * `onState` reports `playing` once frames arrive and `stalled` when they
 * stop, so the page can fall back to the earth and come back without the
 * viewer doing anything.
 *
 * Every kind of failure recovers the same way: say `stalled`, wait, and load
 * the stream again from scratch — a fatal error, a stream that silently
 * stopped sending, or a collaborator who reconnected (MediaMTX restarts the
 * segment numbers, which a running player would wait on forever). The wait
 * grows from 3 to 30 seconds so a stream that cannot play never hammers the
 * server. A brief rebuffer is not a stall: only eight seconds without frames
 * is.
 *
 * Autoplay is muted and inline, which iOS allows — except in Low Power Mode,
 * where it refuses. So it plays in the shared element Begin already played
 * inside its tap (`liveVideo`), which iOS then lets play; `playRef` stays as
 * a second chance for any later tap.
 */

export type LiveState = 'playing' | 'stalled';

type Props = {
  src: string;
  onState?: (state: LiveState) => void;
  playRef?: React.MutableRefObject<(() => void) | null>;
  className?: string;
};

const STALL_MS = 8_000;
const RETRY_MIN_MS = 3_000;
const RETRY_MAX_MS = 30_000;
const LIVE_BEHIND_S = 20;
const LIVE_EDGE_S = 6;

export default function LiveStream({ src, onState, playRef, className }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const report = useRef(onState);
  report.current = onState;

  useEffect(() => {
    const holder = box.current;
    if (!holder) return;
    const el = liveVideo();
    el.className = 'h-full w-full';
    holder.appendChild(el);

    let hls: import('hls.js').default | null = null;
    let cancelled = false;
    let retry = RETRY_MIN_MS;
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const tryPlay = () => {
      el.play().catch(() => {
        // Cleanup's `load()` rejects a pending play; that is not a stall.
        if (!cancelled) report.current?.('stalled');
      });
    };
    if (playRef) playRef.current = tryPlay;

    const unload = () => {
      hls?.destroy();
      hls = null;
      el.removeAttribute('src');
      el.load();
    };

    const load = async () => {
      if (cancelled) return;
      try {
        const { default: Hls } = await import('hls.js');
        if (cancelled) return;
        if (Hls.isSupported()) {
          // hls.js never catches up by default: each stall adds a second
          // and there is no ceiling, so after a few drops the candle is
          // minutes old. More than six segments behind, it jumps to live.
          // hls.js throws on liveMaxLatencyDurationCount unless
          // liveSyncDurationCount is given too, even at its default of 3 —
          // and a throw here is a player that never loads (30 Sep 2026).
          hls = new Hls({ capLevelToPlayerSize: true, liveSyncDurationCount: 3, liveMaxLatencyDurationCount: 6 });
          hls.on(Hls.Events.ERROR, (_e, data) => {
            if (data.fatal) fail();
          });
          hls.loadSource(src);
          hls.attachMedia(el);
        } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
          el.src = src;
        } else {
          report.current?.('stalled');
          return;
        }
        tryPlay();
      } catch {
        fail();
      }
    };

    const fail = () => {
      if (cancelled || retryTimer) return;
      clearTimeout(stallTimer);
      stallTimer = undefined;
      report.current?.('stalled');
      unload();
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        load();
      }, retry);
      retry = Math.min(retry * 2, RETRY_MAX_MS);
    };

    const playing = () => {
      clearTimeout(stallTimer);
      stallTimer = undefined;
      retry = RETRY_MIN_MS;
      report.current?.('playing');
    };
    const waiting = () => {
      if (!stallTimer) stallTimer = setTimeout(fail, STALL_MS);
    };
    // Browsers pause silent video in a background tab to save power, and do
    // not resume it themselves. Coming back to the tab resumes it, at live:
    // Safari's own player has no latency ceiling, so it is moved there by
    // hand (hls.js does it itself).
    const visible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!hls && el.seekable.length) {
        const edge = el.seekable.end(el.seekable.length - 1);
        if (edge - el.currentTime > LIVE_BEHIND_S) el.currentTime = edge - LIVE_EDGE_S;
      }
      if (el.paused) tryPlay();
    };

    document.addEventListener('visibilitychange', visible);
    el.addEventListener('playing', playing);
    el.addEventListener('waiting', waiting);
    el.addEventListener('error', fail);
    el.addEventListener('ended', fail);
    load();

    return () => {
      cancelled = true;
      clearTimeout(stallTimer);
      clearTimeout(retryTimer);
      if (playRef) playRef.current = null;
      document.removeEventListener('visibilitychange', visible);
      el.removeEventListener('playing', playing);
      el.removeEventListener('waiting', waiting);
      el.removeEventListener('error', fail);
      el.removeEventListener('ended', fail);
      unload();
      el.remove();
    };
  }, [src, playRef]);

  return <div ref={box} className={className} />;
}
