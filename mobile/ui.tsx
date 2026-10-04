// The site's pieces, on the phone: its tokens (DESIGN.md), its type, its
// controls (`components/controls.ts`), the rail's switch between screens
// (`Rail.tsx`), the line a typed answer goes on with the prompt that writes
// itself out on it (`LineField.tsx`, `useTypedOut.ts`), and the skip and
// Next under that line (`LineActions.tsx`). Same measures, same one curve.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

export const PAPER = '#e5e9ec';
export const SURFACE = '#eef1f3';
export const INK = '#2a3136';
export const INK2 = '#4f5a61';
export const INK3 = '#5a656c';
export const RULE = '#cdd4d9';
export const EMBER = '#3e4c55';
export const EMBER_SOFT = '#d5dde2';
export const SERIF = 'Newsreader_700Bold';

/** The house easing: the rail, the settle, the draw. */
export const EASE = Easing.bezier(0.22, 1, 0.36, 1);
export const RAIL_MS = 300;
export const SETTLE_MS = 240;

// ---- the typed prompt ---------------------------------------------------------
export const START_MS = 200;
const CHAR_MS = 55;
const SPACE_MS = 45;
/** A beat after the last letter, so the skip reads as following it. */
const AFTER_MS = 120;

export function typingMs(text: string): number {
  let ms = 0;
  for (let i = 1; i < text.length; i += 1) ms += CHAR_MS + (text[i - 1] === ' ' ? SPACE_MS : 0);
  return ms;
}

/** A prompt typing itself out, once each time its screen arrives. */
export function useTypedOut(text: string, run: boolean): string {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!run) return;
    setShown(0);
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setShown(i);
      if (i < text.length) timer = setTimeout(tick, CHAR_MS + (text[i - 1] === ' ' ? SPACE_MS : 0));
    };
    timer = setTimeout(tick, START_MS);
    return () => clearTimeout(timer);
  }, [text, run]);
  return text.slice(0, shown);
}

/** The ember caret, blinking in steps, 1.1s. */
function Caret({ height }: { height: number }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn((v) => !v), 550);
    return () => clearInterval(t);
  }, []);
  return <View style={{ width: 2, height, borderRadius: 1, backgroundColor: EMBER, opacity: on ? 1 : 0, marginRight: 1, marginLeft: -3 }} />;
}

// ---- the rail -----------------------------------------------------------------
/**
 * The screens, one shown at a time, and the switch between them: the screen
 * you answered lifts 1.5rem and fades in 150ms as the next rises into its
 * place from just below over 300ms, from 120ms in. Going back runs both
 * downward. The first screen is simply where you are; it animates from the
 * second onward.
 */
export function Rail<S extends string>({ at, dir, render }: { at: S; dir: 1 | -1; render: (screen: S) => ReactNode }) {
  const [shown, setShown] = useState(at);
  const [leaving, setLeaving] = useState<S | null>(null);
  const enter = useRef(new Animated.Value(1)).current;
  const leave = useRef(new Animated.Value(1)).current;
  const sign = useRef(dir);

  if (shown !== at) {
    sign.current = dir;
    setLeaving(shown);
    setShown(at);
  }

  useEffect(() => {
    if (leaving === null) return;
    leave.setValue(1);
    enter.setValue(0);
    Animated.parallel([
      Animated.timing(leave, { toValue: 0, duration: RAIL_MS * 0.5, easing: EASE, useNativeDriver: true }),
      Animated.timing(enter, { toValue: 1, duration: RAIL_MS, delay: RAIL_MS * 0.4, easing: EASE, useNativeDriver: true }),
    ]).start(({ finished }) => finished && setLeaving(null));
  }, [leaving, shown, enter, leave]);

  const d = sign.current * 24;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {leaving !== null && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: leave, transform: [{ translateY: leave.interpolate({ inputRange: [0, 1], outputRange: [-d, 0] }) }] }]}
        >
          {render(leaving)}
        </Animated.View>
      )}
      <Animated.View
        key={shown}
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [d, 0] }) }] }]}
      >
        {render(shown)}
      </Animated.View>
    </View>
  );
}

