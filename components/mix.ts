'use client';

import { BED_SOURCES, PAD_SECONDS } from '@/lib/beds';
import {
  DEFAULT_MASTER,
  MASTER_KEY,
  TRACK_SLUGS,
  type TrackSlug,
} from '@/lib/types';
import { unlockAudio } from './audio';

/**
 * The ambient mix. Eight recordings, one of them on at a time, one master.
 *
 * Lives beside audio.ts rather than in lib/ for the same reason it does:
 * this is browser I/O, and lib/ stays pure.
 *
 * RECORDINGS, NOT SYNTHESIS — 23 September 2026
 * Until today every bed was generated from filtered noise, a stand-in for
 * recordings the client was going to buy. Tenzing listened to them and they
 * were not good enough, so they are real field recordings now: CC0 from
 * Freesound, listed with their recordists in lib/beds.ts and cut into
 * seamless loops in public/sounds/ by scripts/build-sounds.mjs. The bells
 * are still synthesised in audio.ts; only the beds changed.
 *
 * Two things came with files that generation never had to think about.
 *
 * *Loading.* Eight minutes-long loops are ~13 MB, and nobody hears more than
 * one of them at a time. So a bed is fetched the first time its gain goes
 * above zero — the tap that chooses it, or a sitting starting with it
 * already chosen — and cached for the life of the page. Until it arrives,
 * its gain is simply ramping over nothing, and the sound fades in when the
 * source is connected, a moment late rather than never.
 *
 * *Loudness.* The files are already matched by the build script — -16 LUFS,
 * or as far under as a bed's peaks require — so there is no trim here. One
 * Volume means the same amount of sound whichever bed is under it.
 *
 * The vocabulary — which slugs exist, what the master key is called — lives in
 * lib/types.ts beside BELL_KINDS. Re-exported here so callers have one import
 * for "the sound".
 */
export { DEFAULT_MASTER, MASTER_KEY, TRACK_SLUGS, type TrackSlug };

interface TrackDef {
  slug: TrackSlug;
  label: string;
}

const LABELS: Record<TrackSlug, string> = {
  rain: 'Rain',
  wind: 'Wind',
  waterfall: 'Waterfall',
  ocean: 'Ocean',
  fire: 'Fire',
  hum: 'Hum',
  chimes: 'Chimes',
  gong: 'Gong',
  night: 'Night',
};

/** In the order they are shown. */
export const TRACKS: readonly TrackDef[] = TRACK_SLUGS.map((slug) => ({
  slug,
  label: LABELS[slug],
}));

const LOOP_SECONDS = new Map(BED_SOURCES.map((b) => [b.slug, b.loop]));

/**
 * One decode per bed per page, shared by every graph: a sitting that ends
 * and another that begins should not fetch the sea twice. A failed fetch is
 * forgotten, so the next choice of that bed tries again.
 */
const buffers = new Map<TrackSlug, Promise<AudioBuffer>>();

function load(ctx: AudioContext, slug: TrackSlug): Promise<AudioBuffer> {
  let pending = buffers.get(slug);
  if (!pending) {
    pending = fetch(`/sounds/${slug}.mp3`)
      .then((r) => {
        if (!r.ok) throw new Error(`${slug}: ${r.status}`);
        return r.arrayBuffer();
      })
      .then((bytes) => ctx.decodeAudioData(bytes));
    pending.catch(() => buffers.delete(slug));
    buffers.set(slug, pending);
  }
  return pending;
}

// ---------------------------------------------------------------------------
// The graph
// ---------------------------------------------------------------------------

/** Long enough that a change is a fade, short enough to feel immediate. */
const RAMP_SECONDS = 0.15;

/** Long enough to know what a bed is; the fade says it was only a taste. */
const AUDITION_HOLD_SECONDS = 4;
const AUDITION_FADE_SECONDS = 2.5;

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
  /**
   * Raise the master, hold it, and let it fall to zero on its own — a taste
   * of a bed before a sitting, the way `previewBell` is a taste of a bell.
   * Scheduled on the audio clock, so a throttled tab cannot leave it on.
   */
  audition: (gain: number) => void;
  stop: () => void;
}

/**
 * Build the graph: the master, and a gain for every bed.
 *
 * A bed's source starts the first time its gain is raised (see `play`) and
 * then runs at whatever gain it is given, never stopped: fading is
 * glitch-free where starting and stopping sources is not, which is what §7
 * specifies. Beds nobody chooses are never fetched.
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
  const started = new Set<TrackSlug>();
  let stopped = false;

  /**
   * Fetch this bed if it has not been, and start it looping under its gain.
   * Once per bed per graph; after that it runs, like the synthesised beds
   * did, and is faded rather than stopped.
   */
  const play = (slug: TrackSlug) => {
    if (started.has(slug)) return;
    started.add(slug);
    load(ctx, slug)
      .then((buffer) => {
        const gain = gains.get(slug);
        if (stopped || !gain) return;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        // Inside the padding at both ends; see PAD_SECONDS in lib/beds.ts.
        src.loopStart = PAD_SECONDS;
        src.loopEnd = PAD_SECONDS + (LOOP_SECONDS.get(slug) ?? buffer.duration - 2 * PAD_SECONDS);
        src.connect(gain);
        src.start(0, PAD_SECONDS);
      })
      // Offline, or the file is missing: this bed is silent, and choosing it
      // again tries again. A silent sitting is degraded, not broken.
      .catch(() => started.delete(slug));
  };

  for (const track of TRACKS) {
    const gain = ctx.createGain();
    const level = clamp01(initial[track.slug] ?? 0);
    gain.gain.value = level;
    gain.connect(master);
    gains.set(track.slug, gain);
    if (level > 0) play(track.slug);
  }

  return {
    set(slug, value) {
      const level = clamp01(value);
      if (slug !== MASTER_KEY && level > 0) play(slug as TrackSlug);
      const param =
        slug === MASTER_KEY ? master.gain : gains.get(slug as TrackSlug)?.gain;
      if (!param) return;
      rampTo(ctx, param, level, RAMP_SECONDS);
    },

    fadeOut(seconds = 4) {
      // Slow, because this runs when a bell has just sounded and the point of
      // the moment is that nothing happens abruptly.
      rampTo(ctx, master.gain, 0, seconds);
    },

    restore(value) {
      rampTo(ctx, master.gain, clamp01(value), 0.6);
    },

    audition(value) {
      const level = clamp01(value);
      const up = ctx.currentTime + 0.4;
      rampTo(ctx, master.gain, level, 0.4);
      master.gain.setValueAtTime(level, up + AUDITION_HOLD_SECONDS);
      master.gain.linearRampToValueAtTime(0, up + AUDITION_HOLD_SECONDS + AUDITION_FADE_SECONDS);
    },

    stop() {
      stopped = true;
      try {
        master.disconnect();
      } catch {
        // Already gone. Nothing here is worth an error on the way out.
      }
    },
  };
}
