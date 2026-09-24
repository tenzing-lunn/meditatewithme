import type { TrackSlug } from './types.ts';

/**
 * Where each bed's sound comes from, and which stretch of it is the loop.
 *
 * Real recordings since 23 September 2026, replacing the synthesised
 * stand-ins: Tenzing listened to those and they were not good enough. All
 * of them are CC0 on Freesound — public domain, so they can sit on a public,
 * commercial site with no payment and no credit owed. The recordists are
 * credited here anyway, and the list is Jonny's to change: these were
 * chosen by Claude and approved by Tenzing, and Jonny has not heard them.
 *
 * Data only, shared by `components/mix.ts`, which needs the loop length, and
 * `scripts/build-sounds.mjs`, which cuts the files in `public/sounds/` from
 * the originals. Change a stretch here and rebuild; the two cannot disagree.
 */
export interface BedSource {
  slug: TrackSlug;
  freesoundId: number;
  title: string;
  author: string;
  /** Seconds into the recording where the loop starts. */
  start: number;
  /**
   * Seconds of loop, a multiple of 3. The file holds this plus padding; see
   * PAD_SECONDS. Three seconds at 48 kHz is exactly 125 MP3 frames, so both
   * loop points fall at the same place in a frame and the encoder treats
   * the audio either side of them identically. Any other length left the
   * two sides differently compressed — a faint tick once a loop.
   */
  loop: number;
}

/**
 * Each file carries this much of its own loop again at either end, so the
 * browser loops between two points inside the file rather than at its
 * edges. An MP3 decodes with a few milliseconds of silence at the front
 * that no two browsers agree on; looping inside the padding makes that
 * irrelevant, because the audio on either side of both loop points is the
 * same audio.
 */
export const PAD_SECONDS = 1;

/** The tail folded over the head so the loop has no seam. */
export const CROSSFADE_SECONDS = 3;

export const BED_SOURCES: readonly BedSource[] = [
  {
    slug: 'rain',
    freesoundId: 200273,
    title: 'Rain light 2 (rural)',
    author: 'jmbphilmes',
    start: 2,
    loop: 87,
  },
  {
    slug: 'wind',
    freesoundId: 711106,
    title: 'Wind on bushes with muffled gust of wind',
    author: 'felix.blume',
    start: 1,
    loop: 108,
  },
  {
    slug: 'waterfall',
    freesoundId: 321886,
    title: 'Waterfall',
    author: 'nsmusic',
    start: 0.5,
    loop: 60,
  },
  {
    // Replaced 23 September 2026: the Baltic recording sounded like being
    // on a boat. This is waves breaking softly and washing up sand.
    slug: 'ocean',
    freesoundId: 470648,
    title: 'Waves On The Beach (Sand Wash)',
    author: 'ralph.whitehead',
    start: 51,
    loop: 108,
  },
  {
    slug: 'fire',
    freesoundId: 138018,
    title: 'fireplace',
    author: 'martats',
    start: 5,
    loop: 108,
  },
  {
    // Replaced 23 September 2026: the tanpura read as "some alien noise".
    // A warm, low (about 110 Hz), almost motionless pad instead.
    slug: 'hum',
    freesoundId: 854842,
    title: 'Warm Pad Essentials Drone',
    author: 'bassimat (Mantice)',
    start: 72,
    loop: 108,
  },
  {
    slug: 'chimes',
    freesoundId: 437337,
    title: 'Wind chimes 1',
    author: 'giddster',
    start: 0.5,
    loop: 84,
  },
  {
    // Added 23 September 2026: a gong left ringing, from a real gong bath.
    // 39:47 to 41:35 is the steadiest sustained stretch of the 48 minutes,
    // the rolled gong moving about a decibel either way, no strikes.
    slug: 'gong',
    freesoundId: 449923,
    title: 'Gong Bath',
    author: 'jonsept',
    start: 2387,
    loop: 108,
  },
  {
    // Starts at 0:25, as omarchy-ambient's cut does: the first seconds
    // carry handling noise, and an engine passes at 4:40.
    slug: 'night',
    freesoundId: 476672,
    title: 'Crickets (close recording)',
    author: 'felix.blume',
    start: 25,
    loop: 108,
  },
];
