'use client';

import {
  DEFAULT_MASTER,
  MASTER_KEY,
  TRACK_SLUGS,
  type TrackSlug,
} from '@/lib/types';
import { buildNoiseLoop, type NoiseKind } from '@/lib/noise';
import { unlockAudio } from './audio';

/**
 * The ambient mix. Five loops, independent volumes, one master.
 *
 * Lives beside audio.ts rather than in lib/ for the same reason it does:
 * this is browser I/O, and lib/ stays pure.
 *
 * THE PLACEHOLDER LOOPS
 * The five licensed recordings have not arrived from the client, and step 05
 * should not wait on them — the same call already made for the bell in
 * audio.ts. What follows generates each bed from filtered noise instead.
 *
 * This is not a shortcut, and it is worth being precise about why. Everything
 * difficult about a mixer — the gain graph, ramping without clicks, keeping
 * loops phase-locked, surviving an iOS screen lock, persisting and syncing what
 * somebody chose — is identical whether the source is a recording or generated.
 * The recording changes exactly one thing: the buffer.
 *
 * It also sidesteps the problem §7 of the architecture warns about. A looped
 * recording with a discontinuity at the seam clicks on every repeat and no
 * amount of crossfading fully hides it; noise generated with its own wrap
 * crossfade has no seam to hide. And nothing here is licensed to anybody, which
 * matters more than it sounds: putting audio the client does not own on a
 * public deploy is a problem no amount of "it's only temporary" solves.
 *
 * Replacing one is small and local: give that track a `createNode` that decodes
 * the real file and returns a looping buffer source. No preference changes, no
 * UI changes, no test changes.
 *
 * The vocabulary — which slugs exist, what the master key is called — lives in
 * lib/types.ts beside BELL_KINDS, and the loop arithmetic in lib/noise.ts,
 * because both need validating and testing somewhere that has never heard of
 * Web Audio. Re-exported here so callers have one import for "the sound".
 */
export { DEFAULT_MASTER, MASTER_KEY, TRACK_SLUGS, type TrackSlug };

interface TrackDef {
  slug: TrackSlug;
  label: string;
  /** The end of this track's chain, ready to connect to its own gain node. */
  createNode: (ctx: AudioContext) => AudioNode;
  /**
   * Fixed gain putting this bed at the same loudness as the other four, so a
   * fader at half means the same amount of sound whichever one it is under.
   * See LOUDNESS below for where the number comes from.
   */
  trim: number;
}

/**
 * WHY EACH BED HAS A TRIM
 *
 * The five were built to sound right one at a time and never measured against
 * each other, and they were not close. Rendered offline through an
 * `OfflineAudioContext` — no sound, just samples — and measured K-weighted to
 * ITU-R BS.1770, thirty seconds each so the slow LFOs average out:
 *
 *     bed          LUFS     peak
 *     rain         -7.84    1.341   ← clipped
 *     hum         -14.60    0.642
 *     wind        -16.27    0.841
 *     night       -20.22    0.560
 *     waterfall   -20.33    0.373
 *
 * Two separate faults. The spread is 12.5 dB, so rain at half fader was about
 * four times the loudness of waterfall at half fader — the thing CLAUDE.md
 * warns testers about, which is a sign it should have been fixed rather than
 * documented. And rain's peak was above full scale: at the top of its fader it
 * was not loud, it was distorting.
 *
 * K-weighted rather than plain RMS because these differ enormously in spectrum
 * — `hum` is a 110 Hz drone, `night` has a 4.6 kHz band — and equal RMS at
 * those two frequencies is nothing like equal loudness. Plain RMS put them 7 dB
 * apart; K-weighting puts them 5.6 dB apart, and the second number is the one
 * an ear would agree with.
 *
 * Target is -16 LUFS. Not chosen for taste: it is the loudest common target at
 * which no bed's peak reaches full scale. `night` is the binding constraint at
 * -15.2, so -16 leaves a little under a decibel of margin.
 *
 * Re-derive by rendering each bed offline and measuring; the numbers below
 * should reproduce within a few tenths, noise being noise.
 */
const TARGET_LUFS = -16;

/** Measured K-weighted loudness of each bed at trim 1. */
const MEASURED_LUFS: Record<TrackSlug, number> = {
  rain: -7.84,
  wind: -16.27,
  waterfall: -20.33,
  hum: -14.6,
  night: -20.22,
};

