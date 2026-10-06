// One phrase of the arrival's sentence, chosen on a wheel in the middle of
// the screen: the site's `Picker.tsx`, on the phone. The water goes pale
// behind it; the choices stand in a column that scrolls with the phone's own
// momentum and snaps to each row, the middle row between two hairlines, the
// neighbours faint above and below. Tap the middle row or Done to take it;
// tap a faint row and it comes to the middle; tap outside and nothing
// changes. A row that makes a sound has a play button while it is in the
// middle: a few seconds of it, then the button again.
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Button, EASE, INK, INK3, PAPER, RULE, SERIF_REGULAR, SETTLE_MS, SURFACE, type } from './ui';

export interface PickerOption {
  value: string;
  label: string;
  /** Has a play button: a bell, or a bed that is not silence. */
  audible?: boolean;
}

const ROW = 52;
const VISIBLE = 5;

export default function Picker({
  title, options, value, onConfirm, onCancel, onPlay, onStop, playMs = 6500,
}: {
  title: string;
  options: readonly PickerOption[];
  value: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  onPlay?: (value: string) => void;
  onStop?: () => void;
  /** How long a taste lasts, so the button comes back when it has gone quiet. */
  playMs?: number;
}) {
  const start = Math.max(0, options.findIndex((o) => o.value === value));
  const [cur, setCur] = useState(start);
  const [playing, setPlaying] = useState<string | null>(null);
  const wheel = useRef<ScrollView>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const stopRef = useRef(onStop);
  stopRef.current = onStop;

  // The screen settles in: a short rise and a fade, the site's `screen-settle`.
  const settle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(settle, { toValue: 1, duration: SETTLE_MS, easing: EASE, useNativeDriver: true }).start();
  }, [settle]);

  const stop = () => {
    clearTimeout(timer.current);
    if (playingRef.current !== null) stopRef.current?.();
    playingRef.current = null;
    setPlaying(null);
  };

  // Closing stops it too, whichever way it closes.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (playingRef.current !== null) stopRef.current?.();
    },
    [],
  );

  const goTo = (j: number) => wheel.current?.scrollTo({ y: j * ROW, animated: true });
  const take = () => onConfirm(options[cur]!.value);
  const play = () => {
    const o = options[cur]!;
    if (playing === o.value) return stop();
    clearTimeout(timer.current);
    onPlay?.(o.value);
    playingRef.current = o.value;
    setPlaying(o.value);
    timer.current = setTimeout(stop, playMs);
  };
  const centre = options[cur];

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        s.screen,
        { opacity: settle, transform: [{ translateY: settle.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
      ]}
      accessibilityViewIsModal
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Close" />
      <Text style={[type.caption, { marginBottom: 12 }]}>{title}</Text>
      <View style={s.frame}>
        <View pointerEvents="none" style={s.hairlines} />
        <ScrollView
          ref={wheel}
          style={{ height: ROW * VISIBLE }}
          contentContainerStyle={{ paddingVertical: ROW * 2 }}
          contentOffset={{ x: 0, y: start * ROW }}
          snapToInterval={ROW}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.y / ROW);
            if (i !== cur && i >= 0 && i < options.length) {
              stop();
              setCur(i);
            }
          }}
          accessibilityRole="adjustable"
          accessibilityLabel={title}
          accessibilityValue={{ text: centre?.label }}
        >
          {options.map((o, j) => {
            const d = Math.abs(j - cur);
            return (
              <Pressable
                key={o.value}
                onPress={() => (j === cur ? take() : goTo(j))}
                style={[s.row, { opacity: d === 0 ? 1 : Math.max(0.3, 1 - d * 0.3) }]}
              >
                <Text numberOfLines={1} style={[s.label, { color: j === cur ? INK : INK3 }]}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {/* The wheel fades out above and below, where the site masks it. */}
        <View pointerEvents="none" style={s.fade}>
          <Svg width="100%" height={ROW * VISIBLE}>
            <Defs>
              <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={PAPER} stopOpacity={0.95} />
                <Stop offset="0.3" stopColor={PAPER} stopOpacity={0} />
                <Stop offset="0.7" stopColor={PAPER} stopOpacity={0} />
                <Stop offset="1" stopColor={PAPER} stopOpacity={0.95} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#fade)" />
          </Svg>
        </View>
        {centre?.audible && onPlay && (
          <Pressable
            onPress={play}
            accessibilityLabel={playing === centre.value ? `Stop ${centre.label}` : `Play ${centre.label}`}
            style={({ pressed }) => [s.play, pressed && { opacity: 0.7 }]}
          >
            <Svg width={12} height={12} viewBox="0 0 12 12">
              {playing === centre.value ? (
                <Rect x={2} y={2} width={8} height={8} rx={1.5} fill={INK} />
              ) : (
                <Path d="M3 1.8v8.4a.6.6 0 0 0 .9.5l7-4.2a.6.6 0 0 0 0-1l-7-4.2a.6.6 0 0 0-.9.5z" fill={INK} />
              )}
            </Svg>
          </Pressable>
        )}
      </View>
      <Button small label="Done" onPress={take} style={{ marginTop: 24 }} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  screen: { backgroundColor: 'rgba(229,233,236,0.95)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, zIndex: 40 },
  frame: { width: '100%', maxWidth: 384, height: ROW * VISIBLE },
  hairlines: { position: 'absolute', left: 24, right: 24, top: ROW * 2, height: ROW, borderTopWidth: 1, borderBottomWidth: 1, borderColor: RULE },
  fade: { position: 'absolute', left: 0, right: 0, top: 0 },
  row: { height: ROW, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 64 },
  label: { fontFamily: SERIF_REGULAR, fontSize: 24 },
  play: { position: 'absolute', right: 28, top: ROW * 2 + 6, width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: RULE, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center' },
});
