/**
 * A name and an origin, cleaned.
 *
 * "Ana from Lisbon is meditating with you" is the one sentence on this site
 * that shows a stranger's words to another stranger. The words are optional,
 * shared only while a person sits with others and only while they have said
 * so, and they are cleaned here, on the way into storage and on the way
 * into a heartbeat, so nothing but letters and spaces ever reaches a
 * screen. Pure, and tested; the route handler and the hooks both use it.
 */

export const NAME_MAX = 24;
export const ORIGIN_MAX = 32;
export const LABEL_MAX = 60;

/**
 * Code points that should never be typed into a name: C0 and C1 controls,
 * zero-width and bidi marks, and the byte-order mark. Written as ranges so
 * that no invisible character has to exist in this file.
 */
const STRIPPED: readonly [number, number][] = [
  [0x0000, 0x001f],
  [0x007f, 0x009f],
  [0x200b, 0x200f],
  [0x2028, 0x202e],
  [0x2060, 0x2064],
  [0xfeff, 0xfeff],
];

const stripped = (ch: string) => {
  const cp = ch.codePointAt(0) ?? 0;
  return STRIPPED.some(([lo, hi]) => cp >= lo && cp <= hi);
};

/**
 * Trim, normalise, strip what should never be typed, collapse whitespace,
 * and cap by code points so an emoji is one character and not two. Null
 * for anything that is not a string or is empty once cleaned.
 */
export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const kept = Array.from(v.normalize('NFC')).filter((ch) => !stripped(ch));
  const s = kept.join('').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  const chars = Array.from(s);
  if (chars.length <= max) return s;
  const cut = chars.slice(0, max).join('').trim();
  return cut || null;
}

/** "Ana from Lisbon", "Ana", "Someone from Lisbon", or nothing at all. */
export function composeLabel(
  name: string | null,
  origin: string | null,
): string | null {
  const n = cleanText(name, NAME_MAX);
  const o = cleanText(origin, ORIGIN_MAX);
  if (n && o) return cleanText(`${n} from ${o}`, LABEL_MAX);
  if (n) return n;
  if (o) return cleanText(`Someone from ${o}`, LABEL_MAX);
  return null;
}

export interface Profile {
  name: string | null;
  origin: string | null;
  /** Null until asked. True: show the label to others while sitting together. */
  share: boolean | null;
}

export const EMPTY_PROFILE: Profile = { name: null, origin: null, share: null };

/** From localStorage or a `profiles` row; anything malformed becomes empty. */
export function normalizeProfile(v: unknown): Profile {
  if (!v || typeof v !== 'object') return EMPTY_PROFILE;
  const o = v as Record<string, unknown>;
  return {
    name: cleanText(o.name, NAME_MAX),
    origin: cleanText(o.origin, ORIGIN_MAX),
    share: typeof o.share === 'boolean' ? o.share : null,
  };
}