const trimFor = (slug: TrackSlug) =>
  10 ** ((TARGET_LUFS - MEASURED_LUFS[slug]) / 20);

// ---------------------------------------------------------------------------
// Noise
// ---------------------------------------------------------------------------

export /** Long enough that the repeat is not a rhythm you can hear. */
const LOOP_SECONDS = 12;

/** Long enough to hide the wrap, short enough not to smear the character. */
const WRAP_FADE_SECONDS = 0.4;

const bufferCache = new Map<NoiseKind, AudioBuffer>();

/**
 * Cached by kind: five tracks draw on three noise colours, and generating
 * twelve seconds of filtered noise more than once per colour is wasted time on
 * the one code path somebody is waiting behind.
 */
function noiseBuffer(ctx: AudioContext, kind: NoiseKind): AudioBuffer {
  const cached = bufferCache.get(kind);
  if (cached) return cached;

  const rate = ctx.sampleRate;
  const length = Math.floor(LOOP_SECONDS * rate);
  const fade = Math.floor(WRAP_FADE_SECONDS * rate);

  const buffer = ctx.createBuffer(1, length, rate);
  buffer.getChannelData(0).set(buildNoiseLoop(length, fade, kind));

  bufferCache.set(kind, buffer);
  return buffer;
}

function noiseSource(ctx: AudioContext, kind: NoiseKind): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, kind);
  src.loop = true;
  src.start();
  return src;
}

/** A slow oscillation applied to an AudioParam — wind gusting, a bed breathing. */
function modulate(
  ctx: AudioContext,
  param: AudioParam,
  { rateHz, depth }: { rateHz: number; depth: number },
): void {
  const lfo = ctx.createOscillator();
  const amount = ctx.createGain();
  lfo.frequency.value = rateHz;
  amount.gain.value = depth;
  lfo.connect(amount).connect(param);
  lfo.start();
}

// ---------------------------------------------------------------------------
// The five beds
// ---------------------------------------------------------------------------

export const TRACKS: readonly TrackDef[] = [
  {
    slug: 'rain',
    label: 'Rain',
    trim: trimFor('rain'),
    createNode: (ctx) => {
      // White through a high-pass is close to steady rain on a hard surface.
      // The low-pass takes the top off so it is not a hiss on headphones.
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 700;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 7000;

      // Rain is not constant; it comes in waves. Without this it reads as a
      // fan rather than weather.
      const body = ctx.createGain();
      body.gain.value = 0.7;
      modulate(ctx, body.gain, { rateHz: 0.06, depth: 0.18 });

      noiseSource(ctx, 'white').connect(hp).connect(lp).connect(body);
      return body;
    },
  },
  {
    slug: 'wind',
    label: 'Wind',
    trim: trimFor('wind'),
    createNode: (ctx) => {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      lp.Q.value = 1.4;
      // The gust. Moving the cutoff rather than the volume is what makes it
      // sound like air moving past something instead of a fader being ridden.
      modulate(ctx, lp.frequency, { rateHz: 0.045, depth: 260 });

      noiseSource(ctx, 'brown').connect(lp);
      return lp;
    },
  },
  {
    slug: 'waterfall',
    label: 'Waterfall',
    trim: trimFor('waterfall'),
    createNode: (ctx) => {
      // Wide and steady, with the mid emphasis that distance gives water.
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900;
      bp.Q.value = 0.5;

      noiseSource(ctx, 'pink').connect(bp);
      return bp;
    },
  },
  {
    slug: 'hum',
    label: 'Hum',
    trim: trimFor('hum'),
    createNode: (ctx) => {
      // A shruti-box bed: a root, a very slightly detuned twin so the two beat
      // against each other, and the fifth above. The beating is the whole
      // effect — two exactly-tuned sines sound like a test tone.
      const out = ctx.createGain();
      out.gain.value = 0.22;

      for (const [hz, level] of [
        [110, 1],
        [110.35, 0.9],
        [164.8, 0.42],
      ] as const) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = hz;
        g.gain.value = level;
        osc.connect(g).connect(out);
        osc.start();
      }

      modulate(ctx, out.gain, { rateHz: 0.035, depth: 0.06 });
      return out;
    },
  },
  {
    slug: 'night',
    label: 'Night',
    trim: trimFor('night'),
    createNode: (ctx) => {
      // Two layers: a low bed of air, and a narrow high band that reads as
      // insects at a distance. Neither is convincing alone.
      const out = ctx.createGain();
      out.gain.value = 0.8;

      const air = ctx.createBiquadFilter();
      air.type = 'lowpass';
      air.frequency.value = 240;
      const airLevel = ctx.createGain();
      airLevel.gain.value = 0.85;
      noiseSource(ctx, 'brown').connect(air).connect(airLevel).connect(out);

      const chorus = ctx.createBiquadFilter();
      chorus.type = 'bandpass';
      chorus.frequency.value = 4600;
      chorus.Q.value = 12;
      const chorusLevel = ctx.createGain();
      chorusLevel.gain.value = 0.5;
      modulate(ctx, chorusLevel.gain, { rateHz: 0.5, depth: 0.3 });
      noiseSource(ctx, 'pink').connect(chorus).connect(chorusLevel).connect(out);

      return out;
    },
  },
] as const;

