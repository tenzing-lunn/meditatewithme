// The sitting's sound, on the phone: the site's Web Audio engine
// (`components/audio.ts`, `components/mix.ts`, `components/useMix.ts`) on
// react-native-audio-api, which is Web Audio as a native library. The same
// graph — one context, a gain per bed under a master, the bells struck from
// the tables in `lib/bells.ts` — and the same rule that matters most: the
// closing bell is scheduled on the audio clock at Begin, not by a timer.
//
// What the phone changes is the one thing the site could not fix. iOS
// suspends a web page's audio when the screen locks, so a locked phone heard
// its bell late. Here the context belongs to the app, which iOS keeps running
// while it plays (the `audio` background mode, from the library's config
// plugin), so the bell rings on time in a pocket — in silence too, since the
// context is running whether or not a bed is up.
//
// Outside a sitting the app gives the audio back when it goes to the
// background: whatever was tasting is hushed, the context suspended and the
// session let go, so a phone left on the arrival runs no audio engine all
// night and the podcast it interrupted is told it may carry on. A suspended
// context freezes its clock — a fade cut off by the lock would finish the
// next time the app opened — so a sitting's hold is let go only once its
// fades and tails are over (`holdForSitting`).
//
// Three things differ from the site because the library differs from a
// browser, none of them audible:
// - A ramp is anchored where the level really is now, worked out from a
//   record of what was scheduled on it (`levelAt`), not read back from
//   `.value`: a level just set is still on its way to the audio thread, and
//   reading it back gives the old one. Nor can the library's
//   `cancelAndHoldAtTime` stand in for the site's `setValueAtTime(value,
//   now)`: on a level that has stopped moving, the next ramp there starts
//   from its last change, minutes ago, and a fourteen-second fade is a cut.
// - A bed that goes to nothing is stopped once its fade is done, and decoded
//   again when it is next raised. The library copies the decoded buffer
//   into each source, and a looped bed is about 42 MB of samples; keeping
//   all nine looping at zero, as the site does, would hold the better part
//   of a gigabyte, and iOS ends an app that does that — in the background,
//   in the middle of a sitting, before its bell.
// - Errors decoding a sound are said in development, rather than silent.
//
// The beds and the drum are the site's own files (`public/sounds/`, read
// through Metro), bundled with the app rather than fetched, so a sitting
// begun on a train has its sound.
//
// `EXPO_PUBLIC_MUTE=1` holds the output at zero: the whole graph runs and
// every bell is scheduled, and nothing comes out of the speakers. For
// checking the sitting on a Mac's simulator without playing it at whoever
// is in the room.
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { AudioContext, AudioManager, type AudioBuffer, type AudioBufferSourceNode, type AudioParam, type GainNode } from 'react-native-audio-api';
import { BELLS, OPENING_DECAY, PEAK, type Strike } from '../lib/bells';
import { BED_SOURCES, PAD_SECONDS } from '../lib/beds';
import { fillNoise } from '../lib/noise';
import { DEFAULT_BELL, DEFAULT_MASTER, MASTER_KEY, TRACK_SLUGS, type BellKind, type TrackSlug } from '../lib/types';

const BEDS: Record<TrackSlug, number> = {
  rain: require('../public/sounds/rain.mp3'),
  wind: require('../public/sounds/wind.mp3'),
  waterfall: require('../public/sounds/waterfall.mp3'),
  ocean: require('../public/sounds/ocean.mp3'),
  fire: require('../public/sounds/fire.mp3'),
  hum: require('../public/sounds/hum.mp3'),
  chimes: require('../public/sounds/chimes.mp3'),
  bowl: require('../public/sounds/bowl.mp3'),
  night: require('../public/sounds/night.mp3'),
};

/** The recorded bells, by the site path `lib/bells.ts` names them with. */
const RECORDINGS: Record<string, number> = {
  '/sounds/drum.mp3': require('../public/sounds/drum.mp3'),
};

const MUTED = process.env.EXPO_PUBLIC_MUTE === '1';

let ctx: AudioContext | null = null;
/** Everything goes out through this: the master of the masters, at zero when muted. */
let out: GainNode | null = null;
/** A sitting is on: the context keeps running with the phone locked. */
let holding = false;
let release: ReturnType<typeof setTimeout> | undefined;
/** What hushes the mix when the app rests its audio (`useMix` registers it). */
const onRest = new Set<() => void>();

