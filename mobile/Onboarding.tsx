// The first launch: three breaths, then the sign-in as full screens.
//
// Drawn from the canvas page *Onboarding · the app* (4 October 2026): three
// sentences on the water — who is here, the bell, that nobody sees you —
// then Sign in / Check your email / Create account, and after a first
// sign-in, where you sit and whether to be told before the bell. *Just sit*
// skips the account. One component, one `step`: every screen shares the
// email, the name and the busy state, and nothing is navigated to twice.
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAME_MAX, ORIGIN_MAX, cleanText } from '../lib/label';
import { normalizeEmail } from '../lib/emailCode';
import { saveOrigin, signInWithApple, signInWithEmail, signInWithGoogle, verifyCode } from './auth';
import { supabase } from './supabase';

type Step = 'b1' | 'b2' | 'b3' | 'signin' | 'code' | 'create' | 'place' | 'remind';

const PAPER = '#e5e9ec';
const INK = '#2a3136';
const INK2 = '#4f5a61';
const INK3 = '#5a656c';
const RULE = '#cdd4d9';
const EMBER = '#3e4c55';
const SERIF = 'Newsreader_400Regular';

export const REMIND_KEY = 'mwm.app.remind';

export default function Onboarding({ onDone }: { onDone: (session: Session | null) => void }) {
  const [fontsLoaded] = useFonts({ Newsreader_400Regular });
  const [step, setStep] = useState<Step>('b1');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('');
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const insets = useSafeAreaInsets();
  const field = useRef<TextInput>(null);

  // Signing in, by any of the three ways, moves on to the place screen.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!s) return;
      setSession(s);
      setBusy(false);
      setError(null);
      setStep((current) => (current === 'place' || current === 'remind' ? current : 'place'));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setError(null);
    const t = setTimeout(() => field.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [step]);

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
          <Pressable onPress={go('signin')} style={s.cornerWord} hitSlop={8}>
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

  // ---- the sign-in ----------------------------------------------------------
  const Providers = ({ hint }: { hint?: string }) => (
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
        <Text style={s.orText}>{hint ?? 'or'}</Text>
        <View style={s.orLine} />
      </View>
    </>
  );

  const Back = ({ to }: { to: Step }) => (
    <Pressable onPress={go(to)} style={[s.back, { top: insets.top + 6 }]} hitSlop={8} accessibilityLabel="Back">
      <View style={s.chevron} />
    </Pressable>
  );

  const Error = () => (error ? <Text style={s.error}>{error}</Text> : null);

  const Busy = () => (busy ? <ActivityIndicator color={INK3} style={{ marginTop: 16 }} /> : null);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.screen, pad]}>
      {step === 'signin' && (
        <>
          <Back to="b3" />
          <View style={s.body}>
            <Text style={s.h1}>Sign in.</Text>
            <Text style={s.p}>Your sittings go with you to your other devices, and you can be seen on the water if you like.</Text>
            <Providers />
            <TextInput
              ref={field}
              style={s.field}
              placeholder="Enter your email"
              placeholderTextColor="#8a7f72"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={sendCode(false)}
            />
            <View style={[s.row, { marginTop: 8 }]}>
              <View />
              <Pressable onPress={sendCode(false)} disabled={busy} hitSlop={8}>
                <Text style={[s.word, s.wordInk]}>Send me a code</Text>
              </Pressable>
            </View>
            <Error />
            <Busy />
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
          <Back to="signin" />
          <View style={s.body}>
            <Text style={s.h1}>Create account.</Text>
            <Text style={s.p}>Every sitting is already kept on this phone. An account carries it to your others.</Text>
            <Providers />
            <TextInput
              ref={field}
              style={s.field}
              placeholder="Enter your name"
              placeholderTextColor="#8a7f72"
              value={name}
              onChangeText={setName}
              autoCorrect={false}
              textContentType="givenName"
              maxLength={NAME_MAX}
              returnKeyType="next"
            />
            <Text style={s.caption}>Your first name, if you’d like to be seen.</Text>
            <TextInput
              style={[s.field, { marginTop: 20 }]}
              placeholder="Enter your email"
              placeholderTextColor="#8a7f72"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={sendCode(true)}
            />
            <View style={[s.row, { marginTop: 8 }]}>
              <View />
              <Pressable onPress={sendCode(true)} disabled={busy} hitSlop={8}>
                <Text style={[s.word, s.wordInk]}>Send me a code</Text>
              </Pressable>
            </View>
            <Error />
            <Busy />
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
          <Back to="signin" />
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
            <Error />
          </View>
          <Text style={s.caption}>If it is not there in a minute, look in the junk folder.</Text>
        </>
      )}

      {step === 'place' && (
        <>
          <View style={s.body}>
            <Text style={s.h1}>Where are you sitting?</Text>
            <TextInput
              ref={field}
              style={[s.field, { marginTop: 36 }]}
              placeholder="Enter your city"
              placeholderTextColor="#8a7f72"
              value={city}
              onChangeText={setCity}
              autoCorrect={false}
              textContentType="addressCity"
              maxLength={ORIGIN_MAX}
              returnKeyType="done"
            />
            <View style={s.switchRow}>
              <Switch value={share} onValueChange={setShare} trackColor={{ true: EMBER, false: RULE }} />
              <Text style={s.switchText}>
                Let others see{' '}
                <Text style={{ color: INK }}>
                  {(cleanText(name, NAME_MAX) ?? displayName(session) ?? 'you') + (cleanText(city, ORIGIN_MAX) ? ` from ${cleanText(city, ORIGIN_MAX)}` : '')}
                </Text>{' '}
                while you sit with them
              </Text>
            </View>
            <Text style={[s.caption, { marginLeft: 66 }]}>
              Saved to your account. Shown beside your fish only while this is on. You can change it any time in Settings.
            </Text>
            <Error />
            <Busy />
          </View>
          <View style={s.row}>
            <Pressable onPress={savePlace(true)} hitSlop={8}>
              <Text style={s.word}>Skip</Text>
            </Pressable>
            <Pressable onPress={savePlace(false)} disabled={busy} hitSlop={8}>
              <Text style={[s.word, s.wordInk]}>Next</Text>
            </Pressable>
          </View>
        </>
      )}

      {step === 'remind' && (
        <>
          <Rings />
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
    </KeyboardAvoidingView>
  );
}

function displayName(session: Session | null): string | undefined {
  const n = session?.user.user_metadata?.name;
  return typeof n === 'string' && n.trim() ? n.trim() : undefined;
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
  cornerWord: { position: 'absolute', right: 16, top: 56 },
  back: { position: 'absolute', left: 16, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
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
  switchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginTop: 40 },
  switchText: { flex: 1, fontSize: 15, lineHeight: 22, color: INK2, paddingTop: 4 },
});
