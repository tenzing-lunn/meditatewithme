// The sitting, on the phone: the site's `Sitting.tsx` and `SoundLine.tsx`,
// drawn over the pond, which `App.tsx` keeps underneath. With others, their
// fish and one sentence about who is here; by yourself, your own rings
// alone. The mark is faint in the corner and the time left small beside it,
// because the water is the thing.
//
// THE CONTROLS REST. Back, the mark, the clock, Sound and End are there
// when the sitting begins and fade after four seconds of stillness, leaving
// the water; any touch brings them back. Resting, they cannot be pressed,
// and the touch that wakes them lands on the water instead (the fish
// scatter). They stay while the sound line is open or End is asking.
//
// END ASKS FIRST. End turns into *End the sitting now?* with *Yes, end* and
// *Keep sitting*, in the same place, and takes itself back after six
// seconds, so a stray touch in the dark never costs a sitting. Back, beside
// the mark, ends at once, as the site's chevron does.
//
// SOUND opens one line of the sentence's own words above the foot; one tap
// and it is playing. It closes three seconds after the last touch, and a
// touch anywhere above the foot closes it.
//
// ENDED. The bell has rung and this is the held beat before the minutes:
// the clock and the controls are gone, *Come back.* comes up where the
// minutes will be while the tail rings out, and the company line stays.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { companyLine } from '../lib/company';
import { localTime } from '../lib/format';
import type { Point } from '../lib/pond';
import { mmss, remainingMs } from '../lib/timer';
import { TRACK_SLUGS, type TrackSlug } from '../lib/types';
import { SOUND_WORDS } from './Arrive';
import { Back, Brand, EASE, EMBER, INK, INK3, SERIF_REGULAR, Word, type } from './ui';

/** Stillness, in ms, before the controls rest. */
const CONTROLS_REST_MS = 4000;
/** Untouched, in ms, before the line of sounds closes itself. */
const SOUND_REST_MS = 3000;
/** How long *End the sitting now?* waits before it takes itself back. */
const CONFIRM_MS = 6000;
/** Tailwind's own transition curve, which the site's controls fade on. */
const FADE_EASE = Easing.bezier(0.4, 0, 0.2, 1);

export interface Sit {
  /** Minted at Begin, and carried into the practice log, so a sitting is recorded once. */
  id: string;
  /** Monotonic. */
  startedAt: number;
  /** Wall clock, for the practice log. */
  startedAtWall: number;
  /** Monotonic. */
  endsAt: number;
  /** Ends on the shared bell, with everyone else who chose it. */
  together: boolean;
  /** Among the others: their fish are shown, and the company line. */
  withOthers: boolean;
  /** *With a guide*: whoever is on camera, framed on the water, and no fish. */
  guided: boolean;
}

/** Where the minutes stand, and *Come back.* before them: 58% down, under the header. */
export function useMinutesTop(): number {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return insets.top + 16 + 24 + height * 0.58;
}