const quiet = (p: Promise<void>) => p.catch(() => {});

function said(what: string) {
  return (e: unknown) => {
    if (__DEV__) console.warn(`audio: ${what}`, e);
  };
}

/**
 * The context, made on first use and never torn down; a later call resumes
 * one that was suspended. No gesture is needed on a phone, but everything
 * still reaches here from one, as on the site.
 */
export function unlock(): AudioContext | null {
  try {
    if (!ctx) {
      // Playback: it sounds with the ring switch on silent, and in the
      // background; and when it is let go, whatever it interrupted may resume.
      AudioManager.setAudioSessionOptions({ iosCategory: 'playback', iosMode: 'default', iosOptions: [], iosNotifyOthersOnDeactivation: true });
      ctx = new AudioContext();
      out = ctx.createGain();
      out.gain.value = MUTED ? 0 : 1;
      out.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void quiet(ctx.resume());
    return ctx;
  } catch {
    // No audio is a degraded sitting, not a broken one.
    return null;
  }
}

/** Hush what is tasting, stop a preview, suspend the context and let the session go. */
function rest() {
  if (!ctx) return;
  stopPreviewBell();
  for (const hush of onRest) hush();
  // Let go only once the engine has stopped: iOS refuses while it runs.
  void quiet(ctx.suspend().then(() => AudioManager.setAudioSessionActivity(false)));
}

/**
 * Keep the context running in the background for a sitting, or let it go
 * once `afterMs` have passed — long enough for what is still fading or
 * ringing to finish, since a suspended context would hold it and play the
 * rest later. Let go while the app is in the background, it rests then.
 */
export function holdForSitting(on: boolean, afterMs = 0): void {
  clearTimeout(release);
  if (on) {
    holding = true;
    return;
  }
  release = setTimeout(() => {
    holding = false;
    if (AppState.currentState === 'background') rest();
  }, afterMs);
}

AppState.addEventListener('change', (state) => {
  if (!ctx) return;
  // Back in front: only a sitting's context is woken here (iOS may have
  // stopped it for a call). Anything else wakes when it is next used, so
  // coming back to the arrival never stops somebody's podcast.
  if (state === 'active' && holding) void quiet(ctx.resume());
  else if (state === 'background' && !holding) rest();
});

// ---- the bells ------------------------------------------------------------

/** One decode per recording, as the site does; a failure is forgotten so the next strike tries again. */
const decoded = new Map<number, Promise<AudioBuffer>>();

function decode(context: AudioContext, asset: number): Promise<AudioBuffer> {
  let pending = decoded.get(asset);
  if (!pending) {
    pending = context.decodeAudioData(asset);
    pending.catch(() => decoded.delete(asset));
    decoded.set(asset, pending);
  }
  return pending;
}

/** How much of a shortened recording's end is a fade rather than the recording. */
const RECORDING_FADE_SECONDS = 2;

/** A recorded bell at `when`, for at most `seconds`, faded if it is cut short (the site's `playRecording`). */
function playRecording(context: AudioContext, when: number, gainNode: GainNode, asset: number, seconds: number) {
  decode(context, asset)
    .then((buffer) => {
      const at = Math.max(when, context.currentTime);
      const ring = Math.min(seconds, buffer.duration);
      const fade = Math.min(RECORDING_FADE_SECONDS, ring / 2);
      const src = context.createBufferSource();
      src.buffer = buffer;
      const env = context.createGain();
      env.gain.setValueAtTime(1, at);
      env.gain.setValueAtTime(1, at + ring - fade);
      env.gain.linearRampToValueAtTime(0, at + ring);
      src.connect(env).connect(gainNode);
      src.start(at);
      src.stop(at + ring + 0.05);
    })
    .catch(said('a recorded bell did not decode'));
}

/** The site's `strike()`: the mallet, then every mode and its beating twin, the set normalised to `PEAK`. */
function strike(context: AudioContext, when: number, gainNode: GainNode, kind: BellKind, decayScale = 1) {
  const bell = BELLS[kind];
  const decay = bell.decay * decayScale;
  if ('recording' in bell) {
    const asset = RECORDINGS[bell.recording];
    if (asset !== undefined) playRecording(context, when, gainNode, asset, decay);
    return;
  }
  mallet(context, when, gainNode, bell.strike);
  let total = 0;
  for (const m of bell.modes) total += m.gain * (m.beat ? 1.8 : 1);
  const level = PEAK / Math.max(total, 0.0001);
  for (const m of bell.modes) {
    const delay = Math.min(m.delay ?? 0, decay * 0.25);
    const life = decay * m.decay;
    const hz = bell.fundamental * m.ratio;
    const attack = 0.012 + delay * 0.5;
    voice(context, gainNode, hz, m.gain * level, when + delay, attack, life);
    if (m.beat) voice(context, gainNode, hz + m.beat, m.gain * level * 0.8, when + delay, attack, life);
  }
}

function voice(context: AudioContext, gainNode: GainNode, hz: number, gain: number, at: number, attack: number, life: number) {
  const osc = context.createOscillator();
  const env = context.createGain();
  osc.type = 'sine';
  osc.frequency.value = hz;
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), at + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, at + attack + life);
  osc.connect(env).connect(gainNode);
  osc.start(at);
  osc.stop(at + attack + life + 0.1);
}

