// Whoever is on camera, over the pond, during a guided sitting: the site's
// `components/LiveLayer.tsx` and `LiveStream.tsx`, on the phone's own
// player (expo-video, which is AVPlayer and plays HLS itself).
//
// Nothing shows until frames are actually playing, and it fades back to the
// pond the moment they stop, so an empty hour or a stalled stream looks the
// same as the water. A window on the pond, framed in the middle, with one
// line under it saying what it is — who is guiding, if they chose to be
// named, live, not recorded, nobody watching back — or that a dropped
// picture will come back by itself (`plans/apple-guidelines.md`).
//
// Silent, always: the sitting's sound is the beds and the bells. The player
// mixes with the app's own audio rather than taking the session over.
//
// Every failure recovers the way the site's does: say `stalled`, wait, and
// load the stream again from scratch — an error, frames that stop for eight
// seconds, a stream that ends, or a guide who reconnected. The wait grows
// from 3 to 30 seconds. While the phone is locked or the app is away the
// system pauses the picture; that is not a stall, and coming back loads it
// again at live rather than minutes behind.
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, StyleSheet, View } from 'react-native';
import { EASE, RULE, type } from './ui';

const STALL_MS = 8_000;
const RETRY_MIN_MS = 3_000;
const RETRY_MAX_MS = 30_000;
/** The site's scrim: the frame's ground before the picture comes. */
const SCRIM = '#1b2226';

type LiveState = 'playing' | 'stalled';

export default function LiveLayer({ src, guide, stopped }: { src: string | null; guide: string | null; stopped: boolean }) {
  // Which stream is playing, so a new one is not shown on the old one's word.
  const [playing, setPlaying] = useState<string | null>(null);
  // Which stream has played at all, so a drop is told apart from a start.
  const [seen, setSeen] = useState<string | null>(null);
  const shown = src !== null && playing === src;
  const dropped = !shown && src !== null && seen === src;
  const line = shown
    ? `${guide ? `${guide} is guiding. ` : ''}Live, and not recorded. Nobody can see or hear you.`
    : stopped
      ? 'This session was stopped. It will be back soon.'
      : dropped
        ? 'The picture dropped. It will come back by itself.'
        : null;

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: shown ? 1 : 0, duration: 1000, easing: EASE, useNativeDriver: true }).start();
  }, [shown, fade]);

  return (
    <View style={s.layer} pointerEvents="none">
      <Animated.View style={[s.frame, { opacity: fade }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {src !== null && (
          <LiveStream
            key={src}
            src={src}
            onState={(st) => {
              setPlaying(st === 'playing' ? src : null);
              if (st === 'playing') setSeen(src);
            }}
          />
        )}
      </Animated.View>
      <Animated.Text style={[type.caption, s.line]} accessibilityLiveRegion="polite">
        {line ?? ''}
      </Animated.Text>
    </View>
  );
}

function LiveStream({ src, onState }: { src: string; onState: (state: LiveState) => void }) {
  const report = useRef(onState);
  report.current = onState;
  const player = useVideoPlayer(null, (p) => {
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
    p.staysActiveInBackground = false;
    p.showNowPlayingNotification = false;
    p.allowsExternalPlayback = false;
  });

  useEffect(() => {
    let cancelled = false;
    let away = AppState.currentState !== 'active';
    let retry = RETRY_MIN_MS;
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const clearStall = () => {
      clearTimeout(stallTimer);
      stallTimer = undefined;
    };
    const watch = () => {
      if (!away && !stallTimer && !retryTimer) stallTimer = setTimeout(fail, STALL_MS);
    };

    const load = () => {
      if (cancelled || away) return;
      watch();
      player
        .replaceAsync({ uri: src, contentType: 'hls' })
        .then(() => {
          if (!cancelled) player.play();
        })
        .catch(() => fail());
    };

    function fail() {
      if (cancelled || retryTimer) return;
      clearStall();
      report.current('stalled');
      player.pause();
      if (away) return;
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        load();
      }, retry);
      retry = Math.min(retry * 2, RETRY_MAX_MS);
    }

    const subs = [
      player.addListener('playingChange', ({ isPlaying }) => {
        if (isPlaying) {
          clearStall();
          retry = RETRY_MIN_MS;
          report.current('playing');
        } else watch();
      }),
      player.addListener('statusChange', ({ status }) => {
        if (status === 'error') fail();
        else if (status === 'loading') watch();
      }),
      player.addListener('playToEnd', () => fail()),
    ];
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (!away) return;
        away = false;
        // Back at live, not where the picture was paused.
        clearTimeout(retryTimer);
        retryTimer = undefined;
        retry = RETRY_MIN_MS;
        load();
      } else if (!away) {
        away = true;
        clearStall();
        clearTimeout(retryTimer);
        retryTimer = undefined;
        report.current('stalled');
      }
    });
    load();

    return () => {
      cancelled = true;
      clearStall();
      clearTimeout(retryTimer);
      subs.forEach((sub) => sub.remove());
      app.remove();
      player.pause();
    };
  }, [player, src]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
      pointerEvents="none"
    />
  );
}

const s = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 64, paddingBottom: 96 },
  frame: { width: '100%', maxWidth: 896, aspectRatio: 16 / 9, overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: RULE, backgroundColor: SCRIM },
  line: { marginTop: 12, minHeight: 24, textAlign: 'center' },
});