// ---- type -------------------------------------------------------------------------
export const type = StyleSheet.create({
  /** The question: Newsreader 700, 1.75rem. */
  question: { fontFamily: SERIF, fontSize: 28, lineHeight: 32, color: INK },
  /** A sentence on the water: 2.125rem. */
  sentence: { fontFamily: SERIF, fontSize: 34, lineHeight: 38, color: INK },
  masthead: { fontFamily: SERIF, fontSize: 20, lineHeight: 20, letterSpacing: -0.2, color: INK },
  body: { fontSize: 16, lineHeight: 26, color: INK2 },
  caption: { fontSize: 13, lineHeight: 19.5, color: INK3 },
  /** What you press: 0.9375rem, semibold. */
  control: { fontSize: 15, fontWeight: '600' as const },
  /** What you type: 1.5rem. */
  answer: { fontSize: 24, lineHeight: 36, color: INK },
  error: { marginTop: 12, fontSize: 14, lineHeight: 21, color: '#8a4a3e' },
});

// ---- the controls ---------------------------------------------------------------
type Kind = 'primary' | 'quiet' | 'apple';

/**
 * A pill: ember filled for the one thing a screen is for, a rule outline
 * for the other thing, black for Apple's own button. 48px, or 38px (44 to
 * hit) at the foot of a question.
 */
export function Button({
  kind = 'primary', label, onPress, disabled, small, icon, style,
}: {
  kind?: Kind; label: string; onPress: () => void; disabled?: boolean; small?: boolean; icon?: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const filled = kind !== 'quiet';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={small ? { top: 3, bottom: 3 } : undefined}
      style={({ pressed }) => [
        c.button,
        small && c.buttonSm,
        kind === 'primary' && { backgroundColor: EMBER },
        kind === 'apple' && { backgroundColor: '#000' },
        kind === 'quiet' && c.quiet,
        disabled && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {icon}
      <Text style={[type.control, { color: filled ? '#fff' : INK2 }]}>{label}</Text>
    </Pressable>
  );
}

/** A quiet word, bounded by its underline, 44px to hit. */
export function Word({ label, onPress, disabled, style }: { label: string; onPress: () => void; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[c.word, disabled && { opacity: 0.5 }, style]}>
      <Text style={[type.control, { color: INK2, textDecorationLine: 'underline', textDecorationColor: RULE }]}>{label}</Text>
    </Pressable>
  );
}

/** Back, in the corner: a chevron in the menu's own 44px disc. */
export function Back({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel="Back" hitSlop={6} style={[c.icon, style]}>
      <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
        <Path d="M11 3.5 5.5 9l5.5 5.5" stroke={INK2} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

/** The mark and the name: the pond in miniature, and a sentence somebody says. */
export function Brand() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Svg width={26} height={20} viewBox="0 0 26 20" fill="none">
        <Circle cx={10} cy={10} r={6.5} stroke={INK} strokeOpacity={0.45} />
        <Circle cx={10} cy={10} r={9.5} stroke={INK} strokeOpacity={0.2} />
        <Ellipse cx={10} cy={10} rx={3.2} ry={2.5} fill={INK} rotation={-12} origin="10, 10" />
      </Svg>
      <Text style={type.masthead}>meditate with me</Text>
    </View>
  );
}

export function AppleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="#fff">
      <Path d="M16.37 1.43c0 1.14-.49 2.27-1.18 3.08-.74.9-1.99 1.57-2.99 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.57-2.27 1.21-2.98.8-.94 2.14-1.64 3.25-1.68.03.13.05.28.05.43Zm4.56 15.71c-.03.07-.46 1.58-1.52 3.12-.94 1.34-1.94 2.71-3.43 2.71-1.52 0-1.9-.88-3.63-.88-1.7 0-2.3.91-3.67.91-1.38 0-2.33-1.26-3.43-2.8C4 18.38 2.96 15.57 2.96 12.92c0-4.28 2.8-6.55 5.55-6.55 1.45 0 2.68.95 3.6.95.87 0 2.22-1.01 3.9-1.01.62 0 2.89.06 4.38 2.19-.13.09-2.39 1.37-2.39 4.19 0 3.26 2.86 4.42 2.96 4.45Z" />
    </Svg>
  );
}

export function GoogleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" />
      <Path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.05v2.59A10 10 0 0 0 12 22Z" />
      <Path fill="#FBBC05" d="M6.4 13.92a6 6 0 0 1 0-3.84V7.49H3.05a10 10 0 0 0 0 9.02l3.35-2.59Z" />
      <Path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.35 2.59C7.19 7.72 9.4 5.96 12 5.96Z" />
    </Svg>
  );
}

/** Where you are: one short mark per screen, the current one lit and longer. */
export function Steps({ step, steps }: { step: number; steps: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: steps }, (_, i) => (
        <View key={i} style={{ height: 3, borderRadius: 2, width: i + 1 === step ? 20 : 10, backgroundColor: i + 1 === step ? EMBER : 'rgba(90,101,108,0.3)' }} />
      ))}
    </View>
  );
}

