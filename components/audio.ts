'use client';

import { DEFAULT_BELL, type BellKind } from '@/lib/types';
import { fillNoise } from '@/lib/noise';

export type { BellKind };

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
 * One mode of a struck piece of metal.
 *
 * THESE USED TO BE ONE SHARED ARRAY, AND THAT WAS THE WHOLE PROBLEM.
 * All three bells ran the same four ratios — 1, 2.76, 5.4, 8.9 — with only the
 * pitch and the tail length changed between them. Those happen to be *bowl*
 * ratios, which is why the bowl was the convincing one and why the gong was a
 * bowl pitched down. Three settings of one synth is what the old comment here
 * admitted to. Each bell now has its own modes, because that is the only thing
 * that makes them different instruments rather than different notes.
 */
interface Mode {
  /** Multiple of the bell's `fundamental`. Deliberately not integers. */
  ratio: number;
  /** Relative, not absolute — `strike` normalises the whole set. */
  gain: number;
  /** Fraction of the bell's decay. High modes die first in anything physical. */
  decay: number;
  /**
   * The beating twin, in Hz above this mode. Absent means a single oscillator.
   *
   * Real bells and bowls are never perfectly symmetrical, so each mode is
   * really two a fraction of a hertz apart, and the two drift in and out of
   * phase. That slow warble is the sound of the metal being a physical object.
   * Two exactly-tuned sines are a test tone — the `hum` bed in `mix.ts` already
   * leans on this, at 110 and 110.35 Hz.
   */
  beat?: number;
  /**
   * Seconds after the strike that this mode arrives. Absent means at once.
   *
   * This is the gong, and it is most of what a gong is. Energy moves up the
   * spectrum after the beater lands, so a tam-tam gets brighter for a second or
   * two before it starts to die — it blooms. Bells and bowls do not do this and
   * leave it unset. The attack lengthens with the delay, so a late mode fades
   * up rather than arriving as a click.
   */
  delay?: number;
}

/**
 * The mallet.
 *
 * The tone was never the part that gave the synthesis away — the attack was.
 * Something struck makes a short noisy burst of contact before it makes a note,
 * and four sine waves ramping up over twelve milliseconds make no such thing.
 * A filtered noise burst under the attack costs one buffer and is the single
 * biggest difference between "a bell" and "a bell sound".
 *
 * It does NOT scale with `decayScale`. A mallet is a mallet whether the tail
 * after it is a four-second preview or a twenty-two second ending.
 */
interface Strike {
  /** Seconds. Longer for a big soft beater, shorter for a hard clapper. */
  duration: number;
  /** Where the contact noise sits. A heavy gong beater is far darker. */
  hz: number;
  gain: number;
}

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
 *
 * `fundamental` IS THE NOTE YOU HEAR, WHICH IS NOT THE LOWEST MODE.
 * For the bowl and the gong those are the same thing. For a bell they are not:
 * the pitch the ear assigns to a struck bell is its *nominal*, two octaves
 * above the hum, and everything below that is felt rather than named. So the
 * bell's modes are written as fractions of the note rather than multiples of
 * its lowest mode. The three numbers here are unchanged, and deliberately —
 * this work was meant to change what the bells sound like, not what they play.
 */
export const BELLS: Record<
  BellKind,
  {
    label: string;
    fundamental: number;
    decay: number;
    strike: Strike;
    modes: readonly Mode[];
  }