function mallet(context: AudioContext, when: number, gainNode: GainNode, { duration, hz, gain }: Strike) {
  const rate = context.sampleRate;
  const length = Math.max(1, Math.floor(duration * rate));
  const buffer = context.createBuffer(1, length, rate);
  // Filled here and copied in: the channel's memory may be the native side's.
  const noise = new Float32Array(length);
  fillNoise(noise, 'white');
  buffer.copyToChannel(noise, 0);
  const src = context.createBufferSource();
  src.buffer = buffer;
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = hz;
  band.Q.value = 0.7;
  const env = context.createGain();
  env.gain.setValueAtTime(gain, when);
  env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  src.connect(band).connect(env).connect(gainNode);
  src.start(when);
  src.stop(when + duration + 0.02);
}

export interface ScheduledBell {
  /** Silence a bell that has not rung yet, or is ringing. */
  cancel: (immediate?: boolean) => void;
}

/** The bell `delaySeconds` from now, on the audio clock. */
export function scheduleBell(delaySeconds: number, kind: BellKind = DEFAULT_BELL, decayScale = 1): ScheduledBell | null {
  const context = unlock();
  if (!context || !out) return null;
  const master = context.createGain();
  master.gain.value = 0.9;
  master.connect(out);
  strike(context, context.currentTime + Math.max(0, delaySeconds), master, kind, decayScale);
  let cancelled = false;
  return {
    cancel: (immediate = false) => {
      try {
        if (immediate) {
          master.disconnect();
          return;
        }
        if (cancelled) return;
        cancelled = true;
        // The master never moves until now, so it is at 0.9.
        const now = context.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(0.9, now);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      } catch {
        // Already gone.
      }
    },
  };
}

/** The same bell at Begin, its tail clamped so it is never still ringing at the end. */
export function openingBell(kind: BellKind, sittingSeconds: number): ScheduledBell | null {
  const full = BELLS[kind].decay;
  const scale = Math.min(OPENING_DECAY, Math.max(0, sittingSeconds) / full);
  return scheduleBell(0, kind, Math.max(0.05, scale));
}

let preview: ScheduledBell | null = null;

export function stopPreviewBell(): void {
  preview?.cancel(true);
  preview = null;
}

/** A third of the real tail, for the wheel's play button. */
export function previewBell(kind: BellKind = DEFAULT_BELL): void {
  stopPreviewBell();
  preview = scheduleBell(0, kind, 0.32);
}

// ---- the beds -------------------------------------------------------------

const LOOP_SECONDS = new Map(BED_SOURCES.map((b) => [b.slug, b.loop]));
const RAMP_SECONDS = 0.15;
const AUDITION_HOLD_SECONDS = 4;
const AUDITION_FADE_SECONDS = 2.5;

