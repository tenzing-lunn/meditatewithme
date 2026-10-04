// The first launch, on the water: three sentences over the pond, then the
// sign-in as full screens, then the site's own name-and-place questions —
// drawn the way the site draws them (DESIGN.md, Pale water). The pond
// (`Pond.tsx`) is under every screen with everyone sitting right now swimming
// on it, as on the site's arrival; the screens switch on the rail's own
// move; a typed answer is a line whose prompt writes itself out; the one
// filled control on a screen is ember. One component, one `step`.
//
// *Just sit* skips the account. After a first sign-in: *What should we call
// you?* when the account has no name yet; *Where are you sitting?* as
// `OriginScreen` has it, the line alone in the middle, the town list under
// it, the share switch under that; then, the app's own, whether to be told
// before the bell.
import { Newsreader_700Bold } from '@expo-google-fonts/newsreader/700Bold';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  type TargetedEvent,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAME_MAX, ORIGIN_MAX, cleanText, composeLabel } from '../lib/label';
import { normalizeEmail } from '../lib/emailCode';
import { searchPlaces, type PlaceIndex } from '../lib/places';
import { saveOrigin, signInWithApple, signInWithEmail, signInWithGoogle, verifyCode } from './auth';
import { loadPlaces, loadSuggestion } from './places';
import Pond from './Pond';
import { supabase } from './supabase';
import { AppleMark, Back, Brand, Button, EMBER, EMBER_SOFT, GoogleMark, INK, INK3, LineActions, LineField, PAPER, RULE, Rail, Steps, SURFACE, Word, type } from './ui';
import { useStones } from './world';

type Step = 'b1' | 'b2' | 'b3' | 'signin' | 'code' | 'create' | 'name' | 'place' | 'remind';
const ORDER: Step[] = ['b1', 'b2', 'b3', 'signin', 'create', 'code', 'name', 'place', 'remind'];

export const REMIND_KEY = 'mwm.app.remind';

interface Option {
  key: string;
  value: string;
  primary: string;
  secondary: string | null;
}

function accountName(session: Session | null): string | null {
  const n = session?.user.user_metadata?.name;
  return typeof n === 'string' && n.trim() ? n.trim() : null;
}

const BREATHS = [
  'Everyone on this water is sitting right now.',
  'Sit for as long as you like, or until the bell at five to, with everyone.',
  'Nobody sees you unless you choose to be seen.',
];

