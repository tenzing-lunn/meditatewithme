'use client';

import { DEFAULT_BELL, type BellKind } from '@/lib/types';
import { BELLS, OPENING_DECAY, PEAK, type Strike } from '@/lib/bells';
import { fillNoise } from '@/lib/noise';

export type { BellKind };
export { BELLS };

/**
 * Audio. One context, created by a user gesture, never torn down.
 *
 * Lives outside lib/ because it is browser I/O — lib/ stays pure.
 *
 * THE PLACEHOLDER BELLS
 * The three licensed bells (singing bowl, gong, struck bell) have not arrived
 * from the client yet, and step 04 should not wait on them. What follows
 * synthesises them — three separate instruments, each with its own modes, its
 * own mallet, and beating between mode pairs, because they began as one synth
 * with the pitch changed and that is precisely what a listener hears.
 *
 * It is still not a substitute for a real recording. Modal synthesis gets the
 * shape of a struck object and not the mess of one, and the mess is most of
 * what makes a recording sound alive on decent headphones — which is exactly
 * where this product is judged. Nothing here reduces the case for buying the
 * real thing; it is time-sensitive and it is Jonny's to do.
 *
 * Replacing it is a small job, and none of the work below is in the way:
 * decode the real buffers behind the Begin button and swap `strike()` for a
 * buffer source. `scheduleBell` and `openingBell` do not change.
 */

let ctx: AudioContext | null = null;

/**
 * Create or resume the context. MUST be called from inside a user gesture —
 * autoplay policy blocks it otherwise, which is why Begin exists as a
 * deliberate ritual rather than audio starting at somebody unannounced.
 *
 * Safe to call repeatedly; later calls just resume a suspended context, which
 * is what recovering from an iOS screen lock needs.
 */
export function unlockAudio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    // No audio is a degraded sitting, not a broken one. The candle still burns.
    return null;
  }
}

export function audioContext(): AudioContext | null {
  return ctx;
}

/**
 * One fetch and one decode per recording per page, as the beds do in mix.ts.
 * A failed fetch is forgotten so the next strike tries again.
 */
const recordings = new Map<string, Promise<AudioBuffer>>();