function clamp01(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** What has been scheduled on a level: a value from a time, or a ramp to one. */
type Change = { t: number; v: number; ramp: boolean };
const scheduled = new WeakMap<AudioParam, Change[]>();

/** A level's value at a moment, from what was scheduled on it, as Web Audio would have it. */
function levelAt(changes: readonly Change[], at: number): number {
  let prev: Change | null = null;
  for (const c of changes) {
    if (c.t > at) {
      if (c.ramp && prev && c.t > prev.t) return prev.v + ((c.v - prev.v) * (at - prev.t)) / (c.t - prev.t);
      return prev ? prev.v : c.v;
    }
    prev = c;
  }
  return prev ? prev.v : 0;
}

/** A level's starting value, set as the node is made. */
function startAt(param: AudioParam, value: number) {
  param.value = value;
  scheduled.set(param, [{ t: 0, v: value, ramp: false }]);
}

function setAt(param: AudioParam, value: number, t: number) {
  param.setValueAtTime(value, t);
  scheduled.get(param)?.push({ t, v: value, ramp: false });
}

function rampAt(param: AudioParam, value: number, t: number) {
  param.linearRampToValueAtTime(value, t);
  scheduled.get(param)?.push({ t, v: value, ramp: true });
}

/** The site's `rampTo`: cancel what is ahead, anchor at the value now, and ramp from there. */
function rampTo(context: AudioContext, param: AudioParam, value: number, seconds: number) {
  const now = context.currentTime;
  const from = levelAt(scheduled.get(param) ?? [], now);
  param.cancelScheduledValues(now);
  scheduled.set(param, []);
  if (seconds === 0) {
    setAt(param, value, now);
    return;
  }
  setAt(param, from, now);
  rampAt(param, value, now + seconds);
}

interface MixHandle {
  set: (slug: TrackSlug | typeof MASTER_KEY, gain: number) => void;
  fadeOut: (seconds?: number) => void;
  restore: (gain: number) => void;
  audition: (gain: number) => void;
}

/** The site's `startMix`: a gain per bed under one master, each bed decoded the first time it is raised. */
function startMix(initial: Record<string, number>): MixHandle | null {
  const context = unlock();
  if (!context || !out) return null;
  const master = context.createGain();
  startAt(master.gain, clamp01(initial[MASTER_KEY] ?? DEFAULT_MASTER));
  master.connect(out);
  const gains = new Map<TrackSlug, GainNode>();
  /** The level each bed was last set to, which the audio thread may not have reached yet. */
  const levels = new Map<TrackSlug, number>();
  const started = new Set<TrackSlug>();
  const sources = new Map<TrackSlug, AudioBufferSourceNode>();
  const stops = new Map<TrackSlug, ReturnType<typeof setTimeout>>();

  const play = (slug: TrackSlug) => {
    clearTimeout(stops.get(slug));
    if (started.has(slug)) return;
    started.add(slug);
    // Not kept once it is playing: the source holds its own copy (see the top).
    context
      .decodeAudioData(BEDS[slug])
      .then((buffer) => {
        const gain = gains.get(slug);
        // Taken down again while it was decoding.
        if (!gain || !(levels.get(slug)! > 0)) return started.delete(slug);
        // Looped inside the second of padding at either end of each file,
        // so no decoder's delay reaches the seam (`lib/beds.ts`).
        const src = context.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.loopStart = PAD_SECONDS;
        src.loopEnd = PAD_SECONDS + (LOOP_SECONDS.get(slug) ?? buffer.duration - 2 * PAD_SECONDS);
        src.connect(gain);
        src.start(0, PAD_SECONDS);
        sources.set(slug, src);
      })
      .catch((e) => {
        started.delete(slug);
        said(`the ${slug} bed did not decode`)(e);
      });
  };

  /** A bed at nothing, once its fade has finished: stopped, and its samples let go. */
  const unplay = (slug: TrackSlug, afterSeconds: number) => {
    clearTimeout(stops.get(slug));
    stops.set(slug, setTimeout(() => {
      const src = sources.get(slug);
      // Still decoding: it discards itself when it lands at nothing.
      if (levels.get(slug)! > 0 || !src) return;
      sources.delete(slug);
      started.delete(slug);
      try {
        src.stop();
        src.disconnect();
      } catch {
        // Already stopped.
      }
    }, afterSeconds * 1000 + 250));
  };

  for (const slug of TRACK_SLUGS) {
    const gain = context.createGain();
    const level = clamp01(initial[slug] ?? 0);
    startAt(gain.gain, level);
    gain.connect(master);
    gains.set(slug, gain);
    levels.set(slug, level);
    if (level > 0) play(slug);
  }

  return {
    set(slug, value) {
      const level = clamp01(value);
      if (slug === MASTER_KEY) {
        rampTo(context, master.gain, level, RAMP_SECONDS);
        return;
      }
      levels.set(slug, level);
      if (level > 0) play(slug);
      else if (started.has(slug)) unplay(slug, RAMP_SECONDS);
      const param = gains.get(slug)?.gain;
      if (param) rampTo(context, param, level, RAMP_SECONDS);
    },
    fadeOut(seconds = 4) {
      rampTo(context, master.gain, 0, seconds);
    },
    restore(value) {
      rampTo(context, master.gain, clamp01(value), 0.6);
    },
    audition(value) {
      const level = clamp01(value);
      const up = context.currentTime + 0.4;
      rampTo(context, master.gain, level, 0.4);
      setAt(master.gain, level, up + AUDITION_HOLD_SECONDS);
      rampAt(master.gain, 0, up + AUDITION_HOLD_SECONDS + AUDITION_FADE_SECONDS);
    },
  };
}

export interface Mix {
  ensure: (opts?: { silent?: boolean }) => void;
  unmute: () => void;
  fadeOut: (seconds?: number) => void;
  restore: () => void;
  taste: (slug: TrackSlug) => void;
  hush: () => void;
}

/**
 * The mix, wired to preferences, as the site's `useMix`: `soundMix` owns
 * every level and the graph follows it. Built silent for a taste, at the
 * stored levels for Begin; muted until Sound is opened when it was built
 * for a taste.
 */
export function useMix(soundMix: Record<string, number>): Mix {
  const handle = useRef<MixHandle | null>(null);
  const latest = useRef(soundMix);
  latest.current = soundMix;
  const muted = useRef(false);

  const ensure = useCallback((opts?: { silent?: boolean }) => {
    if (!handle.current) {
      muted.current = opts?.silent === true;
      handle.current = startMix(muted.current ? { ...latest.current, [MASTER_KEY]: 0 } : latest.current);
    } else {
      unlock();
    }
  }, []);

  const unmute = useCallback(() => {
    if (!muted.current) return;
    muted.current = false;
    handle.current?.set(MASTER_KEY, latest.current[MASTER_KEY] ?? DEFAULT_MASTER);
  }, []);

  const fingerprint = useMemo(() => [...TRACK_SLUGS, MASTER_KEY].map((k) => `${k}:${soundMix[k] ?? ''}`).join(), [soundMix]);
  useEffect(() => {
    const mix = handle.current;
    if (!mix) return;
    for (const slug of TRACK_SLUGS) mix.set(slug, latest.current[slug] ?? 0);
    if (!muted.current) mix.set(MASTER_KEY, latest.current[MASTER_KEY] ?? DEFAULT_MASTER);
  }, [fingerprint]);

  const fadeOut = useCallback((seconds?: number) => handle.current?.fadeOut(seconds), []);

  const restore = useCallback(() => {
    muted.current = false;
    const mix = handle.current;
    if (mix) for (const slug of TRACK_SLUGS) mix.set(slug, latest.current[slug] ?? 0);
    mix?.restore(latest.current[MASTER_KEY] ?? DEFAULT_MASTER);
  }, []);

  const taste = useCallback((slug: TrackSlug) => {
    muted.current = true;
    let mix = handle.current;
    if (!mix) mix = handle.current = startMix({ ...latest.current, [MASTER_KEY]: 0 });
    else unlock();
    if (!mix) return;
    mix.fadeOut(0);
    for (const s of TRACK_SLUGS) mix.set(s, s === slug ? 1 : 0);
    mix.audition(latest.current[MASTER_KEY] ?? DEFAULT_MASTER);
  }, []);

  const hush = useCallback(() => {
    const mix = handle.current;
    if (!mix) return;
    muted.current = true;
    mix.fadeOut(0);
    for (const s of TRACK_SLUGS) mix.set(s, latest.current[s] ?? 0);
  }, []);

  // A taste left playing as the app goes to the background stops there,
  // rather than finishing the next time the app opens.
  useEffect(() => {
    onRest.add(hush);
    return () => {
      onRest.delete(hush);
    };
  }, [hush]);

  return { ensure, unmute, fadeOut, restore, taste, hush };
}