> = {
  /**
   * Few modes, widely spaced, and beating hard. The old shared ratios were
   * these, which is why the bowl was always the one that worked — it is kept
   * close to what it was, with the twins it should always have had. The warble
   * as two modes drift through each other is the sound people know a singing
   * bowl by.
   */
  'singing-bowl': {
    label: 'Singing bowl',
    fundamental: 312,
    decay: 18,
    // A padded mallet on thick metal: soft, brief, and in the mids.
    strike: { duration: 0.035, hz: 1400, gain: 0.1 },
    modes: [
      { ratio: 1, gain: 1, decay: 1, beat: 1.1 },
      { ratio: 2.76, gain: 0.48, decay: 0.62, beat: 1.8 },
      { ratio: 5.4, gain: 0.22, decay: 0.36, beat: 2.6 },
      { ratio: 8.93, gain: 0.1, decay: 0.2, beat: 3.4 },
      { ratio: 13.3, gain: 0.04, decay: 0.11 },
    ],
  },

  /**
   * Dense, clustered and blooming — and the ratios must not form a chord.
   *
   * A tam-tam is not a large bowl. Its modes are packed close together rather
   * than spread wide, there are many more of them, and the upper ones arrive
   * *after* the beater rather than with it. That last part is the bloom, and
   * it is why a gong seems to grow before it fades.
   *
   * THE RATIOS BELOW ARE IRREGULAR ON PURPOSE, AND THE PREVIOUS SET WAS NOT.
   * It ran 1, 1.19, 1.41, 1.68, 2.13, 2.61, 3.24, 3.97, 4.81, 5.92 — every step
   * between three and 3.7 semitones, which is a ladder of minor thirds. Ten
   * partials on that ladder is a diminished seventh chord two and a half
   * octaves tall, and the bloom then arpeggiated it upward. It did not sound
   * like a gong; it sounded like a chord being played, because it was one.
   *
   * A tam-tam has no pitch to speak of, so no interval here may be a
   * recognisable one. Every pair of these is at least sixteen cents off the
   * nearest octave, fifth, fourth, third or sixth, and the steps run anywhere
   * from 0.9 to 4.3 semitones, so nothing in the set lines up with anything
   * else. Three of the partials over the fundamental sit inside two semitones
   * of each other — that cluster beats against itself, and roughness down in
   * the low mids is what a big sheet of bronze actually does.
   *
   * Nudging a ratio is therefore not free. Move one and check what it lands on.
   */
  gong: {
    label: 'Gong',
    fundamental: 174,
    decay: 22,
    // A heavy beater on a big sheet: long, dark contact.
    strike: { duration: 0.09, hz: 500, gain: 0.16 },
    modes: [
      { ratio: 1, gain: 0.9, decay: 1, beat: 0.4 },
      { ratio: 1.23, gain: 0.62, decay: 0.9, beat: 0.7 },
      { ratio: 1.35, gain: 0.7, decay: 0.88, beat: 0.9 },
      { ratio: 1.42, gain: 0.58, decay: 0.82, beat: 1.2 },
      { ratio: 1.515, gain: 0.5, decay: 0.76, beat: 1.5 },
      { ratio: 1.73, gain: 0.44, decay: 0.66, beat: 1.9, delay: 0.2 },
      { ratio: 2.22, gain: 0.36, decay: 0.55, beat: 2.4, delay: 0.4 },
      { ratio: 2.62, gain: 0.32, decay: 0.46, beat: 2.9, delay: 0.6 },
      { ratio: 3.23, gain: 0.28, decay: 0.38, beat: 3.5, delay: 0.85 },
      { ratio: 4.09, gain: 0.24, decay: 0.3, beat: 4.2, delay: 1.1 },
      { ratio: 4.72, gain: 0.2, decay: 0.24, delay: 1.35 },
      { ratio: 5.3, gain: 0.16, decay: 0.19, delay: 1.6 },
      { ratio: 6.23, gain: 0.12, decay: 0.15, delay: 1.9 },
      { ratio: 7.6, gain: 0.08, decay: 0.11, delay: 2.2 },
    ],
  },

  /**
   * The classic bell partials, and the tierce is the point.
   *
   * A cast bell is tuned to hum, prime, tierce, quint and nominal — and the
   * tierce is a MINOR third above the prime. That interval is why a bell sounds
   * like a bell and slightly sorrowful with it, and the old shared bowl ratios
   * had nothing at all in that region, which is exactly why `struck-bell` came
   * out as a high bowl.
   *
   * Ratios are against the nominal, which is the note named above. The hum two
   * octaves under it is the long one — it is still going when everything
   * brighter has gone.
   *
   * THE FIVE TUNED PARTIALS ALONE ARE A CHORD, NOT A BELL.
   * The previous set stopped just above the nominal and gave the five named
   * partials near-equal weight and long tails. A second after the strike you
   * were left holding a C minor triad at even level, and holding it for
   * seconds, which is a pad and not a bell. Two things fix it and both are
   * true of any cast bell:
   *
   * The clang. Above the nominal a real bell has a crowd of partials that are
   * loud, inharmonic and gone inside a second — deciem, undecime, duodecime and
   * whatever else the casting left behind. That crowd is the strike. Without
   * it the attack has no metal in it and every named partial has to be turned
   * up to compensate, which is what put the chord in the foreground.
   *
   * The tail. Once the clang has gone what is left is hum, prime and nominal;
   * the tierce is what makes the first second sorrowful and it is not supposed
   * to still be there at five. Its decay is now well under the prime's, so the
   * chord resolves into an octave instead of sitting there.
   *
   * The tuned partials are also a few cents off exact. At 0.25 / 0.5 / 0.75 / 1
   * the hum, prime, quint and nominal are harmonics 1, 2, 3 and 4 of the hum
   * exactly, and four exact harmonics fuse into one tone — an organ stop with
   * a minor third bolted on. A real bell is never that well cast.
   */
  'struck-bell': {
    label: 'Struck bell',
    fundamental: 523,
    decay: 13,
    // A hard clapper: the shortest and brightest contact of the three.
    strike: { duration: 0.022, hz: 3200, gain: 0.13 },
    modes: [
      { ratio: 0.2503, gain: 0.5, decay: 1, beat: 0.25 }, // hum
      { ratio: 0.501, gain: 0.68, decay: 0.72, beat: 0.5 }, // prime
      { ratio: 0.598, gain: 0.46, decay: 0.4, beat: 0.8 }, // tierce — the minor third
      { ratio: 0.752, gain: 0.28, decay: 0.3 }, // quint
      { ratio: 1, gain: 0.95, decay: 0.44, beat: 1.1 }, // nominal — the note
      { ratio: 1.253, gain: 0.34, decay: 0.15 }, // deciem ─┐
      { ratio: 1.338, gain: 0.3, decay: 0.12 }, // undecime │ the clang, and it
      { ratio: 1.51, gain: 0.26, decay: 0.09 }, // duodecime│ is gone in a second
      { ratio: 2.01, gain: 0.2, decay: 0.065 }, // double octave
      { ratio: 2.66, gain: 0.14, decay: 0.045 }, //         │
      { ratio: 3.37, gain: 0.09, decay: 0.03 }, //          │
      { ratio: 4.22, gain: 0.06, decay: 0.02 }, // ─────────┘
    ],
  },
};

