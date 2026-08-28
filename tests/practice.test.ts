import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  currentStreak,
  longestStreak,
  localDayKey,
  previousLocalDay,
  recentDays,
  summarise,
  mergeEntries,
  normaliseEntries,
  parseEntries,
  humanMinutes,
  MAX_LOCAL_ENTRIES,
  type PracticeEntry,
} from '../lib/practice.ts';

/**
 * Entries are built from LOCAL wall-clock times on purpose: a streak is a fact
 * about the viewer's calendar, so the tests have to speak the same language the
 * implementation does. `new Date(y, m, d, h)` is local by definition, which
 * keeps these tests correct in whatever timezone they happen to run.
 */
let counter = 0;
const sat = (
  y: number,
  m: number,
  d: number,
  hour = 9,
  minutes = 20,
): PracticeEntry => ({
  id: `e${counter++}`,
  startedAt: new Date(y, m - 1, d, hour).getTime(),
  minutes,
  completed: true,
});

const noon = (y: number, m: number, d: number) =>
  new Date(y, m - 1, d, 12).getTime();

describe('localDayKey', () => {
  test('is the local calendar day, not the UTC one', () => {
    // 11pm local on the 3rd is the 4th in UTC for anywhere west of Greenwich.
    // The key must say the 3rd, because that is the day the person sat.
    assert.equal(localDayKey(new Date(2026, 7, 3, 23, 30).getTime()), '2026-08-03');
    assert.equal(localDayKey(new Date(2026, 7, 3, 0, 30).getTime()), '2026-08-03');
  });

  test('pads month and day', () => {
    assert.equal(localDayKey(new Date(2026, 0, 5, 12).getTime()), '2026-01-05');
  });
});

describe('previousLocalDay', () => {
  test('walks back across a month boundary', () => {
    const d = previousLocalDay(new Date(2026, 2, 1));
    assert.equal(localDayKey(d.getTime()), '2026-02-28');
  });

  test('walks back across a year boundary', () => {
    const d = previousLocalDay(new Date(2026, 0, 1));
    assert.equal(localDayKey(d.getTime()), '2025-12-31');
  });

  test('walks back across a leap day', () => {
    const d = previousLocalDay(new Date(2028, 2, 1));
    assert.equal(localDayKey(d.getTime()), '2028-02-29');
  });

  test('never lands on the same day twice, all year', () => {
    // This is the DST bug: subtracting 86,400,000ms from 1am on the day the
    // clocks go back gives you the SAME local day again, so a streak would
    // count one day twice and then stop.
    let cursor = new Date(2026, 0, 1, 1, 0);
    for (let i = 0; i < 400; i++) {
      const next = previousLocalDay(cursor);
      assert.notEqual(
        localDayKey(next.getTime()),
        localDayKey(cursor.getTime()),
        `repeated ${localDayKey(cursor.getTime())}`,
      );
      cursor = next;
    }
  });
});

describe('currentStreak', () => {
  test('counts consecutive days ending today', () => {
    const entries = [sat(2026, 8, 25), sat(2026, 8, 26), sat(2026, 8, 27)];
    assert.equal(currentStreak(entries, noon(2026, 8, 27)), 3);
  });

  test('an empty today does NOT break the streak', () => {
    // Nine in the morning, sat yesterday, not yet today. The streak stands —
    // the day is not over. Zeroing it here would punish people for sleeping.
    const entries = [sat(2026, 8, 25), sat(2026, 8, 26)];
    assert.equal(currentStreak(entries, new Date(2026, 7, 27, 9).getTime()), 2);
  });

  test('a whole missed day does break it', () => {
    const entries = [sat(2026, 8, 24), sat(2026, 8, 25)];
    assert.equal(currentStreak(entries, noon(2026, 8, 27)), 0);
  });

  test('two sittings in one day count as one day', () => {
    const entries = [sat(2026, 8, 27, 8), sat(2026, 8, 27, 20)];
    assert.equal(currentStreak(entries, noon(2026, 8, 27)), 1);
  });

  test('is zero with no history', () => {
    assert.equal(currentStreak([], noon(2026, 8, 27)), 0);
  });

  test('survives a run across a month boundary', () => {
    const entries = [sat(2026, 7, 30), sat(2026, 7, 31), sat(2026, 8, 1)];
    assert.equal(currentStreak(entries, noon(2026, 8, 1)), 3);
  });

  test('ignores entries dated in the future', () => {
    const entries = [sat(2026, 8, 27), sat(2026, 9, 15)];
    assert.equal(currentStreak(entries, noon(2026, 8, 27)), 1);
  });
});

