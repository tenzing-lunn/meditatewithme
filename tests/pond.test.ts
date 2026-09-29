import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  breathTimes,
  breathsAt,
  flickConfig,
  ringsAt,
  skimAt,
  skimConfig,
  touchRings,
  touchTimes,
  trainAt,
  type Train,
} from '../lib/pond.ts';

describe('skimAt', () => {
  const c = skimConfig({ x: 100, y: 800 }, { x: 720, y: 400 }, 1440, 900);

  test('leaves the hand and stops where it was thrown to', () => {
    const start = skimAt(0, c).stone;
    assert.ok(Math.abs(start.x - 100) < 1e-9 && Math.abs(start.y - 800) < 1e-9);
    const end = skimAt(c.T, c).stone;
    assert.ok(Math.abs(end.x - 720) < 1e-6 && Math.abs(end.y - 400) < 1e-6);
  });

  test('a skim, not a bounce: the lift never passes H', () => {
    for (let t = 0; t <= c.T; t += 0.01) assert.ok(skimAt(t, c).stone.h <= c.H + 1e-9);
  });

  test('touches the water n times, then sinks', () => {
    assert.equal(skimAt(c.T, c).touches.length, c.n);
    assert.equal(skimAt(c.T, c).stone.sunk, 0);
    assert.equal(skimAt(c.T + c.sink + 0.01, c).stone.sunk, 1);
  });

  test('down on the water at every touch, up off it between', () => {
    const times = touchTimes(c);
    for (const t1 of times) assert.equal(skimAt(t1, c).stone.h, 0);
    let t0 = 0;
    for (const t1 of times) {
      assert.ok(skimAt((t0 + t1) / 2, c).stone.h > 0, `hop ending ${t1}`);
      t0 = t1;
    }
    // After the last touch it slides: on the water until it stops.
    for (let t = times[times.length - 1]!; t <= c.T; t += 0.05) assert.equal(skimAt(t, c).stone.h, 0);
  });

  test('each hop shorter, quicker and lower than the one before', () => {
    const times = touchTimes(c);
    let t0 = 0;
    let at = skimAt(0, c).stone;
    let last = { d: Infinity, len: Infinity, top: Infinity };
    for (const t1 of times) {
      const end = skimAt(t1, c).stone;
      const hop = { d: t1 - t0, len: Math.hypot(end.x - at.x, end.y - at.y), top: skimAt((t0 + t1) / 2, c).stone.h };
      assert.ok(hop.d < last.d && hop.len < last.len && hop.top < last.top, `hop ending ${t1}`);
      last = hop;
      t0 = t1;
      at = end;
    }
  });

  test('comes out of the hand and fades as it goes under, with no jump', () => {
    assert.equal(skimAt(0, c).stone.o, 0);
    assert.equal(skimAt(c.T, c).stone.o, 1);
    assert.equal(skimAt(c.T + c.sink, c).stone.o, 0);
    for (let t = 0; t < c.T + c.sink; t += 0.01) {
      const a = skimAt(t, c).stone;
      const b = skimAt(t + 0.01, c).stone;
      assert.ok(Math.abs(b.o - a.o) < 0.1 && Math.abs(b.h - a.h) < 0.5 && Math.abs(b.spin - a.spin) < 1);
    }
  });

  test('in the water well before the sitting fades in (THROW_MS, 6.4s)', () => {
    for (const w of [390, 1440]) {
      const k = skimConfig({ x: 0, y: 800 }, { x: 200, y: 400 }, w, 900);
      assert.ok(k.T + k.sink <= 6.4);
    }
  });

  test('always slowing down', () => {
    let last = Infinity;
    for (let t = 0.05; t <= c.T; t += 0.05) {
      const a = skimAt(t - 0.05, c).stone;
      const b = skimAt(t, c).stone;
      const v = Math.hypot(b.x - a.x, b.y - a.y);
      assert.ok(v <= last + 1e-9);
      last = v;
    }
  });
});

