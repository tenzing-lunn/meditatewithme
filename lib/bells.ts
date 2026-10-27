/**
 * The bells, as data: what each one is made of, for the site's Web Audio
 * (`components/audio.ts`) and the iPhone app's (`mobile/audio.ts`) to strike
 * the same way. Moved here from `components/audio.ts` on 6 October 2026 when
 * the app's sitting went native, so a change to a bell is one change.
 *
 * Pure data, no audio: whoever plays them owns the context.
 */
import { DRUM_SOURCE } from './beds.ts';
import type { BellKind } from './types.ts';

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
export interface Mode {
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
export interface Strike {
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
export interface SynthBell {
  label: string;
  fundamental: number;
  decay: number;
  strike: Strike;
  modes: readonly Mode[];
}

/**
 * A bell that is a recording. `decay` is its length in seconds, and it plays
 * through `strike()` on the same schedule as the synthesised ones, so the
 * opening bell, the ending and the preview treat it identically.
 */
export interface RecordedBell {
  label: string;
  decay: number;
  recording: string;
}

export const BELLS: Record<BellKind, SynthBell | RecordedBell> = {
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
   * A steel tongue drum, a recording (CC0, see `DRUM_SOURCE` in lib/beds.ts).
   * It replaced the synthesised gong on 29 September 2026 at Tenzing's ask;
   * the key stays `gong` because it is stored in preferences and in a CHECK
   * constraint. A run of notes and then a long ring, about twenty-seven
   * seconds in all.
   */
  gong: {
    label: 'Tongue drum',
    decay: DRUM_SOURCE.seconds,
    recording: '/sounds/drum.mp3',
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
export const PEAK = 0.9;

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
export const OPENING_DECAY = 0.6;
