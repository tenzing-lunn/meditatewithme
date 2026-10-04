// Where you are sitting: the site's town list and the connection's guess,
// fetched from the site itself (`public/places.txt`, `/api/origin`) so the
// app searches the same 33,000 places the site does and offers the same
// *near you*. The search runs on the phone (`lib/places.ts`); the letters
// typed are not sent anywhere.
import { buildIndex, parsePlaces, type PlaceIndex } from '../lib/places';
import { SITE } from './auth';

/** "PT" to "Portugal", in English like the rest of the site. */
export function regionName(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

let index: Promise<PlaceIndex | null> | null = null;

/** One fetch per launch, about 230KB, started when the question is near. */
export function loadPlaces(): Promise<PlaceIndex | null> {
  index ??= (async () => {
    try {
      const res = await fetch(`${SITE}places.txt`);
      if (!res.ok) return null;
      return buildIndex(parsePlaces(await res.text()), regionName);
    } catch {
      return null;
    }
  })().then((i) => {
    if (!i) index = null; // Try again next time it is asked for.
    return i;
  });
  return index;
}

/** "Lisbon, Portugal" from the connection, or null when it cannot say. */
export async function loadSuggestion(): Promise<string | null> {
  try {
    const res = await fetch(`${SITE}api/origin`, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as { city?: unknown; country?: unknown };
    const city = typeof body.city === 'string' ? body.city : null;
    const country = regionName(typeof body.country === 'string' ? body.country : null);
    return [city, country].filter(Boolean).join(', ') || null;
  } catch {
    return null;
  }
}
