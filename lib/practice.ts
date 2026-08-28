/**
 * The practice log.
 *
 * Pure — no React, no I/O, no Date.now(). Callers pass the time in, which is
 * what makes streaks testable without waiting a day.
 *
 * WHY DAYS ARE LOCAL AND SESSIONS ARE UTC
 * The candle is anchored to UTC because it has to be the same candle for
 * everyone on earth at once. A streak is the opposite kind of fact: it is
 * entirely yours, and "did I sit today" means today where you are standing. A
 * streak computed in UTC would break at 1am for anyone west of Greenwich and
 * silently gain a day for anyone east of it.
 *
 * So every day boundary here comes from the viewer's own clock, via calendar
 * fields rather than millisecond arithmetic. Subtracting 86,400,000 to get
 * "yesterday" lands on the same local day twice a year, in the countries that
 * observe DST, which is exactly the sort of bug that surfaces once in October
 * and is impossible to reproduce in April.
 */

export interface PracticeEntry {
  /** Client-generated. Also the primary key in Postgres, which makes syncing
   *  idempotent: pushing the same sitting twice is a no-op, not a duplicate. */
  id: string;
  /** Wall-clock milliseconds when the sitting began. */
  startedAt: number;
  /** Minutes actually sat. */
  minutes: number;
  /** Whether it ran all the way to the bell. */
  completed: boolean;
}

/** Below this, it was a mis-tap rather than a sitting. */
export const MIN_LOGGED_SECONDS = 60;

/**
 * Keep the local log bounded. At one sitting a day this is about three years,
 * and the database keeps everything regardless — this only caps what one
 * browser holds.
 */
export const MAX_LOCAL_ENTRIES = 1000;

