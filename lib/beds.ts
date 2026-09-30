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
  /**
   * Absent means CC0. Anything else must be credited where a visitor can
   * read it, which is `app/credits/page.tsx`, built from this list.
   */
  license?: 'CC BY 4.0';
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
    // Replaced 29 September 2026 (Tenzing's own download): a small creek in
    // place of the Estonian waterfall. The slug stays `waterfall`, because it
    // is stored in people's preferences; only the label and the words say
    // creek. The recording is very quiet at source (about -48 dB RMS), so the
    // build raises it about 28 dB and its hiss with it.
    slug: 'waterfall',
    freesoundId: 872280,
    title: '260816_113717_FR_Small-creek_in_nature',
    author: 'kevp888',
    license: 'CC BY 4.0',
    start: 416,
    loop: 108,
  },
  {
    // Replaced 23 September 2026: the Baltic recording sounded like being
    // on a boat. This was waves breaking softly and washing up sand.
    // Replaced again 29 September 2026 with long rolling swells (CC0).
    slug: 'ocean',
    freesoundId: 867643,
    title: 'Rolling Ocean Waves – Long Relaxing Swells',
    author: 'bassimat',
    start: 33,
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
    // Added 23 September 2026: a singing bowl played round the rim the whole
    // way, so it sings on without a strike or a decay, the length of the
    // sitting. The steadiest of five long bowl recordings measured.
    slug: 'bowl',
    freesoundId: 573805,
    title: 'Singing Bowl, long without reverb',
    author: 'hollandm',
    start: 7,
    loop: 108,
  },
  {
    // Replaced 29 September 2026: the crickets gave way to a park at 8:53 in
    // the evening, birds and insects. The slug stays `night` (stored in
    // preferences); the label says evening.
    slug: 'night',
    freesoundId: 872374,
    title: 'birds insects - park estate De Pettelaar - Sint Michielsgestel Netherlands 853 pm 250621_1147',
    author: 'klankbeeld',
    license: 'CC BY 4.0',
    start: 83,
    loop: 108,
  },
];

/**
 * The one recorded bell: a steel tongue drum, in place of the synthesised
 * gong since 29 September 2026. The bell's key stays `gong` — it is stored in
 * preferences and in a CHECK constraint — while its label says what it is.
 * CC0. `scripts/build-sounds.mjs` cuts `public/sounds/drum.mp3` from it: the
 * first `seconds` of the recording, peak-matched, its last seconds faded.
 */
export const DRUM_SOURCE = {
  freesoundId: 868787,
  title: 'Steel_Tongue_Drum_SFX_05-2',
  author: 'SignatureSoundsOrg',
  /** The recording is 44.7 s but has gone silent by 27.9 s; keep the ring, drop the rest. */
  seconds: 27,
} as const;
