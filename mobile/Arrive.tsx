// The arrival, on the phone: the site's `Arrive.tsx`, drawn natively over
// the pond. One sentence and Begin — *Sit [by yourself] for [10 minutes],
// end with [a singing bowl], in [silence].* — each choice a phrase that opens
// its wheel (`Picker.tsx`). The header is the site's: the mark and the name,
// the clock, and *Sign in* or your name.
//
// On Begin the sentence goes into the water a word at a time, in reading
// order (the site's `.sink`: each word drifts down a little and fades, the
// fade lagging the drift), everything else fades, and the pebble in your
// hand hands over to the thrown one on the pond.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SITTING_OPTIONS } from '../lib/journey';
import { localTime } from '../lib/format';
import { TIMER_STOPS, nextSharedBellAt } from '../lib/timer';
import { BELL_KINDS, TRACK_SLUGS, type BellKind, type TrackSlug, type UserPreferences } from '../lib/types';
import type { Point } from '../lib/pond';
import Picker from './Picker';
import { Brand, EASE, INK, INK2, INK3, SERIF_REGULAR, type } from './ui';

const BELL_WORDS: Record<BellKind, string> = {
  'singing-bowl': 'a singing bowl',
  gong: 'a tongue drum',
  'struck-bell': 'a struck bell',
};

export const SOUND_WORDS: Record<TrackSlug | 'silence', string> = {
  silence: 'silence',
  rain: 'rain',
  wind: 'wind',
  waterfall: 'a creek',
  ocean: 'the sea',
  fire: 'a fire',
  hum: 'a low hum',
  chimes: 'wind chimes',
  bowl: 'a humming bowl',
  night: 'evening sounds',
};

/** The sink: each word's 380ms, staggered across 220ms by its place in the sentence. */
const SINK_MS = 380;
const STAGGER_MS = 220;
/** Everything but the sentence goes in 300ms. */
const FADE_MS = 300;

type Open = 'm' | 't' | 'b' | 's' | null;
/** A phrase in the sentence, or plain words. */
type Part = string | { phrase: string; open: Exclude<Open, null>; name: string };
/** What goes into the water as one: a word, or a phrase with the punctuation that clings to it. */
type Unit = { parts: Part[]; space: boolean };

function minutes(m: number): string {
  return `${m} ${m === 1 ? 'minute' : 'minutes'}`;
}

/** The sentence's pieces, cut where it may wrap: at spaces, never between a phrase and its comma. */
function units(segments: Part[]): Unit[] {
  const out: Unit[] = [];
  let cur: Part[] = [];
  const close = (space: boolean) => {
    if (cur.length) out.push({ parts: cur, space });
    cur = [];
  };
  for (const seg of segments) {
    if (typeof seg !== 'string') {
      cur.push(seg);
      continue;
    }
    for (const piece of seg.split(/(\s+)/)) {
      if (piece === '') continue;
      if (piece.trim() === '') close(true);
      else cur.push(piece);
    }
  }
  close(false);
  return out;
}

