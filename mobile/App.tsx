import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { localTime } from '../lib/format.ts';
import { mmss, nextSharedBellAt, remainingMs } from '../lib/timer.ts';

/**
 * The first screen of the iPhone app, and the spike `context/PRODUCT.md`
 * names as the first thing to do: does a bell ring on time on a locked
 * phone, forty-five minutes later?
 *
 * Begin starts the rain bed and strikes the drum, then the bell rings at
 * the end. On a locked phone iOS keeps an app running only while it is
 * playing sound, which is what the bed is for; whether that keeps the timer
 * honest is the question. Each sitting writes how late the bell was, so a
 * run with the phone locked in a pocket answers it.
 *
 * The times come from the web app's own `lib/` — the same shared bell at
 * :55 the site rings — read in place through Metro (`metro.config.js`).
 */

const C = { paper: '#e5e9ec', surface: '#eef1f3', ink: '#2a3136', ink2: '#4f5a61', ink3: '#5a656c', rule: '#cdd4d9', ember: '#3e4c55' };

type Choice = { label: string; end: () => number };
type Result = { planned: number; lateMs: number; minutes: number };

export default function App() {
  const bed = useAudioPlayer(require('./assets/sounds/rain.mp3'));
  const bell = useAudioPlayer(require('./assets/sounds/drum.mp3'));
  const [now, setNow] = useState(Date.now());
  const [end, setEnd] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const started = useRef(0);
  const rung = useRef(false);
  // The end as the timers see it, so a tick never reads a stale render's.
  const endRef = useRef<number | null>(null);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
  }, []);

  // A second's tick for the clock on screen, and a second chance for the
  // bell if the timeout below was held back while the phone slept.
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      if (endRef.current !== null && Date.now() >= endRef.current) ring();
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const strike = () => {
    void bell.seekTo(0);
    bell.play();
  };

  function ring() {
    const due = endRef.current;
    if (due === null || rung.current) return;
    rung.current = true;
    strike();
    const at = Date.now();
    setResults((r) => [{ planned: due, lateMs: at - due, minutes: Math.round((due - started.current) / 60_000) }, ...r]);
    endRef.current = null;
    setEnd(null);
    // Let the bell carry over the rain, then stop the rain.
    setTimeout(() => bed.pause(), 12_000);
  }

  useEffect(() => {
    if (end === null) return;
    const id = setTimeout(ring, Math.max(0, end - Date.now()));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end]);

  const begin = (choice: Choice) => {
    rung.current = false;
    started.current = Date.now();
    bed.loop = true;
    bed.volume = 0.5;
    void bed.seekTo(0);
    bed.play();
    strike();
    const due = choice.end();
    endRef.current = due;
    setEnd(due);
  };

  const stop = () => {
    rung.current = true;
    endRef.current = null;
    setEnd(null);
    bed.pause();
  };

  const shared = nextSharedBellAt(now);
  const choices: Choice[] = [
    { label: '1 minute', end: () => Date.now() + 60_000 },
    { label: '10 minutes', end: () => Date.now() + 10 * 60_000 },
    { label: '45 minutes', end: () => Date.now() + 45 * 60_000 },
    { label: `Until the bell at ${localTime(shared)}`, end: () => nextSharedBellAt(Date.now()) },
  ];

  return (
    <View style={s.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.brand}>meditate with me</Text>
        {end === null ? (
          <>
            <Text style={s.title}>Sit, then lock your phone.</Text>
            <Text style={s.lead}>
              The bell should ring on time with the screen off. Each sitting below says how close it came.
            </Text>
            {choices.map((c) => (
              <Pressable key={c.label} onPress={() => begin(c)} style={({ pressed }) => [s.choice, pressed && s.pressed]}>
                <Text style={s.choiceText}>{c.label}</Text>
              </Pressable>
            ))}
          </>
        ) : (
          <>
            <Text style={s.time}>{mmss(remainingMs(end, now))}</Text>
            <Text style={s.lead}>The bell rings at {localTime(end)}.</Text>
            <Pressable onPress={stop} style={({ pressed }) => [s.quiet, pressed && s.pressed]}>
              <Text style={s.quietText}>End</Text>
            </Pressable>
          </>
        )}

        {results.length > 0 && (
          <View style={s.results}>
            <Text style={s.caption}>Bells so far</Text>
            {results.map((r) => (
              <Text key={r.planned} style={s.result}>
                {r.minutes} min, due {localTime(r.planned)}: {Math.abs(r.lateMs) < 1000 ? 'on time' : `${(r.lateMs / 1000).toFixed(1)} s late`}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  body: { paddingHorizontal: 24, paddingTop: 72, paddingBottom: 48, gap: 16 },
  brand: { color: C.ink2, fontSize: 16 },
  title: { color: C.ink, fontSize: 30, fontWeight: '700', marginTop: 24 },
  lead: { color: C.ink2, fontSize: 17, lineHeight: 25 },
  choice: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.rule },
  choiceText: { color: C.ink, fontSize: 18 },
  pressed: { opacity: 0.6 },
  time: { color: C.ink, fontSize: 64, fontVariant: ['tabular-nums'], marginTop: 48 },
  quiet: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: C.rule },
  quietText: { color: C.ink2, fontSize: 16, fontWeight: '600' },
  results: { marginTop: 32, gap: 6, borderTopWidth: 1, borderTopColor: C.rule, paddingTop: 16 },
  caption: { color: C.ink3, fontSize: 14 },
  result: { color: C.ink, fontSize: 16, fontVariant: ['tabular-nums'] },
});
