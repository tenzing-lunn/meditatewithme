/**
 * Two ways of saying a thing that three components used to say separately.
 *
 * `sentenceList` was pasted whole, doc-comment included, into Home and the
 * flow; `localTime` existed in Home and the room with different signatures.
 * Neither is worth a file on its own, and both are pure: no DOM, no I/O, only
 * the visitor's locale, which React Native has too.
 */

/** "rain", "rain and wind", "rain, wind and night" */
export function sentenceList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** "1:00 PM" or "13:00", whichever the visitor's locale says. */
export function localTime(d: Date | number): string {
  return new Date(d).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}
