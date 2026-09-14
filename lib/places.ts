import { ORIGIN_MAX } from './label.ts';

/**
 * Finding a place from the first few letters of it.
 *
 * The origin question is answered by typing and then choosing, so what is
 * kept is a real place spelled one way, rather than "lisbon", "Lisboa" and
 * "lisbon portugal" as three different people. The list is GeoNames'
 * places of 15,000 people or more (`scripts/places.mjs` builds it into
 * `public/places.txt`); the search runs where the list is, in the browser,
 * so nothing typed is sent anywhere.
 *
 * Pure, and tested. The country names are passed in rather than looked up,
 * so this file needs no `Intl` of its own and the tests need no locale.
 */

export interface Place {
  /** Null when the answer is a whole country. */
  city: string | null;
  country: string;
  /** What is kept and shown: "Lisbon, Portugal", or "Lisbon" when that would be too long. */
  label: string;
}

interface Row {
  name: string;
  country: string;
  key: string;
  countryKey: string;
  code: string;
}

export interface PlaceIndex {
  cities: Row[];
  countries: Row[];
}

/**
 * Lower case, accents off, punctuation to spaces: "São Paulo" and "sao
 * paulo" are the same search, and so are "Saint-Denis" and "saint denis".
 */
export function foldPlace(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** `public/places.txt`: "name<TAB>CC" per line, largest first; `#` lines are notes. */
export function parsePlaces(text: string): { name: string; code: string }[] {
  const out: { name: string; code: string }[] = [];
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [name, code] = line.split('\t');
    if (name && code) out.push({ name, code });
  }
  return out;
}

/**
 * Folded once, searched on every key. `countryName` turns "PT" into
 * "Portugal"; a code it cannot name is used as it stands.
 */
export function buildIndex(
  rows: readonly { name: string; code: string }[],
  countryName: (code: string) => string | null,
): PlaceIndex {
  const names = new Map<string, string>();
  const nameOf = (code: string) => {
    let n = names.get(code);
    if (n === undefined) {
      n = countryName(code) || code;
      names.set(code, n);
    }
    return n;
  };
  const cities = rows.map((r) => {
    const country = nameOf(r.code);
    return {
      name: r.name,
      country,
      key: foldPlace(r.name),
      countryKey: foldPlace(country),
      code: r.code,
    };
  });
  const countries = [...names.entries()].map(([code, country]) => ({
    name: country,
    country,
    key: foldPlace(country),
    countryKey: foldPlace(country),
    code,
  }));
  return { cities, countries };
}

/** "Lisbon, Portugal", unless that is longer than an origin may be. */
export function placeLabel(city: string | null, country: string): string {
  if (!city) return country;
  const both = `${city}, ${country}`;
  return Array.from(both).length <= ORIGIN_MAX ? both : city;
}

/** 0 the whole name, 1 the start of it, 2 the start of a later word, null not at all. */
function rank(key: string, q: string): 0 | 1 | 2 | null {
  if (key === q) return 0;
  if (key.startsWith(q)) return 1;
  if (` ${key}`.includes(` ${q}`)) return 2;
  return null;
}

/**
 * The best few places for what has been typed so far.
 *
 * Everything before a comma is the place and everything after it narrows
 * the country, so "paris, us" is the one in Texas. Whole-name matches come
 * first, then names that begin with the letters, then names with a later
 * word that does; a country comes before a town at the same rank, and
 * otherwise the larger place does, because the list is in that order.
 */
export function searchPlaces(index: PlaceIndex, query: string, limit = 6): Place[] {
  const [head, ...rest] = query.split(',');
  const q = foldPlace(head ?? '');
  const within = foldPlace(rest.join(' '));
  if (!q) return [];

  const inCountry = (r: Row) =>
    !within || r.countryKey.startsWith(within) || r.code.toLowerCase() === within;

  const tiers: [Place[], Place[], Place[]] = [[], [], []];
  const push = (tier: 0 | 1 | 2, place: Place) => {
    if (tiers[tier].length < limit) tiers[tier].push(place);
  };

  if (!within) {
    for (const c of index.countries) {
      const t = rank(c.key, q);
      if (t !== null) push(t, { city: null, country: c.country, label: c.country });
    }
  }
  for (const r of index.cities) {
    const t = rank(r.key, q);
    if (t === null || !inCountry(r)) continue;
    push(t, { city: r.name, country: r.country, label: placeLabel(r.name, r.country) });
    if (tiers[0].length >= limit) break;
  }

  const seen = new Set<string>();
  const out: Place[] = [];
  for (const place of tiers.flat()) {
    if (seen.has(place.label)) continue;
    seen.add(place.label);
    out.push(place);
    if (out.length === limit) break;
  }
  return out;
}
