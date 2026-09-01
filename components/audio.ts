'use client';

import { DEFAULT_BELL, type BellKind } from '@/lib/types';

export type { BellKind };

/**
 * Audio. One context, created by a user gesture, never torn down.
 *
 * Lives outside lib/ because it is browser I/O — lib/ stays pure.
 *
 * THE PLACEHOLDER BELL
 * The three licensed bells (singing bowl, gong, struck bell) have not arrived
 * from the client yet, and step 04 should not wait on them. What follows
 * synthesises a passable struck bowl so the timer can be built, tested and felt
 * end to end. It is not a substitute for a real recording — a synthesised bell
 * is thin on decent headphones, which is exactly where this product is judged.
 *
 * Replacing it is a small job: decode the real buffers behind the Begin button
 * and swap `strike()` for a buffer source. `scheduleBell` does not change.
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
 * A struck bowl at time `when` on the audio clock.
 *
 * Real bowls are inharmonic — their partials are not integer multiples of the
 * fundamental, which is why a plain sine stack sounds like a synthesiser and a
 * bowl sounds like a bowl. The ratios below are roughly those of a struck
 * metal bowl, and each partial decays faster than the one below it, because
 * high partials die first in anything physical.
 */
/**
 * `decay` is the fundamental's tail in seconds, and it is long on purpose.
 *
 * The end of a sitting is not the moment the sound stops — it is the half
 * minute afterwards, while the bowl is still going and you are coming back.
 * These were 9 / 12 / 6, which put silence in the room several seconds before
 * anybody had opened their eyes and made the ending feel like a timer expiring.
 * The camera now takes thirty seconds to come back from a sitting, and the bell
 * is what fills it.
 *
 * Previews are struck at a fraction of this (see `previewBell`), because
 * auditioning three bells should not leave three tails overlapping for a
 * minute.
 */
export const BELLS: Record<
  BellKind,
  { label: string; fundamental: number; decay: number }
> = {
  'singing-bowl': { label: 'Singing bowl', fundamental: 312, decay: 18 },
  gong: { label: 'Gong', fundamental: 174, decay: 22 },
  'struck-bell': { label: 'Struck bell', fundamental: 523, decay: 13 },
};

function strike(
  context: AudioContext,
  when: number,
  gainNode: GainNode,
  kind: BellKind,
  decayScale = 1,
) {
  // The three differ only in pitch and decay length for now. That is enough to
  // make the selector real rather than decorative, but they are three settings
  // of one synth, not three instruments — the licensed recordings are what
  // actually make them distinct.
  const { fundamental } = BELLS[kind];
  const decay = BELLS[kind].decay * decayScale;
  const partials = [
    { ratio: 1, gain: 0.5, decay },
    { ratio: 2.76, gain: 0.24, decay: decay * 0.67 },
    { ratio: 5.4, gain: 0.12, decay: decay * 0.4 },
    { ratio: 8.9, gain: 0.05, decay: decay * 0.23 },
  ];

  for (const p of partials) {
    const osc = context.createOscillator();
    const env = context.createGain();

    osc.type = 'sine';
    osc.frequency.value = fundamental * p.ratio;

    // Fast attack, long exponential tail. Exponential rather than linear
    // because loudness is perceived logarithmically — a linear fade sounds
    // like it stops abruptly at the end.
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(p.gain, when + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, when + p.decay);

    osc.connect(env).connect(gainNode);
    osc.start(when);
    osc.stop(when + p.decay + 0.1);
  }
}

export interface ScheduledBell {
  /** Silence a bell that has not rung yet. */
  cancel: () => void;
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
    cancel: () => {
      try {
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
 * Ring once, immediately, and briefly. Used to preview a bell from the
 * settings.
 *
 * A third of the real tail. The real one is built to last the thirty seconds it
 * takes to come back from a sitting; struck three times in a row while somebody
 * compares them, that would be three bowls ringing over each other for a minute.
 * You can tell a gong from a struck bell in four seconds.
 */
export function previewBell(kind: BellKind = DEFAULT_BELL): void {
  scheduleBell(0, kind, 0.32);
}