function loadRecording(context: AudioContext, url: string): Promise<AudioBuffer> {
  let pending = recordings.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${url}: ${r.status}`);
        return r.arrayBuffer();
      })
      .then((bytes) => context.decodeAudioData(bytes));
    pending.catch(() => recordings.delete(url));
    recordings.set(url, pending);
  }
  return pending;
}

/** How much of a shortened recording's end is a fade rather than the recording. */
const RECORDING_FADE_SECONDS = 2;

/**
 * Ring a recorded bell at `when`, for at most `seconds`.
 *
 * Scheduled on the audio clock like the synthesised ones. If the file has not
 * arrived by `when` it starts as soon as it does: the closing bell is scheduled
 * a sitting ahead, so it is nearly always there, and an opening bell on a slow
 * connection is late rather than missing. A file that never arrives is a
 * silent bell, the same degradation as no audio at all. A recording cut short
 * by `seconds` — the preview, the opening bell — is faded over its last
 * seconds, not stopped.
 */
function playRecording(
  context: AudioContext,
  when: number,
  out: GainNode,
  url: string,
  seconds: number,
) {
  loadRecording(context, url)
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

      src.connect(env).connect(out);
      src.start(at);
      src.stop(at + ring + 0.05);
    })
    .catch(() => {});
}

function strike(
  context: AudioContext,
  when: number,
  gainNode: GainNode,
  kind: BellKind,
  decayScale = 1,
) {
  const bell = BELLS[kind];
  const decay = bell.decay * decayScale;

  if ('recording' in bell) {
    playRecording(context, when, gainNode, bell.recording, decay);
    return;
  }

  mallet(context, when, gainNode, bell.strike);

  /* WHY THE SET IS NORMALISED RATHER THAN HAND-BALANCED
     The three bells no longer have the same number of modes — five, ten and
     eight — and every mode with a `beat` is two oscillators, not one. Left as
     written, the gong would arrive at roughly two and a half times the level of
     the struck bell purely because it has more going on, and adding a mode to
     any of them later would quietly make that bell louder. So the relative
     numbers in the tables stay relative, and the sum is what is pinned. */
  let total = 0;
  for (const m of bell.modes) total += m.gain * (m.beat ? 1.8 : 1);
  const level = PEAK / Math.max(total, 0.0001);

  for (const m of bell.modes) {
    // Never past a quarter of the tail: a gong's bloom is 1.8s into a
    // twenty-two second decay, and the same mode inside a clamped opening bell
    // must not arrive after the sound it belongs to has gone.
    const delay = Math.min(m.delay ?? 0, decay * 0.25);
    const life = decay * m.decay;
    const hz = bell.fundamental * m.ratio;

    // A late mode fades up rather than arriving as a click — that gradual
    // swell IS the bloom, not a defence against one.
    const attack = 0.012 + delay * 0.5;

    voice(context, gainNode, hz, m.gain * level, when + delay, attack, life);
    if (m.beat) {
      // Quieter than its twin, so the pair reads as one mode breathing rather
      // than as two notes.
      voice(
        context,
        gainNode,
        hz + m.beat,
        m.gain * level * 0.8,
        when + delay,
        attack,
        life,
      );
    }
  }
}

/** One mode: a sine that arrives, then decays for as long as it has left. */
function voice(
  context: AudioContext,
  out: GainNode,
  hz: number,
  gain: number,
  at: number,
  attack: number,
  life: number,
) {
  const osc = context.createOscillator();
  const env = context.createGain();

  osc.type = 'sine';
  osc.frequency.value = hz;

  // Exponential rather than linear because loudness is perceived
  // logarithmically — a linear fade sounds like it stops abruptly at the end.
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), at + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, at + attack + life);

  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + attack + life + 0.1);
}

/**
 * The contact noise, struck at the same instant as the modes.
 *
 * A band-passed burst a few tens of milliseconds long. It is not meant to be
 * heard as a sound of its own — if you can pick it out it is too loud. What it
 * does is give the ear something physical to attribute the tone to, which four
 * sines fading up cannot do however good their ratios are.
 */
function mallet(
  context: AudioContext,
  when: number,
  out: GainNode,
  { duration, hz, gain }: Strike,
) {
  const rate = context.sampleRate;
  const length = Math.max(1, Math.floor(duration * rate));
  const buffer = context.createBuffer(1, length, rate);
  fillNoise(buffer.getChannelData(0), 'white');

  const src = context.createBufferSource();
  src.buffer = buffer;

  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = hz;
  band.Q.value = 0.7;

  const env = context.createGain();
  env.gain.setValueAtTime(gain, when);
  env.gain.exponentialRampToValueAtTime(0.0001, when + duration);

  src.connect(band).connect(env).connect(out);
  src.start(when);
  src.stop(when + duration + 0.02);
}

export interface ScheduledBell {
  /** Silence a bell that has not rung yet. */
  cancel: (immediate?: boolean) => void;
}

/**
 * Schedule the end bell `delaySeconds` from now, ON THE AUDIO CLOCK.
 *
 * This is the whole point. A `setTimeout` would be throttled to roughly one
 * tick a minute in a background tab, and meditating with the tab hidden is the
 * normal case — a bell ninety seconds late has failed at its one job. The audio
 * clock is not throttled.
 *
 * The known limit, which the architecture already accepts as unsolvable in a
 * web app: iOS suspends the context when the screen locks, freezing
 * `currentTime` with it. A locked iPhone will hear its bell late.
 */
export function scheduleBell(
  delaySeconds: number,
  kind: BellKind = DEFAULT_BELL,
  decayScale = 1,
): ScheduledBell | null {
  const context = unlockAudio();
  if (!context) return null;

  const master = context.createGain();
  master.gain.value = 0.9;
  master.connect(context.destination);

  strike(
    context,
    context.currentTime + Math.max(0, delaySeconds),
    master,
    kind,
    decayScale,
  );

  return {
    cancel: (immediate = false) => {
      try {
        if (immediate) {
          // Disconnect also silences recordings that finish loading later.
          master.disconnect();
          return;
        }
        // Ramp rather than disconnect — cutting a ringing bell dead produces
        // an audible click.
        master.gain.cancelScheduledValues(context.currentTime);
        master.gain.setValueAtTime(master.gain.value, context.currentTime);
        master.gain.exponentialRampToValueAtTime(
          0.0001,
          context.currentTime + 0.25,
        );
      } catch {
        // Already gone.
      }
    },
  };
}

/**
 * Ring the chosen bell at the start of a sitting.
 *
 * Struck immediately, which is safe here for the same reason `Begin` works at
 * all: this runs inside the click that unlocked the context.
 *
 * It is the same bell as the ending. There is one choice on the settings screen
 * and it is `endBell` in preferences — a stored key, a jsonb field and a CHECK
 * constraint, so the name stays even though it now rings twice. Whatever
 * somebody picked is theirs; a sitting that opened on a gong and closed on a
 * bowl would be two different rooms.
 *
 * `sittingSeconds` is not decoration. `until the bell` pressed at :59:30 is a
 * real thirty-second sitting, and the one thing an opening bell must never do
 * is still be ringing when the closing one strikes — that moment is the whole
 * point of the design and it does not get muddied by this.
 */
export function openingBell(
  kind: BellKind,
  sittingSeconds: number,
): ScheduledBell | null {
  const full = BELLS[kind].decay;
  const scale = Math.min(OPENING_DECAY, Math.max(0, sittingSeconds) / full);
  // A floor, because a decay of zero would schedule the tail before the attack
  // it is supposed to follow.
  return scheduleBell(0, kind, Math.max(0.05, scale));
}

/**
 * Ring once, immediately, and briefly. Used to preview a bell from the
 * settings.
 *
 * A third of the real tail. The real one is built to last the thirty seconds it
 * takes to come back from a sitting; struck three times in a row while somebody
 * compares them, that would be three bowls ringing over each other for a minute.
 * You can tell a gong from a struck bell in four seconds.
 */
let preview: ScheduledBell | null = null;

export function stopPreviewBell(): void {
  preview?.cancel(true);
  preview = null;
}

export function previewBell(kind: BellKind = DEFAULT_BELL): void {
  stopPreviewBell();
  preview = scheduleBell(0, kind, 0.32);
}
