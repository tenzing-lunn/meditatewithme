// After the bell, on the phone: the site's `Afterwards.tsx`. The first ten
// seconds are not here — the bell is still ringing, and the sitting stays
// on the water with *Come back.* over it (`Sitting`, `ended`). Then the
// minutes in the serif where *Come back.* stood, one line, and the two ways
// on. No streak and no total: the ending is not a scoreboard.
//
// *Again* asks the site's *Same setup?*, with the setup said in one line:
// *Yes* sits again at once, the stone thrown from it; *No* goes to the
// arrival, whose sentence is the setup, where the site walks five steps.
import { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BELLS } from '../lib/bells';
import { localTime, sentenceList } from '../lib/format';
import type { Point } from '../lib/pond';
import { durationLabel, nextSharedBellAt } from '../lib/timer';
import { TRACK_SLUGS, type TrackSlug, type UserPreferences } from '../lib/types';
import { useMinutesTop } from './Sitting';
import { Brand, EASE, INK, INK2, PAPER, SERIF_REGULAR, Word, type } from './ui';

/** The held beat after the bell, on the water, before this is shown. */
export const COOLDOWN_MS = 10_000;

export default function Afterwards({ minutes, onAgain, onDone }: {
  minutes: number;
  onAgain: () => void;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const top = useMinutesTop();
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 900, delay: 200, easing: EASE, useNativeDriver: true }).start();
  }, [rise]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 24 }}>
        <Brand />
      </View>
      <Animated.View
        style={[s.block, { top }, { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [6.4, 0] }) }] }]}
      >
        <Text style={s.minutes}>
          {minutes} {minutes === 1 ? 'minute' : 'minutes'}.
        </Text>
        <Text style={[type.body, { marginTop: 16 }]}>The water is still again.</Text>
        <View style={s.row}>
          <Word label="Again" ink onPress={onAgain} />
          <Word label="Done" onPress={onDone} />
        </View>
      </Animated.View>
    </View>
  );
}

/** The beds' names as the site's settings line says them (`components/mix.ts`). */
const LABELS: Record<TrackSlug, string> = {
  rain: 'rain',
  wind: 'wind',
  waterfall: 'creek',
  ocean: 'ocean',
  fire: 'fire',
  hum: 'hum',
  chimes: 'chimes',
  bowl: 'bowl',
  night: 'evening',
};

/** The site's `settingsLine`: "10 minutes · singing bowl · in silence". */
function settingsLine(prefs: UserPreferences, now: number | null): string {
  const d = durationLabel(prefs.timerMinutes);
  const duration = prefs.untilBell
    ? now === null ? 'Until the next bell' : `Until ${localTime(nextSharedBellAt(now))}`
    : `${d.value} ${d.unit}`;
  const on = TRACK_SLUGS.filter((t) => (prefs.soundMix[t] ?? 0) > 0);
  const sound = on.length === 0 ? 'in silence' : sentenceList(on.map((t) => LABELS[t]));
  return `${duration} · ${BELLS[prefs.endBell].label.toLowerCase()} · ${sound}`;
}

/**
 * *Same setup?* — the site's `AgainSetup` first question, over the water:
 * Back to the minutes, *Yes* to sit again with the stone, *No* to the
 * arrival's sentence.
 */
export function SameSetup({ prefs, now, onYes, onNo, onBack }: {
  prefs: UserPreferences;
  now: number | null;
  /** Where the pebble was, for the stone. */
  onYes: (from: Point) => void;
  onNo: () => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const pebble = useRef<View>(null);
  return (
    <View style={[StyleSheet.absoluteFill, s.setup, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center' }}>
        {/* The site's pond choice in its sans: Back is the quiet way out, not a step. */}
        <Pressable onPress={onBack} style={[s.choice, { marginLeft: -8 }]}>
          <Text style={[s.choiceText, s.choiceSans]}>Back</Text>
        </Pressable>
      </View>
      <View style={s.ask}>
        <Text accessibilityRole="header" style={s.question}>Same setup?</Text>
        <Text style={[type.body, { marginTop: 20, textAlign: 'center' }]}>By yourself · {settingsLine(prefs, now)}</Text>
        <View style={[s.row, { gap: 24 }]}>
          <Pressable
            disabled={now === null}
            onPress={() => pebble.current?.measureInWindow((x, y, w, h) => onYes({ x: x + w / 2, y: y + h / 2 }))}
            style={({ pressed }) => [s.yes, now === null && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
          >
            <View ref={pebble} collapsable={false}>
              <Image source={require('./assets/skipping-stone.webp')} style={{ width: 28, height: 10 }} />
            </View>
            <Text style={s.yesWord}>Yes</Text>
          </Pressable>
          <Pressable onPress={onNo} style={({ pressed }) => [s.choice, pressed && { opacity: 0.8 }]}>
            <Text style={s.choiceText}>No</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  setup: { backgroundColor: `${PAPER}f2`, paddingHorizontal: 24 },
  ask: { flex: 1, justifyContent: 'center', alignItems: 'center', maxWidth: 512, alignSelf: 'center', width: '100%' },
  yes: { minHeight: 48, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  yesWord: { fontSize: 24, color: INK },
  block: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  // Newsreader regular, as the site sets the minutes and the question here.
  minutes: { fontFamily: SERIF_REGULAR, fontSize: 56, lineHeight: 56, color: INK },
  question: { fontFamily: SERIF_REGULAR, fontSize: 28, lineHeight: 35, color: INK, textAlign: 'center' },
  /** The site's `POND_CHOICE`: the serif at the answer's size, ink-2, a thin ink-3 underline. */
  choice: { minHeight: 48, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontFamily: SERIF_REGULAR, fontSize: 24, color: INK2, textDecorationLine: 'underline', textDecorationColor: 'rgba(90,101,108,0.6)' },
  choiceSans: { fontFamily: 'System', fontSize: 15 },
  row: { marginTop: 32, flexDirection: 'row', gap: 32 },
});