describe('rings', () => {
  test('the still picture: fade as they spread, never past their reach', () => {
    const s = { x: 0, y: 0, reach: 150, period: 2.8, life: 10, phase: 0, strength: 1, yours: false };
    for (const r of ringsAt(7.3, [s])) assert.ok(r.o >= 0 && r.o <= 1 && r.r <= 153);
  });

  test("a touch's train is soon gone, and smaller than the landing's", () => {
    assert.equal(touchRings([{ x: 0, y: 0, age: 5, k: 1 }]).length, 0);
    const touch = touchRings([{ x: 0, y: 0, age: 1, k: 1 }]);
    const landing = trainAt(1, { ...big, reach: 180 });
    assert.ok(touch.length < landing.length);
    assert.ok(Math.max(...touch.map((r) => r.o)) < Math.max(...landing.map((r) => r.o)));
  });
});

const big: Train = { x: 0, y: 0, reach: 200, life: 9, rings: 5, strength: 1, width: 1.6, rise: 0.12, yours: true };

describe('trainAt', () => {
  test('a leading ring and the rest behind it, closer and closer, each fainter', () => {
    const rs = trainAt(2, big);
    assert.equal(rs.length, 5);
    for (let j = 1; j < rs.length; j++) {
      assert.ok(rs[j]!.r < rs[j - 1]!.r, 'the leader is outermost');
      assert.ok(rs[j]!.o < rs[j - 1]!.o, 'each behind is fainter');
      assert.ok(rs[j]!.w! <= rs[j - 1]!.w!, 'and thinner');
    }
    for (let j = 2; j < rs.length; j++) {
      assert.ok(rs[j - 1]!.r - rs[j]!.r < rs[j - 2]!.r - rs[j - 1]!.r, 'the gaps close towards the back');
    }
  });

  test('every ring spreads, slowing, and thins as it goes', () => {
    let last: number[] = [];
    let lastStep: number[] = [];
    let lastW: number[] = [];
    for (let a = 1.2; a < 8; a += 0.1) {
      const rs = trainAt(a, big);
      rs.forEach((r, j) => {
        if (last[j] !== undefined) {
          const step = r.r - last[j]!;
          assert.ok(step > 0, 'outward');
          if (lastStep[j] !== undefined) assert.ok(step <= lastStep[j]! + 1e-9, 'slowing');
          lastStep[j] = step;
          assert.ok(r.w! <= lastW[j]! + 1e-9, 'thinning');
        }
        last[j] = r.r;
        lastW[j] = r.w!;
      });
    }
  });

  test('fainter the further it has spread, and gone at the end', () => {
    // Once risen, a ring only fades; and it fades faster than time alone
    // would make it, because its energy is spread over a longer circle.
    let prev = Infinity;
    for (let a = 0.2; a <= 9; a += 0.1) {
      const lead = trainAt(a, big)[0];
      if (!lead) break;
      assert.ok(lead.o < prev);
      assert.ok(lead.o <= (1 - a / 9) ** 1.3 + 1e-9);
      prev = lead.o;
    }
    const early = trainAt(1, big)[0]!;
    const late = trainAt(5, big)[0]!;
    assert.ok(late.o / early.o < (1 - 5 / 9) ** 1.3 / (1 - 1 / 9) ** 1.3, 'amplitude falls with radius');
    assert.ok(trainAt(8.999, big).every((r) => r.o < 0.01));
    assert.equal(trainAt(20, big).length, 0);
    assert.equal(trainAt(-0.1, big).length, 0);
  });

  test('comes up rather than appearing', () => {
    assert.equal(trainAt(0, big)[0]!.o, 0);
    assert.ok(trainAt(0.03, big)[0]!.o < trainAt(0.12, big)[0]!.o);
  });
});