/**
 * What every bell's modes sum to before the master gain.
 *
 * 0.9 is what the old four-partial set happened to add up to, so the bells stay
 * at the level they have always been at and nobody's stored master fader means
 * something different after this change. The mallet rides on top of it and is
 * small enough not to matter; sines started together do not peak together
 * anyway, so the real maximum is well under this.
 *
 * WHAT IT PINS IS THE PEAK, WHICH IS NOT THE LOUDNESS.
 * Splitting a fixed peak across more partials, or across partials that die
 * sooner, leaves less of it in the tail — and the tail is what a bell is heard
 * as. The gong and the struck bell each gained modes when their tables were
 * rewritten and each came out roughly one to two decibels quieter through the
 * body of the sound, with the peak unmoved. That is small enough to leave, and
 * it is not something the gains can be turned up to fix, because this line
 * divides any such rise straight back out again. Worth knowing before adding a
 * fourth bell and wondering why it sits under the other three.
 */
const PEAK = 0.9;

function strike(
  context: AudioContext,
  when: number,
  gainNode: GainNode,
  kind: BellKind,
  decayScale = 1,
) {
  const bell = BELLS[kind];
  const decay = bell.decay * decayScale;

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
 * The opening bell's tail, as a fraction of the closing bell's.
 *
 * The closing bell is long — 18 to 22 seconds — because the end of a sitting is
 * not the moment the sound stops, and that tail is what fills the half minute
 * of coming back. The opening bell is doing the opposite job. It marks the
 * threshold and then gets out of the way, because what follows it is the
 * sitting, and a bowl still ringing two minutes in is no longer a beginning,
 * it is company.
 */
const OPENING_DECAY = 0.6;

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
export function previewBell(kind: BellKind = DEFAULT_BELL): void {
  scheduleBell(0, kind, 0.32);
}