describe('longestStreak', () => {
  test('finds the best run, not the current one', () => {
    const entries = [
      sat(2026, 8, 1), sat(2026, 8, 2), sat(2026, 8, 3), sat(2026, 8, 4),
      sat(2026, 8, 20),
    ];
    assert.equal(longestStreak(entries), 4);
  });

  test('handles a single sitting', () => {
    assert.equal(longestStreak([sat(2026, 8, 1)]), 1);
  });

  test('is zero with no history', () => {
    assert.equal(longestStreak([]), 0);
  });

  test('a run spanning a month boundary is not broken by the date string', () => {
    // Lexically '2026-08-01' does not follow '2026-07-31'; by the calendar it
    // does. Comparing strings would report two runs of one.
    const entries = [sat(2026, 7, 30), sat(2026, 7, 31), sat(2026, 8, 1)];
    assert.equal(longestStreak(entries), 3);
  });
});

describe('recentDays', () => {
  test('returns the window oldest first, including empty days', () => {
    const days = recentDays([sat(2026, 8, 27)], noon(2026, 8, 27), 7);
    assert.equal(days.length, 7);
    assert.equal(days[0]!.key, '2026-08-21');
    assert.equal(days[6]!.key, '2026-08-27');
    assert.equal(days[6]!.minutes, 20);
    // The gaps are the whole point of the grid.
    assert.equal(days[0]!.minutes, 0);
  });

  test('sums multiple sittings on the same day', () => {
    const entries = [sat(2026, 8, 27, 8, 15), sat(2026, 8, 27, 20, 30)];
    const days = recentDays(entries, noon(2026, 8, 27), 3);
    assert.equal(days[2]!.minutes, 45);
  });
});

describe('summarise', () => {
  test('totals sittings, minutes and days', () => {
    const entries = [
      sat(2026, 8, 26, 9, 10),
      sat(2026, 8, 27, 9, 20),
      sat(2026, 8, 27, 21, 30),
    ];
    const s = summarise(entries, noon(2026, 8, 27));
    assert.equal(s.sittings, 3);
    assert.equal(s.totalMinutes, 60);
    assert.equal(s.daysPractised, 2);
    assert.equal(s.currentStreak, 2);
  });
});

describe('normaliseEntries and mergeEntries', () => {
  test('de-duplicates by id, so syncing twice is a no-op', () => {
    const e = sat(2026, 8, 27);
    assert.equal(normaliseEntries([e, e, e]).length, 1);
  });

  test('a union of local and server keeps everything once', () => {
    const a = sat(2026, 8, 26);
    const b = sat(2026, 8, 27);
    const merged = mergeEntries([a, b], [b]);
    assert.equal(merged.length, 2);
  });

  test('orders newest first', () => {
    const older = sat(2026, 8, 20);
    const newer = sat(2026, 8, 27);
    assert.deepEqual(normaliseEntries([older, newer]).map((e) => e.id), [
      newer.id,
      older.id,
    ]);
  });

  test('caps what one browser holds', () => {
    const many = Array.from({ length: MAX_LOCAL_ENTRIES + 50 }, (_, i) =>
      sat(2026, 1, 1, 9, 10 + (i % 5)),
    ).map((e, i) => ({ ...e, startedAt: e.startedAt + i * 1000 }));
    assert.equal(normaliseEntries(many).length, MAX_LOCAL_ENTRIES);
  });
});

describe('parseEntries', () => {
  test('discards junk without discarding the good rows', () => {
    const parsed = parseEntries([
      { id: 'ok', startedAt: noon(2026, 8, 27), minutes: 20, completed: true },
      { id: '', startedAt: 1, minutes: 5 },
      { startedAt: 1, minutes: 5 },
      { id: 'bad-minutes', startedAt: noon(2026, 8, 27), minutes: 'ten' },
      null,
      'nonsense',
    ]);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]!.id, 'ok');
  });

  test('returns an empty log for anything that is not an array', () => {
    for (const junk of [null, undefined, 42, {}, 'x']) {
      assert.deepEqual(parseEntries(junk), []);
    }
  });

  test('clamps an absurd duration rather than trusting it', () => {
    const parsed = parseEntries([
      { id: 'a', startedAt: noon(2026, 8, 27), minutes: 99999 },
    ]);
    assert.equal(parsed[0]!.minutes, 600);
  });
});

describe('humanMinutes', () => {
  test('reads the way a person would say it', () => {
    assert.equal(humanMinutes(1), '1 minute');
    assert.equal(humanMinutes(45), '45 minutes');
    assert.equal(humanMinutes(60), '1 hour');
    assert.equal(humanMinutes(90), '1 hour 30 minutes');
    assert.equal(humanMinutes(260), '4 hours 20 minutes');
    assert.equal(humanMinutes(120), '2 hours');
  });
});
