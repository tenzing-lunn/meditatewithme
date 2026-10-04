// The first launch: three breaths, then the sign-in as full screens, then
// the site's own name-and-place questions.
//
// Drawn from the canvas page *Onboarding · the app* (4 October 2026): three
// sentences on the water — who is here, the bell, that nobody sees you —
// then Sign in / Check your email / Create account. After a first sign-in
// the questions the site asks after a first sitting, as the site asks them
// (`components/NameScreen.tsx`, `OriginScreen.tsx`): what to call you, if
// the account has no name yet; where you are sitting, typed then chosen
// from the same town list, with the share switch under it; and, the app's
// own, whether to be told before the bell. *Just sit* skips the account.
// One component, one `step`: every screen shares the email, the name and
// the busy state, and nothing is navigated to twice.
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  type TargetedEvent,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAME_MAX, ORIGIN_MAX, cleanText, composeLabel } from '../lib/label';
import { normalizeEmail } from '../lib/emailCode';
import { searchPlaces, type PlaceIndex } from '../lib/places';
import { saveOrigin, signInWithApple, signInWithEmail, signInWithGoogle, verifyCode } from './auth';
import { loadPlaces, loadSuggestion } from './places';
import { supabase } from './supabase';

type Step = 'b1' | 'b2' | 'b3' | 'signin' | 'code' | 'create' | 'name' | 'place' | 'remind';

const PAPER = '#e5e9ec';
const INK = '#2a3136';
const INK2 = '#4f5a61';
const INK3 = '#5a656c';
const RULE = '#cdd4d9';
const EMBER = '#3e4c55';
const EMBER_SOFT = '#d5dde2';
const PROMPT = '#8a7f72';
const SERIF = 'Newsreader_400Regular';

export const REMIND_KEY = 'mwm.app.remind';

interface Option {
  key: string;
  /** What is kept when this is chosen. */
  value: string;
  primary: string;
  secondary: string | null;
}

function accountName(session: Session | null): string | null {
  const n = session?.user.user_metadata?.name;
  return typeof n === 'string' && n.trim() ? n.trim() : null;
}