describe('breaths: your stone while you sit', () => {
  const gapsOver = (seconds: number, seed: number) => {
    const t = breathTimes(seconds, seed).filter((s) => s <= seconds);
    return t.slice(1).map((s, i) => ({ at: t[i]!, gap: s - t[i]! }));
  };

  test('never a beat: over ten minutes the gaps vary, and no two in a row match', () => {
    for (const seed of [1, 7, 42, 2026, 123456789]) {
      const gaps = gapsOver(600, seed).map((g) => g.gap);
      const mean = gaps.reduce((a, g) => a + g, 0) / gaps.length;
      const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length);
      assert.ok(sd / mean > 0.2, `seed ${seed}: CV ${sd / mean}`);
      for (let i = 1; i < gaps.length; i++) {
        assert.ok(Math.abs(gaps[i]! - gaps[i - 1]!) > 0.1 * gaps[i - 1]!, `seed ${seed}, gap ${i}`);
      }
    }
  });

  test('rarer after the first minute, and calm: one every 6 to 20 seconds on average', () => {
    for (const seed of [1, 7, 42, 2026, 123456789]) {
      const all = gapsOver(600, seed);
      const early = all.filter((g) => g.at < 30).map((g) => g.gap);
      const late = all.filter((g) => g.at >= 60).map((g) => g.gap);
      const mean = (xs: number[]) => xs.reduce((a, g) => a + g, 0) / xs.length;
      assert.ok(mean(late) >= 6 && mean(late) <= 20, `seed ${seed}: ${mean(late)}`);
      assert.ok(mean(early) < mean(late), `seed ${seed}: ${mean(early)} then ${mean(late)}`);
      assert.ok(all.every((g) => g.gap > 2), 'never two at once');
    }
  });

  test('the same seed breathes the same way; another does not', () => {
    const a = breathTimes(300, 99).filter((s) => s <= 300);
    const b = breathTimes(300, 99).filter((s) => s <= 300);
    const c = breathTimes(300, 100).filter((s) => s <= 300);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
    assert.deepEqual(breathsAt(137.2, { x: 5, y: 5 }, 150, 99), breathsAt(137.2, { x: 5, y: 5 }, 150, 99));
  });

  test('soft: far fainter than the landing, a few at most, near the stone', () => {
    const landing = Math.max(...trainAt(0.5, big).map((r) => r.o));
    for (let t = 0; t < 600; t += 0.37) {
      const rs = breathsAt(t, { x: 0, y: 0 }, 150, 5);
      assert.ok(rs.length <= 4);
      for (const r of rs) {
        assert.ok(r.o < landing * 0.5);
        assert.ok(Math.hypot(r.x, r.y) <= 4 * Math.SQRT2 + 1e-9);
        assert.ok(Number.isFinite(r.r) && Number.isFinite(r.o));
      }
    }
  });
});

describe('flickConfig', () => {
  test('lands where the water was touched in 1.9 seconds, near or far', () => {
    for (const to of [{ x: 200, y: 700 }, { x: 300, y: 80 }]) {
      const c = flickConfig({ x: 150, y: 870 }, to, -1);
      assert.equal(c.T, 1.9);
      const end = skimAt(1.9, c).stone;
      assert.ok(Math.abs(end.x - to.x) < 1e-6 && Math.abs(end.y - to.y) < 1e-6);
      assert.ok(c.n >= 3 && c.n <= 9);
    }
  });
});

describe('no NaN anywhere in a throw', () => {
  test('the lift, the place and the sink stay finite, every frame', () => {
    for (let i = 0; i < 300; i++) {
      const c = flickConfig({ x: (i * 37) % 400, y: 870 }, { x: (i * 53) % 400, y: (i * 71) % 800 }, i % 2 ? 1 : -1);
      for (let t = -0.05; t < 2.8; t += 0.01) {
        const s = skimAt(t, c).stone;
        assert.ok([s.x, s.y, s.h, s.sunk, s.spin].every(Number.isFinite), `throw ${i} at ${t}`);
      }
    }
  });
});