// ---- the line -------------------------------------------------------------------
/**
 * A typed answer: a line, not a box, and a prompt that writes itself on it.
 * The line draws out from the left over the prompt's typing time, so the two
 * arrive as one gesture; it turns ember with the caret in it. The prompt is
 * ink-3 at 60%, lighter than an answer, and goes on the first key.
 */
export function LineField({
  prompt, value, onChangeText, active, inputRef, center, style, ...rest
}: {
  prompt: string; value: string; onChangeText: (v: string) => void;
  /** The screen is in the frame: type the prompt out and draw the line. */
  active: boolean;
  inputRef?: RefObject<TextInput | null>;
  /** The six-digit code: centred, no prompt. */
  center?: boolean;
  style?: StyleProp<ViewStyle>;
} & Omit<TextInputProps, 'style' | 'value' | 'onChangeText' | 'placeholder'>) {
  const typed = useTypedOut(prompt, active);
  const [focused, setFocused] = useState(false);
  const [width, setWidth] = useState(0);
  const draw = useRef(new Animated.Value(active ? 0 : 1)).current;
  useEffect(() => {
    if (!active) return;
    draw.setValue(0);
    Animated.timing(draw, { toValue: 1, duration: typingMs(prompt), delay: START_MS, easing: EASE, useNativeDriver: true }).start();
  }, [active, prompt, draw]);

  return (
    <View style={[{ height: 56, justifyContent: 'center' }, style]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <TextInput
        ref={inputRef}
        {...rest}
        value={value}
        onChangeText={onChangeText}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        caretHidden={value === '' && !center}
        selectionColor={EMBER}
        style={[type.answer, { height: 56, paddingTop: 4, paddingBottom: 8, paddingHorizontal: 0 }, center && { textAlign: 'center', fontSize: 30, letterSpacing: 12, fontVariant: ['tabular-nums'] }]}
      />
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: focused ? EMBER : 'rgba(90,101,108,0.8)', transform: [{ translateX: -width / 2 }, { scaleX: draw }, { translateX: width / 2 }] }}
      />
      {value === '' && !center && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 4, bottom: 10, flexDirection: 'row', alignItems: 'center' }}>
          <Caret height={26} />
          <Text style={[type.answer, { color: 'rgba(90,101,108,0.6)' }]}>{typed}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * The way on from a typed answer, under its line: the skip under the left
 * end, settling in only once the prompt has finished typing, and Next under
 * the right end once something is typed, coming up rather than appearing.
 */
export function LineActions({
  typed, active, prompt, onSkip, onNext, nextLabel = 'Next', skipLabel = 'Skip', disabled, children,
}: {
  typed: boolean; active: boolean; prompt: string; onSkip?: () => void; onNext: () => void;
  nextLabel?: string; skipLabel?: string; disabled?: boolean; children?: ReactNode;
}) {
  const settle = useRef(new Animated.Value(active ? 0 : 1)).current;
  const next = useRef(new Animated.Value(typed ? 1 : 0)).current;
  useEffect(() => {
    if (!active) return;
    settle.setValue(0);
    Animated.timing(settle, { toValue: 1, duration: SETTLE_MS, delay: START_MS + typingMs(prompt) + AFTER_MS, easing: EASE, useNativeDriver: true }).start();
  }, [active, prompt, settle]);
  useEffect(() => {
    Animated.timing(next, { toValue: typed ? 1 : 0, duration: SETTLE_MS, easing: EASE, useNativeDriver: true }).start();
  }, [typed, next]);
  const rise = (v: Animated.Value) => ({ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] });
  return (
    <View style={{ marginTop: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 }}>
        <Animated.View style={rise(settle)}>
          {onSkip ? <Word label={skipLabel} onPress={onSkip} disabled={disabled} style={{ marginLeft: -8 }} /> : <View />}
        </Animated.View>
        <Animated.View style={rise(next)} pointerEvents={typed ? 'auto' : 'none'}>
          <Button small label={nextLabel} onPress={onNext} disabled={disabled} />
        </Animated.View>
      </View>
      {children && <View style={{ marginTop: 24 }}>{children}</View>}
    </View>
  );
}

const c = StyleSheet.create({
  button: { minHeight: 48, paddingHorizontal: 28, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  buttonSm: { minHeight: 38, paddingHorizontal: 20 },
  quiet: { borderWidth: 1, borderColor: RULE },
  word: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  icon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: RULE, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center' },
});