/** Local calendar day, as YYYY-MM-DD. */
export function localDayKey(atMs: number): string {
  const d = new Date(atMs);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Midnight at the start of the local day containing `atMs`. */
export function startOfLocalDay(atMs: number): Date {
  const d = new Date(atMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * The day before, by calendar fields.
 *
 * `new Date(y, m, d - 1)` normalises month and year rollover itself, and
 * because it is constructed from local fields it lands on the right day across
 * a DST change. Millisecond subtraction does not.
 */
export function previousLocalDay(day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1);
}

function daysWithSittings(entries: PracticeEntry[]): Set<string> {
  return new Set(entries.map((e) => localDayKey(e.startedAt)));
}

/**
 * Consecutive days sat, counting back from today.
 *
 * NOT SITTING YET TODAY DOES NOT BREAK A STREAK. If you sat yesterday and it is
 * now nine in the morning, your streak is intact — you simply have not used
 * today yet. Showing a proud streak collapse to zero overnight, every night,
 * would punish people for the hours they were asleep, and this is a meditation
 * site rather than a productivity tracker.
 *
 * The streak only ends once a whole day has passed with nothing in it.
 */
export function currentStreak(entries: PracticeEntry[], nowMs: number): number {
  const days = daysWithSittings(entries);
  if (days.size === 0) return 0;

  let cursor = startOfLocalDay(nowMs);

  // Today may legitimately be empty; yesterday may not.
  if (!days.has(localDayKey(cursor.getTime()))) {
    cursor = previousLocalDay(cursor);
    if (!days.has(localDayKey(cursor.getTime()))) return 0;
  }

  let streak = 0;
  while (days.has(localDayKey(cursor.getTime()))) {
    streak++;
    cursor = previousLocalDay(cursor);
  }
  return streak;
}

/** The best run there has ever been. */
export function longestStreak(entries: PracticeEntry[]): number {
  const days = [...daysWithSittings(entries)].sort();
  if (days.length === 0) return 0;

  let best = 1;
  let run = 1;

  for (let i = 1; i < days.length; i++) {
    // Is days[i] exactly one day after days[i - 1]? Ask the calendar, not the
    // string — 2026-03-01 follows 2026-02-28 only in some years.
    const previous = new Date(`${days[i - 1]}T00:00:00`);
    const expected = new Date(
      previous.getFullYear(),
      previous.getMonth(),
      previous.getDate() + 1,
    );
    run = localDayKey(expected.getTime()) === days[i] ? run + 1 : 1;
    if (run > best) best = run;
  }

  return best;
}

export interface PracticeSummary {
  sittings: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  /** Local day keys that have at least one sitting. */
  daysPractised: number;
}

export function summarise(
  entries: PracticeEntry[],
  nowMs: number,
): PracticeSummary {
  return {
    sittings: entries.length,
    totalMinutes: entries.reduce((sum, e) => sum + e.minutes, 0),
    currentStreak: currentStreak(entries, nowMs),
    longestStreak: longestStreak(entries),
    daysPractised: daysWithSittings(entries).size,
  };
}

export interface PracticeDay {
  key: string;
  /** Minutes sat that day. Zero means the day is in range but empty. */
  minutes: number;
}

/**
 * The last `days` local days, oldest first, including empty ones.
 *
 * Empty days are the point. A grid with the gaps left in is what makes
 * consistency legible at a glance; a list of only the days you turned up
 * flatters you and answers a different question.
 */
export function recentDays(
  entries: PracticeEntry[],
  nowMs: number,
  days: number,
): PracticeDay[] {
  const minutesByDay = new Map<string, number>();
  for (const e of entries) {
    const key = localDayKey(e.startedAt);
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + e.minutes);
  }

  const out: PracticeDay[] = [];
  let cursor = startOfLocalDay(nowMs);

  for (let i = 0; i < days; i++) {
    const key = localDayKey(cursor.getTime());
    out.push({ key, minutes: minutesByDay.get(key) ?? 0 });
    cursor = previousLocalDay(cursor);
  }

  return out.reverse();
}

/** Newest first, de-duplicated by id, capped. The canonical local ordering. */
export function normaliseEntries(entries: PracticeEntry[]): PracticeEntry[] {
  const byId = new Map<string, PracticeEntry>();
  for (const e of entries) byId.set(e.id, e);
  return [...byId.values()]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, MAX_LOCAL_ENTRIES);
}

/**
 * Union of two logs.
 *
 * Sittings are append-only facts, so there is no conflict to resolve and no
 * last-write-wins rule to get wrong: a sitting that exists on either side
 * happened. This is why the log syncs more simply than preferences do.
 */
export function mergeEntries(
  a: PracticeEntry[],
  b: PracticeEntry[],
): PracticeEntry[] {
  return normaliseEntries([...a, ...b]);
}

/** Coerce anything at all into a valid log. Same contract as normalize(). */
export function parseEntries(raw: unknown): PracticeEntry[] {
  if (!Array.isArray(raw)) return [];

  const clean: PracticeEntry[] = [];
  for (const v of raw) {
    if (!v || typeof v !== 'object') continue;
    const e = v as Partial<PracticeEntry>;
    const startedAt = Number(e.startedAt);
    const minutes = Number(e.minutes);
    if (typeof e.id !== 'string' || !e.id) continue;
    if (!Number.isFinite(startedAt) || startedAt <= 0) continue;
    if (!Number.isFinite(minutes) || minutes < 1) continue;
    clean.push({
      id: e.id,
      startedAt,
      minutes: Math.min(600, Math.round(minutes)),
      completed: e.completed !== false,
    });
  }

  return normaliseEntries(clean);
}

/** "4 hours 20 minutes", "45 minutes", "1 hour". */
export function humanMinutes(total: number): string {
  if (total < 60) return `${total} minute${total === 1 ? '' : 's'}`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const h = `${hours} hour${hours === 1 ? '' : 's'}`;
  return minutes === 0 ? h : `${h} ${minutes} minute${minutes === 1 ? '' : 's'}`;
}