// ---------------------------------------------------------------------------
// The graph
// ---------------------------------------------------------------------------

/** Long enough that a change is a fade, short enough to feel immediate. */
const RAMP_SECONDS = 0.15;

function clamp01(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function rampTo(ctx: AudioContext, param: AudioParam, value: number, seconds: number) {
  const now = ctx.currentTime;
  // Without cancel-then-pin, a ramp scheduled while another is in flight
  // starts from the old target rather than from where the sound actually is,
  // and the result is an audible jump.
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(value, now + seconds);
}

export interface MixHandle {
  /** Set one track's level, or the master with MASTER_KEY. */
  set: (slug: TrackSlug | typeof MASTER_KEY, gain: number) => void;
  /** Take the whole mix down without tearing it apart — used after the bell. */
  fadeOut: (seconds?: number) => void;
  /** Bring the master back to a stored level after a fadeOut. */
  restore: (gain: number) => void;
  stop: () => void;
}

/**
 * Build the graph and start every source at once.
 *
 * All five run from the first moment at zero gain and are never stopped. That
 * is deliberate and it is what §7 specifies: fading is glitch-free where
 * starting and stopping sources is not, and leaving them running keeps every
 * loop phase-locked so the mix cannot drift apart over a long sitting.
 *
 * Must be called from inside a user gesture, like everything else that touches
 * the AudioContext. Returns null when there is no audio at all — a silent
 * sitting is degraded, not broken, so every caller treats null as "carry on".
 */
export function startMix(initial: Record<string, number>): MixHandle | null {
  const ctx = unlockAudio();
  if (!ctx) return null;

  const master = ctx.createGain();
  master.gain.value = clamp01(initial[MASTER_KEY] ?? DEFAULT_MASTER);
  master.connect(ctx.destination);

  const gains = new Map<TrackSlug, GainNode>();

  for (const track of TRACKS) {
    const gain = ctx.createGain();
    gain.gain.value = clamp01(initial[track.slug] ?? 0);

    // Trim sits before the fader, not after: the fader is what the visitor
    // moves and what gets stored, so it has to stay 0..1 and mean the same
    // thing on every bed. Putting the correction upstream is what makes that
    // true — see the LOUDNESS note above.
    const trim = ctx.createGain();
    trim.gain.value = track.trim;

    track.createNode(ctx).connect(trim).connect(gain).connect(master);
    gains.set(track.slug, gain);
  }

  return {
    set(slug, value) {
      const param =
        slug === MASTER_KEY ? master.gain : gains.get(slug as TrackSlug)?.gain;
      if (!param) return;
      rampTo(ctx, param, clamp01(value), RAMP_SECONDS);
    },

    fadeOut(seconds = 4) {
      // Slow, because this runs when a bell has just sounded and the point of
      // the moment is that nothing happens abruptly.
      rampTo(ctx, master.gain, 0, seconds);
    },

    restore(value) {
      rampTo(ctx, master.gain, clamp01(value), 0.6);
    },

    stop() {
      try {
        master.disconnect();
      } catch {
        // Already gone. Nothing here is worth an error on the way out.
      }
    },
  };
}