export default function Arrive({
  prefs, update, guided, onGuided, guide, name, others, now, leaving,
  onAccount, onBegin, onPreviewBell, onStopBell, onTaste, onHush,
}: {
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  guided: boolean;
  onGuided: (guided: boolean) => void;
  /** Who is guiding: "Live now", or when the next session starts. */
  guide: string | null;
  /** Signed in: the word for the corner, as the site's corner says it (a first name, the email's first part, or Account). */
  name: string | null;
  others: number;
  /** The session clock, or null until it has been read: the clock and the bell's time wait, and so does Begin. */
  now: number | null;
  /** Begin was pressed: the words go into the water. */
  leaving: boolean;
  onAccount: () => void;
  /** Where the pebble was in your hand, on the screen. */
  onBegin: (from: Point) => void;
  onPreviewBell: (kind: BellKind) => void;
  onStopBell: () => void;
  onTaste: (slug: TrackSlug) => void;
  onHush: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<Open>(null);
  const pebble = useRef<View>(null);

  // One clock for the whole leaving, in milliseconds since Begin.
  const leave = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!leaving) return leave.setValue(0);
    Animated.timing(leave, { toValue: SINK_MS + STAGGER_MS, duration: SINK_MS + STAGGER_MS, easing: Easing.linear, useNativeDriver: true }).start();
  }, [leaving, leave]);
  // The site's Tailwind default curve for the 300ms fade, and CSS ease-out
  // for the pebble's fifth of a second.
  const fade = { opacity: eased(leave, 0, FADE_MS, 1, 0, Easing.bezier(0.4, 0, 0.2, 1)) };

  const bellLabel = now === null ? null : localTime(nextSharedBellAt(now));
  const untilBell = `until the bell${bellLabel ? ` at ${bellLabel}` : ''}`;
  const together = prefs.showCount && prefs.untilBell;
  const sound: TrackSlug | 'silence' = TRACK_SLUGS.find((t) => (prefs.soundMix[t] ?? 0) > 0) ?? 'silence';

  const sentence = units([
    'Sit ',
    { phrase: guided ? 'with a guide' : 'by yourself', open: 'm', name: 'How' },
    // A guided sitting is the session's: it ends on the shared bell.
    ...(guided
      ? [` ${untilBell}`]
      : [together ? ' ' : ' for ', { phrase: together ? untilBell : minutes(prefs.timerMinutes), open: 't' as const, name: 'How long' }]),
    ', end with ',
    { phrase: BELL_WORDS[prefs.endBell], open: 'b', name: 'The bell' },
    sound === 'silence' ? ', in ' : ', with ',
    { phrase: SOUND_WORDS[sound], open: 's', name: 'Sound' },
    '.',
  ]);

  const sink = (i: number) => {
    const from = (i / sentence.length) * STAGGER_MS;
    return {
      // The fade lags the drift, so each word is seen going down before it goes.
      opacity: eased(leave, from, from + SINK_MS, 1, 0, Easing.bezier(0.4, 0, 1, 1)),
      transform: [{ translateY: eased(leave, from, from + SINK_MS, 0, 4, EASE) }],
    };
  };

  const part = (p: Part, k: number): ReactNode =>
    typeof p === 'string' ? (
      p
    ) : (
      <Text
        key={k}
        onPress={() => setOpen(p.open)}
        accessibilityRole="button"
        accessibilityLabel={`${p.name}: ${p.phrase}`}
        style={s.phrase}
      >
        {p.phrase}
      </Text>
    );

  const begin = () => {
    pebble.current?.measureInWindow((x, y, w, h) => onBegin({ x: x + w / 2, y: y + h / 2 }));
  };

  const pickSound = (slug: TrackSlug | 'silence') => {
    const mix: Partial<Record<TrackSlug, number>> = {};
    for (const t of TRACK_SLUGS) mix[t] = t === slug ? 1 : 0;
    update({ soundMix: { ...prefs.soundMix, ...mix } });
  };

  return (
    <View
      style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: 24 }]}
      pointerEvents={leaving ? 'none' : 'box-none'}
    >
      <Animated.View style={[s.header, fade]}>
        <Brand />
        <View style={s.corner}>
          {now !== null && <Text style={s.clock}>{localTime(now)}</Text>}
          <Pressable onPress={onAccount} hitSlop={8} style={s.word}>
            <Text style={s.cornerWord} numberOfLines={1}>{name ?? 'Sign in'}</Text>
          </Pressable>
        </View>
      </Animated.View>

      <View style={{ marginTop: 'auto' }} pointerEvents="box-none">
        {others > 0 && <Animated.Text style={[type.body, { marginBottom: 16 }, fade]}>Each fish is someone sitting this hour.</Animated.Text>}
        <View style={s.sentence}>
          {sentence.map((u, i) => (
            <Animated.View key={i} style={sink(i)}>
              <Text style={type.sentence}>
                {u.parts.map(part)}
                {u.space ? ' ' : ''}
              </Text>
            </Animated.View>
          ))}
        </View>
        {guided && guide && <Animated.Text style={[type.body, { marginTop: 12, color: INK3 }, fade]}>{guide}.</Animated.Text>}

        <Pressable
          onPress={begin}
          disabled={now === null}
          accessibilityRole="button"
          style={({ pressed }) => [s.begin, now === null && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
        >
          {/* The pebble in your hand: it hands over to the thrown one, which
              fades up out of the same spot over the same fifth of a second. */}
          <Animated.View ref={pebble} style={{ opacity: eased(leave, 0, 200, 1, 0, Easing.bezier(0, 0, 0.58, 1)) }}>
            <Image source={require('./assets/skipping-stone.webp')} style={{ width: 28, height: 10 }} />
          </Animated.View>
          <Animated.Text style={[s.beginWord, fade]}>Begin</Animated.Text>
        </Pressable>
      </View>

      {open === 'm' && (
        <Picker
          title="How you sit"
          value={guided ? 'guided' : 'alone'}
          options={SITTING_OPTIONS}
          onConfirm={(v) => {
            onGuided(v === 'guided');
            setOpen(null);
          }}
          onCancel={() => setOpen(null)}
        />
      )}
      {open === 't' && (
        <Picker
          title="How long"
          value={together ? 'bell' : String(prefs.timerMinutes)}
          options={[
            ...TIMER_STOPS.map((m) => ({ value: String(m), label: minutes(m) })),
            { value: 'bell', label: untilBell },
          ]}
          onConfirm={(v) => {
            update(v === 'bell' ? { untilBell: true, showCount: true } : { timerMinutes: Number(v), untilBell: false });
            setOpen(null);
          }}
          onCancel={() => setOpen(null)}
        />
      )}
      {open === 'b' && (
        <Picker
          title="The bell at the end"
          value={prefs.endBell}
          options={BELL_KINDS.map((k) => ({ value: k, label: BELL_WORDS[k], audible: true }))}
          onConfirm={(v) => {
            update({ endBell: v as BellKind });
            setOpen(null);
          }}
          onCancel={() => setOpen(null)}
          onPlay={(v) => onPreviewBell(v as BellKind)}
          onStop={onStopBell}
          playMs={4000}
        />
      )}
      {open === 's' && (
        <Picker
          title="While you sit"
          value={sound}
          options={(['silence', ...TRACK_SLUGS] as const).map((slug) => ({ value: slug, label: SOUND_WORDS[slug], audible: slug !== 'silence' }))}
          onConfirm={(v) => {
            pickSound(v as TrackSlug | 'silence');
            setOpen(null);
          }}
          onCancel={() => setOpen(null)}
          onPlay={(v) => onTaste(v as TrackSlug)}
          onStop={onHush}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  corner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: -8 },
  clock: { fontFamily: SERIF_REGULAR, fontSize: 16, color: INK3, fontVariant: ['tabular-nums'] },
  // At most 10rem, cut short, as the site's corner.
  word: { minHeight: 44, maxWidth: 160, justifyContent: 'center', paddingHorizontal: 8 },
  cornerWord: { fontFamily: SERIF_REGULAR, fontSize: 16, color: INK2, textDecorationLine: 'underline', textDecorationColor: '#cdd4d9' },
  sentence: { flexDirection: 'row', flexWrap: 'wrap', maxWidth: 576 },
  phrase: { color: INK, textDecorationLine: 'underline', textDecorationColor: 'rgba(90,101,108,0.6)' },
  begin: { marginTop: 40, marginLeft: -8, alignSelf: 'flex-start', minHeight: 48, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  beginWord: { fontSize: 24, color: INK },
});

/**
 * An eased stretch of the leaving's clock the native driver can run: it
 * takes no `easing` in `interpolate`, so the curve is sampled into short
 * straight pieces, held at both ends.
 */
function eased(clock: Animated.Value, from: number, to: number, start: number, end: number, ease: (t: number) => number) {
  const t = Array.from({ length: 17 }, (_, i) => i / 16);
  return clock.interpolate({
    inputRange: t.map((x) => from + (to - from) * x),
    outputRange: t.map((x) => start + (end - start) * ease(x)),
    extrapolate: 'clamp',
  });
}