export default function Onboarding({ onDone }: { onDone: (session: Session | null) => void }) {
  const [fontsLoaded] = useFonts({ Newsreader_400Regular });
  const [step, setStep] = useState<Step>('b1');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const insets = useSafeAreaInsets();
  const field = useRef<TextInput>(null);
  const scroller = useRef<ScrollView>(null);

  // A field that takes focus is scrolled clear of the keyboard, with `room`
  // under it for the link or button that follows (the scroll view starts
  // below the status bar, which the helper's sums do not know about).
  const reveal = (room: number) => (e: NativeSyntheticEvent<TargetedEvent>) => {
    scroller.current?.scrollResponderScrollNativeHandleToKeyboard(e.currentTarget, insets.top + 8 + room, true);
  };

  // Where you are sitting: typed, then chosen.
  const [city, setCity] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [share, setShare] = useState(false);
  const [index, setIndex] = useState<PlaceIndex | null>(null);
  const [indexFailed, setIndexFailed] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  // Signing in, by any of the three ways, moves on to the questions: the
  // name first when the account has none, otherwise straight to the place.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!s) return;
      setSession(s);
      setBusy(false);
      setError(null);
      setStep((current) =>
        current === 'name' || current === 'place' || current === 'remind'
          ? current
          : accountName(s)
            ? 'place'
            : 'name',
      );
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setError(null);
    const t = setTimeout(() => field.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [step]);

  // The town list and the connection's guess, fetched once the sign-in is
  // on screen so they are here by the time the question is.
  const asked = step !== 'b1' && step !== 'b2' && step !== 'b3';
  useEffect(() => {
    if (!asked) return;
    let live = true;
    void loadPlaces().then((i) => {
      if (!live) return;
      if (i) setIndex(i);
      else setIndexFailed(true);
    });
    void loadSuggestion().then((s) => live && setSuggestion(s));
    return () => {
      live = false;
    };
  }, [asked]);

  const go = (to: Step) => () => setStep(to);

  const run = async (fn: () => Promise<string | null>, then?: () => void) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const message = await fn();
    setBusy(false);
    if (message) setError(message);
    else then?.();
  };

  const sendCode = (withName: boolean) => () => {
    const address = normalizeEmail(email);
    if (!address) {
      setError('That does not look like an email address.');
      return;
    }
    void run(
      () => signInWithEmail(address, withName ? (cleanText(name, NAME_MAX) ?? undefined) : undefined),
      () => setStep('code'),
    );
  };

  const confirm = () => {
    if (code.length !== 6) {
      setError('The code is six digits.');
      return;
    }
    // No `then`: the auth listener above changes the screen.
    void run(() => verifyCode(email, code));
  };

  const saveName = () => {
    const n = cleanText(name, NAME_MAX);
    if (!n) return setStep('place');
    void run(
      async () => {
        const { error: e } = await supabase.auth.updateUser({ data: { name: n } });
        return e ? 'The name could not be saved just now. Please try again.' : null;
      },
      () => setStep('place'),
    );
  };

  const typed = city.trim();
  const options = useMemo<Option[]>(() => {
    if (!typed) {
      return suggestion ? [{ key: 'near', value: suggestion, primary: suggestion, secondary: 'near you' }] : [];
    }
    const found = index ? searchPlaces(index, typed, 5) : [];
    const list: Option[] = found.map((p) => ({
      key: `place:${p.label}`,
      value: p.label,
      primary: p.city ?? p.country,
      secondary: p.city ? p.country : null,
    }));
    const lower = typed.toLowerCase();
    if (!found.some((p) => p.label.toLowerCase() === lower)) {
      list.push({ key: 'typed', value: typed, primary: `Keep “${typed}”`, secondary: 'as you typed it' });
    }
    return list;
  }, [index, typed, suggestion]);
  const looking = Boolean(typed) && index === null && !indexFailed;
  const listed = listOpen && (options.length > 0 || looking);
  const rows = listed ? options.length + (looking ? 1 : 0) : 0;

  // The list opens under the line: scroll the line up just enough for the
  // rows to show above the keyboard, and no further, so the line stays
  // on screen while typing. `field` is the city line on this step.
  useEffect(() => {
    if (rows && field.current) {
      scroller.current?.scrollResponderScrollNativeHandleToKeyboard(field.current, insets.top + 8 + rows * 44 + 28, true);
    }
  }, [rows, insets.top]);

  const savePlace = (skip: boolean) => () => {
    if (!session) return setStep('remind');
    const origin = skip ? null : cleanText(city, ORIGIN_MAX);
    void run(() => saveOrigin(session.user.id, origin, !skip && share), () => setStep('remind'));
  };

  const remind = (yes: boolean) => async () => {
    if (yes) {
      const { granted } = await Notifications.requestPermissionsAsync();
      localStorage.setItem(REMIND_KEY, granted ? 'yes' : 'denied');
    } else {
      localStorage.setItem(REMIND_KEY, 'no');
    }
    onDone(session);
  };

  if (!fontsLoaded) return <View style={s.screen} />;

  const pad = { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 };

  // ---- the three breaths ----------------------------------------------------
  if (step === 'b1' || step === 'b2' || step === 'b3') {
    const k = step === 'b1' ? 0 : step === 'b2' ? 1 : 2;
    const line = [
      'Everyone on this water is sitting right now.',
      'Sit for as long as you like — or until the bell at :55, with everyone.',
      'Nobody sees you unless you choose to be seen.',
    ][k];
    return (
      <View style={[s.screen, pad]}>
        {k === 0 && <Fish />}
        {k === 1 && <Rings />}
        {k === 2 && <Stone />}
        {k < 2 && (
          <Pressable onPress={go('signin')} style={[s.cornerWord, { top: insets.top + 8 }]} hitSlop={8}>
            <Text style={s.word}>Skip</Text>
          </Pressable>
        )}
        <View style={s.foot}>
          <Text style={s.breath}>{line}</Text>
          <View style={s.dots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[s.dot, i === k && s.dotOn]} />
            ))}
          </View>
          <View style={s.row}>
            {k === 2 ? (
              <Pressable onPress={() => onDone(null)} hitSlop={8}>
                <Text style={s.word}>Just sit</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable onPress={go(k === 0 ? 'b2' : k === 1 ? 'b3' : 'signin')} hitSlop={8}>
              <Text style={[s.word, s.wordInk]}>{k === 2 ? 'Continue' : 'Next'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ---- shared pieces, as functions so a re-render never remounts a field ----
  const providers = () => (
    <>
      <Pressable
        disabled={busy}
        onPress={() => void run(signInWithApple)}
        style={({ pressed }) => [s.btn, s.btnFill, pressed && s.pressed]}
      >
        <Text style={s.btnFillText}>Continue with Apple</Text>
      </Pressable>
      <Pressable
        disabled={busy}
        onPress={() => void run(signInWithGoogle)}
        style={({ pressed }) => [s.btn, s.btnLine, pressed && s.pressed]}
      >
        <Text style={s.btnLineText}>Continue with Google</Text>
      </Pressable>
      <View style={s.or}>
        <View style={s.orLine} />
        <Text style={s.orText}>or</Text>
        <View style={s.orLine} />
      </View>
    </>
  );

  const back = (to: Step) => (
    <Pressable onPress={go(to)} style={s.back} hitSlop={8} accessibilityLabel="Back">
      <View style={s.chevron} />
    </Pressable>
  );

  const note = () => (
    <>
      {error && <Text style={s.error}>{error}</Text>}
      {busy && <ActivityIndicator color={INK3} style={{ marginTop: 16 }} />}
    </>
  );

  // Skip under the line's left end, Next under its right once something is
  // typed — the site's `LineActions`.
  const lineActions = (hasTyped: boolean, onSkip: () => void, onNext: () => void) => (
    <View style={[s.row, { marginTop: 4 }]}>
      <Pressable onPress={onSkip} hitSlop={8} disabled={busy}>
        <Text style={s.word}>Skip</Text>
      </Pressable>
      {hasTyped ? (
        <Pressable onPress={onNext} hitSlop={8} disabled={busy}>
          <Text style={[s.word, s.wordInk]}>Next</Text>
        </Pressable>
      ) : (
        <View />
      )}
    </View>
  );

  const label = composeLabel(accountName(session) ?? name, city) ?? 'you';

  // Every screen with a field scrolls: the keyboard (and the bar iOS puts
  // above it) insets the scroll view rather than squeezing the column, so
  // the footer row is the last thing in the content and never lands on a
  // field. The back chevron scrolls with the page, so nothing runs under it.
  return (
    <View style={[s.screen, { paddingTop: insets.top + 8 }]}>
      {step === 'remind' && <Rings />}
      <ScrollView
        ref={scroller}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 16 }}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        {step === 'signin' && back('b3')}
        {step === 'create' && back('signin')}
        {step === 'code' && back(name.trim() ? 'create' : 'signin')}
        {step === 'signin' && (
          <>
            <View style={s.body}>
              <Text style={s.h1}>Sign in.</Text>
              <Text style={s.p}>Your sittings go with you to your other devices, and you can be seen on the water if you like.</Text>
              {providers()}
              <TextInput
                ref={field}
                style={s.field}
                placeholder="Enter your email"
                placeholderTextColor={PROMPT}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="send"
                onFocus={reveal(56)}
                onSubmitEditing={sendCode(false)}
              />
              <View style={[s.row, { marginTop: 4 }]}>
                <View />
                <Pressable onPress={sendCode(false)} disabled={busy} hitSlop={8}>
                  <Text style={[s.word, s.wordInk]}>Send me a code</Text>
                </Pressable>
              </View>
              {note()}
            </View>
            <View style={s.row}>
              <Pressable onPress={() => onDone(null)} hitSlop={8}>
                <Text style={s.word}>Not now</Text>
              </Pressable>
              <Pressable onPress={go('create')} hitSlop={8}>
                <Text style={[s.word, s.wordInk]}>Don’t have an account? Create one</Text>
              </Pressable>
            </View>
          </>
        )}

        {step === 'create' && (
          <>
            <View style={s.body}>
              <Text style={s.h1}>Create account.</Text>
              <Text style={s.p}>Every sitting is already kept on this phone. An account carries it to your others.</Text>
              {providers()}
              <TextInput
                ref={field}
                style={s.field}
                placeholder="Enter your name"
                placeholderTextColor={PROMPT}
                value={name}
                onChangeText={setName}
                autoCorrect={false}
                autoCapitalize="words"
                textContentType="givenName"
                maxLength={NAME_MAX}
                returnKeyType="next"
                onFocus={reveal(56)}
              />
              <Text style={s.caption}>Your first name, if you’d like to be seen.</Text>
              <TextInput
                style={[s.field, { marginTop: 20 }]}
                placeholder="Enter your email"
                placeholderTextColor={PROMPT}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="send"
                onFocus={reveal(56)}
                onSubmitEditing={sendCode(true)}
              />
              <View style={[s.row, { marginTop: 4 }]}>
                <View />
                <Pressable onPress={sendCode(true)} disabled={busy} hitSlop={8}>
                  <Text style={[s.word, s.wordInk]}>Send me a code</Text>
                </Pressable>
              </View>
              {note()}
            </View>
            <View style={[s.row, { justifyContent: 'flex-end' }]}>
              <Pressable onPress={go('signin')} hitSlop={8}>
                <Text style={[s.word, s.wordInk]}>Already have one? Sign in</Text>
              </Pressable>
            </View>
          </>
        )}

        {step === 'code' && (
          <>
            <View style={s.body}>
              <Text style={s.h1}>Check your email.</Text>
              <Text style={s.p}>
                We have sent a six-digit code to <Text style={{ color: INK }}>{email.trim()}</Text>. The link in that email works too.
              </Text>
              <Text style={[s.caption, { marginTop: 36 }]}>The six-digit code</Text>
              <TextInput
                ref={field}
                style={[s.field, s.code]}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
                returnKeyType="done"
                onFocus={reveal(140)}
                onSubmitEditing={confirm}
              />
              <Pressable
                onPress={confirm}
                disabled={busy}
                style={({ pressed }) => [s.btn, s.btnFill, { marginTop: 28 }, pressed && s.pressed]}
              >
                <Text style={s.btnFillText}>{busy ? 'Confirming…' : 'Confirm and enter'}</Text>
              </Pressable>
              <Pressable onPress={sendCode(name.trim() !== '')} disabled={busy} style={{ alignSelf: 'center', marginTop: 8 }} hitSlop={8}>
                <Text style={s.word}>Send it again</Text>
              </Pressable>
              {error && <Text style={s.error}>{error}</Text>}
            </View>
            <Text style={s.caption}>If it is not there in a minute, look in the junk folder.</Text>
          </>
        )}

        {step === 'name' && (
          <View style={s.body}>
            <Text style={s.h1}>What should we call you?</Text>
            <Text style={s.p}>Your first name, if you’d like to be seen.</Text>
            <TextInput
              ref={field}
              style={[s.field, { marginTop: 36 }]}
              placeholder="Enter your name"
              placeholderTextColor={PROMPT}
              value={name}
              onChangeText={setName}
              autoCorrect={false}
              autoCapitalize="words"
              textContentType="givenName"
              maxLength={NAME_MAX}
              returnKeyType="next"
              onFocus={reveal(56)}
              onSubmitEditing={() => name.trim() && saveName()}
            />
            {lineActions(name.trim() !== '', go('place'), saveName)}
            {note()}
          </View>
        )}

        {step === 'place' && (
          <View style={s.body}>
            <Text style={s.h1}>Where are you sitting?</Text>
            <Text style={s.p}>Type a city or a country, then choose it. Or skip it.</Text>
            <View style={{ marginTop: 36, zIndex: 2 }}>
              <TextInput
                ref={field}
                style={s.field}
                placeholder="Enter your city"
                placeholderTextColor={PROMPT}
                value={city}
                onChangeText={(v) => {
                  setCity(v);
                  setListOpen(true);
                }}
                onFocus={() => setListOpen(true)}
                autoCorrect={false}
                autoCapitalize="words"
                textContentType="addressCity"
                maxLength={ORIGIN_MAX}
                returnKeyType="next"
                onSubmitEditing={() => {
                  const first = options[0];
                  if (listed && first) {
                    setCity(first.value);
                    setListOpen(false);
                  } else if (typed) {
                    savePlace(false)();
                  }
                }}
              />
              {listed && (
                <View style={s.list} accessibilityRole="list">
                  {looking && (
                    <View style={s.option}>
                      <Text style={[s.optionText, { color: INK3 }]}>Looking up places…</Text>
                    </View>
                  )}
                  {options.map((o) => (
                    <Pressable
                      key={o.key}
                      onPress={() => {
                        setCity(o.value);
                        setListOpen(false);
                      }}
                      style={({ pressed }) => [s.option, pressed && { backgroundColor: EMBER_SOFT }]}
                    >
                      <Text style={[s.optionText, { fontWeight: '600' }]}>{o.primary}</Text>
                      {o.secondary && <Text style={[s.optionText, { color: INK3 }]}>{o.secondary}</Text>}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
            {lineActions(Boolean(typed), savePlace(true), savePlace(false))}
            {typed ? (
              <>
                <View style={s.switchRow}>
                  <Switch value={share} onValueChange={setShare} trackColor={{ true: EMBER, false: RULE }} />
                  <Text style={s.switchText}>
                    Let others see <Text style={{ color: INK }}>{label}</Text> while you sit with them
                  </Text>
                </View>
                <Text style={[s.caption, { marginLeft: 66 }]}>
                  Saved on this device, and to your account. Shown to others only while this is on.
                </Text>
              </>
            ) : null}
            {note()}
          </View>
        )}

        {step === 'remind' && (
          <>
            <View style={s.body}>
              <Text style={s.h1}>Shall we tell you before the bell?</Text>
              <Text style={s.p}>
                Everyone who sits <Text style={{ fontStyle: 'italic' }}>until the bell</Text> finishes together at five to the hour. A quiet note a few minutes before, so you can join them.
              </Text>
            </View>
            <View style={{ gap: 12 }}>
              <Pressable onPress={remind(true)} style={({ pressed }) => [s.btn, s.btnFill, pressed && s.pressed]}>
                <Text style={s.btnFillText}>Remind me</Text>
              </Pressable>
              <Pressable onPress={remind(false)} style={({ pressed }) => [s.btn, s.btnLine, pressed && s.pressed]}>
                <Text style={s.btnLineText}>Only when I ask</Text>
              </Pressable>
              <Text style={[s.caption, { textAlign: 'center' }]}>The phone will ask once to allow it. Nothing else is ever sent.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ---- the water --------------------------------------------------------------
// Small grey fish, as on the pond: each is someone sitting right now.
const FISH = [
  [62, 140, -20], [84, 168, 10], [110, 150, -35], [96, 196, 25], [130, 182, 0],
  [250, 120, 160], [276, 140, 185], [262, 166, 150], [298, 158, 200],
  [180, 300, -80], [330, 290, 120], [48, 330, 30], [200, 250, 15], [150, 352, -10],
] as const;

function Fish() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {FISH.map(([x, y, a], i) => (
        <View
          key={i}
          style={{
            position: 'absolute', left: x, top: y + 60, width: 15, height: 6, borderRadius: 3,
            backgroundColor: '#7a868d', opacity: 0.55 + 0.3 * ((i * 7) % 5) / 4,
            transform: [{ rotate: `${a}deg` }],
          }}
        />
      ))}
    </View>
  );
}

function Rings() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {[170, 120, 70, 30].map((r, i) => (
        <View
          key={r}
          style={{
            position: 'absolute', left: 195 - r, top: 330 - r, width: 2 * r, height: 2 * r, borderRadius: r,
            borderWidth: 1, borderColor: 'rgba(62,76,86,.6)', opacity: 0.14 + i * 0.08,
          }}
        />
      ))}
    </View>
  );
}

function Stone() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={{ position: 'absolute', left: 169, top: 304, width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: 'rgba(62,76,86,.6)', opacity: 0.5 }} />
      <View style={{ position: 'absolute', left: 189, top: 325, width: 12, height: 10, borderRadius: 6, backgroundColor: EMBER }} />
      <Text style={{ position: 'absolute', left: 212, top: 312, fontSize: 11, color: '#838d94' }}>you</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAPER, paddingHorizontal: 24 },
  body: { flex: 1, paddingTop: 72 },
  foot: { flex: 1, justifyContent: 'flex-end', gap: 24 },
  breath: { fontFamily: SERIF, fontSize: 31, lineHeight: 40, color: INK },
  h1: { fontFamily: SERIF, fontSize: 31, lineHeight: 39, color: INK },
  p: { marginTop: 14, fontSize: 15, lineHeight: 22, color: INK2 },
  caption: { marginTop: 10, fontSize: 13, lineHeight: 19, color: INK3 },
  error: { marginTop: 14, fontSize: 14, lineHeight: 20, color: '#8a4a3e' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: RULE },
  dotOn: { width: 18, backgroundColor: INK },
  word: { fontSize: 16, color: INK3, paddingVertical: 12, paddingHorizontal: 2 },
  wordInk: { color: INK },
  cornerWord: { position: 'absolute', right: 16 },
  back: { position: 'absolute', left: -8, top: -2, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chevron: { width: 12, height: 12, borderLeftWidth: 1.6, borderBottomWidth: 1.6, borderColor: INK3, transform: [{ rotate: '45deg' }], marginLeft: 6 },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  btnFill: { backgroundColor: INK },
  btnFillText: { color: '#fff', fontSize: 17 },
  btnLine: { backgroundColor: 'rgba(238,241,243,.82)', borderWidth: 1, borderColor: '#c3cbd1' },
  btnLineText: { color: INK, fontSize: 17 },
  pressed: { opacity: 0.7 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: RULE },
  orText: { fontSize: 13, color: '#838d94' },
  field: { borderBottomWidth: 1, borderBottomColor: '#838d94', paddingVertical: 10, fontSize: 20, color: INK },
  code: { textAlign: 'center', fontSize: 30, letterSpacing: 12, fontVariant: ['tabular-nums'] },
  list: { marginTop: 8, borderWidth: 1, borderColor: RULE, borderRadius: 14, backgroundColor: '#eef1f3', paddingVertical: 4, overflow: 'hidden' },
  option: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8 },
  optionText: { fontSize: 16, color: INK },
  switchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginTop: 24 },
  switchText: { flex: 1, fontSize: 15, lineHeight: 22, color: INK2, paddingTop: 4 },
});