export default function Onboarding({ onDone }: { onDone: (session: Session | null) => void }) {
  const [fontsLoaded] = useFonts({ Newsreader_700Bold });
  const [step, setStep] = useState<Step>('b1');
  const [dir, setDir] = useState<1 | -1>(1);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  // One ref per screen: the leaving screen is still mounted while the next
  // arrives, and a shared ref would be let go when it went.
  const signinField = useRef<TextInput>(null);
  const createField = useRef<TextInput>(null);
  const codeField = useRef<TextInput>(null);
  const nameField = useRef<TextInput>(null);
  const placeField = useRef<TextInput>(null);
  const fields: Partial<Record<Step, React.RefObject<TextInput | null>>> = {
    signin: signinField, create: createField, code: codeField, name: nameField, place: placeField,
  };

  const [city, setCity] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [share, setShare] = useState(false);
  const [index, setIndex] = useState<PlaceIndex | null>(null);
  const [indexFailed, setIndexFailed] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const stones = useStones(true);

  const go = (to: Step) => () => {
    setDir(ORDER.indexOf(to) >= ORDER.indexOf(step) ? 1 : -1);
    setStep(to);
  };

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!s) return;
      setSession(s);
      setBusy(false);
      setError(null);
      setDir(1);
      setStep((current) =>
        current === 'name' || current === 'place' || current === 'remind' ? current : accountName(s) ? 'place' : 'name',
      );
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // The field has focus once the screen has risen into place.
  useEffect(() => {
    setError(null);
    const ref = fields[step];
    const t = setTimeout(() => ref?.current?.focus(), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

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
      go('code'),
    );
  };

  const confirm = () => {
    if (code.length !== 6) {
      setError('The code is six digits.');
      return;
    }
    void run(() => verifyCode(email, code));
  };

  const saveName = () => {
    const n = cleanText(name, NAME_MAX);
    if (!n) return go('place')();
    void run(
      async () => {
        const { error: e } = await supabase.auth.updateUser({ data: { name: n } });
        return e ? 'The name could not be saved just now. Please try again.' : null;
      },
      go('place'),
    );
  };

  const typedCity = city.trim();
  const options = useMemo<Option[]>(() => {
    if (!typedCity) {
      return suggestion ? [{ key: 'near', value: suggestion, primary: suggestion, secondary: 'near you' }] : [];
    }
    const found = index ? searchPlaces(index, typedCity, 5) : [];
    const list: Option[] = found.map((p) => ({
      key: `place:${p.label}`,
      value: p.label,
      primary: p.city ?? p.country,
      secondary: p.city ? p.country : null,
    }));
    const lower = typedCity.toLowerCase();
    if (!found.some((p) => p.label.toLowerCase() === lower)) {
      list.push({ key: 'typed', value: typedCity, primary: `Keep “${typedCity}”`, secondary: 'as you typed it' });
    }
    return list;
  }, [index, typedCity, suggestion]);
  const looking = Boolean(typedCity) && index === null && !indexFailed;
  const listed = listOpen && (options.length > 0 || looking);
  const rows = listed ? options.length + (looking ? 1 : 0) : 0;

  const savePlace = (skip: boolean) => () => {
    if (!session) return go('remind')();
    const origin = skip ? null : cleanText(city, ORIGIN_MAX);
    void run(() => saveOrigin(session.user.id, origin, !skip && share), go('remind'));
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

  // A line that takes focus is scrolled clear of the keyboard, with room
  // under it for what follows it.
  const reveal = (room: number) => (e: NativeSyntheticEvent<TargetedEvent>) => {
    scroller.current?.scrollResponderScrollNativeHandleToKeyboard(e.currentTarget, insets.top + 16 + room, true);
  };
  useEffect(() => {
    if (rows && placeField.current) {
      scroller.current?.scrollResponderScrollNativeHandleToKeyboard(placeField.current, insets.top + 16 + rows * 44 + 28, true);
    }
  }, [rows, insets.top]);

  if (!fontsLoaded) return <View style={s.screen} />;

  const top = insets.top + 16;
  const bottom = insets.bottom + 32;
  const label = composeLabel(accountName(session) ?? name, city) ?? 'you';

  const note = (
    <>
      {error && <Text style={type.error}>{error}</Text>}
      {busy && <ActivityIndicator color={INK3} style={{ marginTop: 16, alignSelf: 'flex-start' }} />}
    </>
  );

  const providers = (
    <>
      <Button kind="apple" label="Continue with Apple" icon={<AppleMark />} onPress={() => void run(signInWithApple)} disabled={busy} style={{ marginTop: 32 }} />
      <Button kind="quiet" label="Continue with Google" icon={<GoogleMark />} onPress={() => void run(signInWithGoogle)} disabled={busy} style={{ marginTop: 12 }} />
      <View style={s.or}>
        <View style={s.hair} />
        <Text style={type.caption}>or</Text>
        <View style={s.hair} />
      </View>
    </>
  );

  /** A question's frame: Back in the corner, a column that scrolls only when the keyboard asks it to, the foot last. */
  const frame = (back: Step | null, body: ReactNode, foot?: ReactNode) => (
    <ScrollView
      ref={scroller}
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, paddingTop: top + 60, paddingBottom: bottom, paddingHorizontal: 24 }}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="none"
      showsVerticalScrollIndicator={false}
    >
      {/* In the content, so the page never scrolls under it. */}
      {back && <Back onPress={go(back)} style={{ position: 'absolute', left: 16, top: top - 4 }} />}
      <View style={{ flex: 1 }}>{body}</View>
      {foot}
    </ScrollView>
  );

  const render = (screen: Step): ReactNode => {
    const active = screen === step;

    if (screen === 'b1' || screen === 'b2' || screen === 'b3') {
      const k = screen === 'b1' ? 0 : screen === 'b2' ? 1 : 2;
      return (
        <View style={{ flex: 1, paddingTop: top, paddingBottom: bottom, paddingHorizontal: 24 }} pointerEvents="box-none">
          <View style={s.row}>
            <Brand />
            {k < 2 ? <Word label="Skip" onPress={go('signin')} style={{ marginRight: -8 }} /> : <View />}
          </View>
          <View style={{ marginTop: 'auto' }} pointerEvents="box-none">
            <View pointerEvents="none">
              <Text style={type.sentence}>{BREATHS[k]}</Text>
              <View style={{ marginTop: 24 }}>
                <Steps step={k + 1} steps={3} />
              </View>
            </View>
            <View style={[s.row, { marginTop: 28 }]}>
              {k === 2 ? <Word label="Just sit" onPress={() => onDone(null)} style={{ marginLeft: -8 }} /> : <View />}
              <Button small label={k === 2 ? 'Continue' : 'Next'} onPress={go(k === 0 ? 'b2' : k === 1 ? 'b3' : 'signin')} />
            </View>
          </View>
        </View>
      );
    }

    if (screen === 'signin') {
      return frame(
        'b3',
        <>
          <Text style={type.question}>Sign in.</Text>
          <Text style={[type.body, { marginTop: 12 }]}>Your sittings go with you to your other devices, and you can be seen on the water if you like.</Text>
          {providers}
          <LineField
            inputRef={signinField}
            prompt="Enter your email"
            value={email}
            onChangeText={setEmail}
            active={active}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="send"
            onFocus={reveal(56)}
            onSubmitEditing={sendCode(false)}
          />
          <LineActions typed={normalizeEmail(email) !== null} active={active} prompt="Enter your email" onNext={sendCode(false)} nextLabel="Send me a code" disabled={busy} />
          {note}
        </>,
        <View style={[s.row, { marginTop: 24 }]}>
          <Word label="Not now" onPress={() => onDone(null)} style={{ marginLeft: -8 }} />
          <Word label="Don’t have an account? Create one" onPress={go('create')} style={{ marginRight: -8 }} />
        </View>,
      );
    }

    if (screen === 'create') {
      return frame(
        'signin',
        <>
          <Text style={type.question}>Create account.</Text>
          <Text style={[type.body, { marginTop: 12 }]}>Every sitting is already kept on this phone. An account carries it to your others.</Text>
          {providers}
          <LineField
            inputRef={createField}
            prompt="Enter your name"
            value={name}
            onChangeText={setName}
            active={active}
            autoCorrect={false}
            autoCapitalize="words"
            textContentType="givenName"
            maxLength={NAME_MAX}
            returnKeyType="next"
            onFocus={reveal(56)}
          />
          <Text style={[type.caption, { marginTop: 10 }]}>Your first name, if you’d like to be seen.</Text>
          <LineField
            prompt="Enter your email"
            value={email}
            onChangeText={setEmail}
            active={active}
            style={{ marginTop: 20 }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="send"
            onFocus={reveal(56)}
            onSubmitEditing={sendCode(true)}
          />
          <LineActions typed={normalizeEmail(email) !== null} active={active} prompt="Enter your email" onNext={sendCode(true)} nextLabel="Send me a code" disabled={busy} />
          {note}
        </>,
        <View style={[s.row, { marginTop: 24, justifyContent: 'flex-end' }]}>
          <Word label="Already have one? Sign in" onPress={go('signin')} style={{ marginRight: -8 }} />
        </View>,
      );
    }

    if (screen === 'code') {
      return frame(
        name.trim() ? 'create' : 'signin',
        <>
          <Text style={type.question}>Check your email.</Text>
          <Text style={[type.body, { marginTop: 12 }]}>
            We have sent a six-digit code to <Text style={{ color: INK }}>{email.trim()}</Text>. The link in that email works too.
          </Text>
          <Text style={[type.caption, { marginTop: 36 }]}>The six-digit code</Text>
          <LineField
            inputRef={codeField}
            center
            prompt=""
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            active={active}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={6}
            returnKeyType="done"
            onFocus={reveal(140)}
            onSubmitEditing={confirm}
          />
          <Button label={busy ? 'Confirming…' : 'Confirm and enter'} onPress={confirm} disabled={busy} style={{ marginTop: 28 }} />
          <Word label="Send it again" onPress={sendCode(name.trim() !== '')} disabled={busy} style={{ alignSelf: 'center', marginTop: 8 }} />
          {error && <Text style={type.error}>{error}</Text>}
        </>,
        <Text style={[type.caption, { marginTop: 24 }]}>If it is not there in a minute, look in the junk folder.</Text>,
      );
    }

    if (screen === 'name') {
      return frame(
        null,
        <>
          <Text style={type.question}>What should we call you?</Text>
          <Text style={[type.body, { marginTop: 12 }]}>Your first name, if you’d like to be seen.</Text>
          <LineField
            inputRef={nameField}
            prompt="Enter your name"
            value={name}
            onChangeText={setName}
            active={active}
            style={{ marginTop: 36 }}
            autoCorrect={false}
            autoCapitalize="words"
            textContentType="givenName"
            maxLength={NAME_MAX}
            returnKeyType="next"
            onFocus={reveal(56)}
            onSubmitEditing={() => name.trim() && saveName()}
          />
          <LineActions typed={name.trim() !== ''} active={active} prompt="Enter your name" onSkip={go('place')} onNext={saveName} disabled={busy} />
          {note}
        </>,
      );
    }

    if (screen === 'place') {
      // Bare, as the site has it: the line is all there is, and it sits in
      // the upper middle so the list has room to hang under it.
      return frame(
        null,
        <View style={{ marginTop: '22%' }}>
          <Text style={s.srOnly} accessibilityRole="header">Where are you sitting?</Text>
          <View style={{ zIndex: 2 }}>
            <LineField
              inputRef={placeField}
              prompt="Enter your city"
              value={city}
              onChangeText={(v) => {
                setCity(v);
                setListOpen(true);
              }}
              active={active}
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
                } else if (typedCity) {
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
          <LineActions typed={Boolean(typedCity)} active={active} prompt="Enter your city" onSkip={savePlace(true)} onNext={savePlace(false)} disabled={busy}>
            {typedCity ? (
              <>
                <View style={s.switchRow}>
                  <Switch value={share} onValueChange={setShare} trackColor={{ true: EMBER, false: RULE }} ios_backgroundColor={RULE} />
                  <Text style={[type.control, { flex: 1, lineHeight: 22, color: share ? EMBER : INK3 }]}>
                    Let others see <Text style={{ color: INK }}>{label}</Text> while you sit with them
                  </Text>
                </View>
                <Text style={[type.caption, { marginTop: 6, marginLeft: 65 }]}>Saved on this device, and to your account. Shown to others only while this is on.</Text>
              </>
            ) : null}
          </LineActions>
          {note}
        </View>,
      );
    }

    // remind
    return (
      <View style={{ flex: 1, paddingTop: top, paddingBottom: bottom, paddingHorizontal: 24 }}>
        <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 32 }}>
          <Text style={type.question}>Shall we tell you before the bell?</Text>
          <Text style={[type.body, { marginTop: 12 }]}>
            Everyone who sits <Text style={{ fontStyle: 'italic' }}>until the bell</Text> finishes together at five to the hour. A quiet note a few minutes before, so you can join them.
          </Text>
        </View>
        <Button label="Remind me" onPress={remind(true)} />
        <Button kind="quiet" label="Only when I ask" onPress={remind(false)} style={{ marginTop: 12 }} />
        <Text style={[type.caption, { marginTop: 16, textAlign: 'center' }]}>The phone will ask once to allow it. Nothing else is ever sent.</Text>
      </View>
    );
  };

  const onWater = step === 'b1' || step === 'b2' || step === 'b3';
  return (
    <View style={s.screen}>
      <Pond stones={stones} you={step === 'b3' || step === 'remind'} onTouch={onWater ? () => undefined : undefined} />
      <Rail at={step} dir={dir} render={render} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAPER },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 4 },
  hair: { flex: 1, height: 1, backgroundColor: RULE },
  list: { marginTop: 8, borderWidth: 1, borderColor: RULE, borderRadius: 16, backgroundColor: SURFACE, paddingVertical: 4, overflow: 'hidden', shadowColor: '#3b2a1d', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  option: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8 },
  optionText: { fontSize: 16, color: INK },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