export default function Sitting({
  sit, now, mono, count, litCount, labels, ownLabel, soundMix, onSound, onSoundOpen, onEnd, onBack, onTap, ended = false, nextSession = null,
}: {
  sit: Sit;
  now: number | null;
  mono: number;
  count: number | null;
  litCount: number | null;
  /** Names on the water right now, from `/api/world`. */
  labels: readonly string[];
  ownLabel: string | null;
  soundMix: Record<string, number>;
  onSound: (patch: Partial<Record<TrackSlug, number>>) => void;
  onSoundOpen: () => void;
  onEnd: () => void;
  onBack: () => void;
  /** A touch on the sitting, where it landed. */
  onTap: (at: Point) => void;
  /** The bell has rung: the held beat, before the minutes. */
  ended?: boolean;
  /** Between two guides, when the next goes on: what the line says instead. */
  nextSession?: number | null;
}) {
  const insets = useSafeAreaInsets();
  const minutesTop = useMinutesTop();
  const [soundOpen, setSoundOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [awake, setAwake] = useState(true);
  const footTop = useRef(Infinity);
  const sheetHeight = useRef(0);

  const rest = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wake = useCallback(() => {
    setAwake(true);
    clearTimeout(rest.current);
    rest.current = setTimeout(() => setAwake(false), CONTROLS_REST_MS);
  }, []);
  useEffect(() => {
    wake();
    return () => clearTimeout(rest.current);
  }, [wake]);

  const soundRest = useRef<ReturnType<typeof setTimeout>>(undefined);
  const touchSound = useCallback(() => {
    clearTimeout(soundRest.current);
    soundRest.current = setTimeout(() => setSoundOpen(false), SOUND_REST_MS);
  }, []);
  useEffect(() => {
    if (!soundOpen) return;
    touchSound();
    return () => clearTimeout(soundRest.current);
  }, [soundOpen, touchSound]);

  // The bell may ring with the line open, or End asking; both go with the controls.
  useEffect(() => {
    if (!ended) return;
    setSoundOpen(false);
    setConfirming(false);
  }, [ended]);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => clearTimeout(t);
  }, [confirming]);

  const shown = !ended && (awake || soundOpen || confirming);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: shown ? 1 : 0, duration: 500, easing: FADE_EASE, useNativeDriver: true }).start();
  }, [shown, fade]);

  const comeBack = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!ended) return comeBack.setValue(0);
    Animated.timing(comeBack, { toValue: 1, duration: 1600, easing: EASE, useNativeDriver: true }).start();
  }, [ended, comeBack]);

  // Between two people on camera, that is what the line says; otherwise it is who is here.
  const line = !sit.withOthers
    ? null
    : nextSession !== null && !ended
      ? `The next session starts at ${localTime(nextSession)}.`
      : companyLine(labels, count, litCount, ownLabel, now ?? Date.now());
  const controls = { opacity: fade };
  const reach = shown ? 'box-none' : 'none';

  return (
    <View
      style={StyleSheet.absoluteFill}
      onTouchStart={(e) => {
        const { pageX, pageY } = e.nativeEvent;
        wake();
        // Above the line of sounds, which sits on top of the foot, is outside it.
        if (soundOpen && pageY < footTop.current - sheetHeight.current) setSoundOpen(false);
        onTap({ x: pageX, y: pageY });
      }}
    >
      <Animated.View style={[s.header, { paddingTop: insets.top + 16 }, controls]} pointerEvents={reach}>
        <View style={s.mark}>
          {!ended && <Back onPress={onBack} label="Back to the start" />}
          <Brand word={false} />
        </View>
        {!ended && (
          <Text accessibilityRole="timer" accessibilityLabel="Time left" style={[type.caption, s.clock]}>
            {mmss(remainingMs(sit.endsAt, mono))}
          </Text>
        )}
      </Animated.View>

      {ended && (
        <Animated.View
          pointerEvents="none"
          accessibilityLabel="Coming back"
          style={[s.comeBack, { top: minutesTop }, { opacity: comeBack, transform: [{ translateY: comeBack.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] }]}
        >
          <Text style={s.comeBackText}>Come back.</Text>
        </Animated.View>
      )}

      <View style={{ flex: 1 }} pointerEvents="none" />

      <View
        style={[s.foot, { paddingBottom: insets.bottom + 20 }]}
        onLayout={(e) => {
          footTop.current = e.nativeEvent.layout.y;
        }}
        pointerEvents="box-none"
      >
        {soundOpen && (
          <View
            style={s.sheet}
            onLayout={(e) => {
              sheetHeight.current = e.nativeEvent.layout.height;
            }}
          >
            <SoundLine mix={soundMix} onSound={onSound} onTouch={touchSound} />
          </View>
        )}
        <Text style={[type.body, s.line]}>{line ?? ''}</Text>
        <Animated.View style={[s.controls, controls]} pointerEvents={ended ? 'none' : reach}>
          {confirming ? (
            <View accessibilityLabel="End the sitting now?" style={s.confirm}>
              <Text style={s.ask}>End the sitting now?</Text>
              <View style={[s.row, { gap: 16 }]}>
                <Word label="Yes, end" ink onPress={onEnd} />
                <Word label="Keep sitting" onPress={() => setConfirming(false)} />
              </View>
            </View>
          ) : (
            <View style={s.row}>
              <Word
                label="Sound"
                onPress={() => {
                  if (!soundOpen) onSoundOpen();
                  setSoundOpen((v) => !v);
                }}
              />
              <Word
                label="End"
                onPress={() => {
                  setSoundOpen(false);
                  setConfirming(true);
                }}
              />
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const CHOICES = ['silence', ...TRACK_SLUGS] as const;

/** The sounds during a sitting: one line of the sentence's words; one tap and it is playing. */
function SoundLine({ mix, onSound, onTouch }: {
  mix: Record<string, number>;
  onSound: (patch: Partial<Record<TrackSlug, number>>) => void;
  onTouch: () => void;
}) {
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const spots = useRef<({ x: number; w: number } | undefined)[]>([]);
  const [offsets, setOffsets] = useState<number[]>([]);
  const opened = useRef(false);
  const chosen: TrackSlug | 'silence' = TRACK_SLUGS.find((t) => (mix[t] ?? 0) > 0) ?? 'silence';

  const centre = (i: number, animated: boolean) => {
    const spot = spots.current[i];
    if (spot) scroll.current?.scrollTo({ x: spot.x + spot.w / 2 - width / 2, animated });
  };

  const placed = (i: number, x: number, w: number) => {
    spots.current[i] = { x, w };
    if (spots.current.filter(Boolean).length < CHOICES.length) return;
    setOffsets(spots.current.map((p) => (p ? p.x + p.w / 2 - width / 2 : 0)));
    // Opened on the one that is on.
    if (!opened.current) {
      opened.current = true;
      centre(CHOICES.indexOf(chosen), false);
    }
  };

  const pick = (i: number) => {
    const slug = CHOICES[i];
    if (!slug) return;
    const patch: Partial<Record<TrackSlug, number>> = {};
    for (const t of TRACK_SLUGS) patch[t] = t === slug ? 1 : 0;
    onSound(patch);
    onTouch();
    centre(i, true);
  };

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      onScroll={onTouch}
      scrollEventThrottle={100}
      snapToOffsets={offsets.length ? offsets : undefined}
      decelerationRate="fast"
      accessibilityRole="radiogroup"
      accessibilityLabel="Sound"
      contentContainerStyle={{ paddingHorizontal: width / 2, gap: 24, alignItems: 'center' }}
    >
      {CHOICES.map((slug, i) => {
        const on = slug === chosen;
        return (
          <Pressable
            key={slug}
            onPress={() => pick(i)}
            onLayout={(e) => placed(i, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={s.word}
          >
            <Text style={[s.wordText, on ? s.wordOn : null]}>{SOUND_WORDS[slug]}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  mark: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clock: { fontVariant: ['tabular-nums'] },
  comeBack: { position: 'absolute', left: 24, right: 24, height: 56, alignItems: 'center', justifyContent: 'center' },
  comeBackText: { fontFamily: SERIF_REGULAR, fontSize: 28, lineHeight: 28, color: INK },
  foot: { alignItems: 'center', gap: 8, paddingHorizontal: 24 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: '100%', paddingBottom: 12 },
  line: { minHeight: 24, maxWidth: 448, textAlign: 'center' },
  controls: { alignItems: 'center' },
  row: { flexDirection: 'row', gap: 24, justifyContent: 'center' },
  confirm: { alignItems: 'center', gap: 4 },
  ask: { fontFamily: SERIF_REGULAR, fontSize: 16, lineHeight: 26, color: INK },
  word: { minHeight: 44, justifyContent: 'center' },
  wordText: { fontFamily: SERIF_REGULAR, fontSize: 24, color: INK3 },
  wordOn: { color: INK, textDecorationLine: 'underline', textDecorationColor: EMBER },
});
