import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  alarmAt,
  BEND,
  fishAt,
  hash,
  homeFor,
  planFish,
  spawnFish,
  spine,
  swarmSize,
  swim,
  SWIM,
  type Area,
  type FishState,
  type Swimmer,
} from '../lib/fish.ts';

const DESK: Area = { w: 1440, h: 900, y0: 0.08, y1: 0.86 };
const PHONE: Area = { w: 390, h: 844, y0: 0.08, y1: 0.86 };
const keys = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

describe('swarmSize', () => {
  test('a quiet pond: every fish on its own', () => {
    assert.equal(swarmSize(24, DESK), 1);
    assert.equal(swarmSize(0, DESK), 1);
  });

  test('a crowded pond gathers them, more to a swarm as more come', () => {
    assert.equal(swarmSize(300, DESK) > 1, true);
    assert.equal(swarmSize(40, PHONE) >= 6, true);
    assert.equal(swarmSize(400, DESK) >= swarmSize(200, DESK), true);
  });
});

describe('planFish', () => {
  test('quiet: one path per fish, and nobody shares one', () => {
    const plan = planFish(keys(24), DESK);
    assert.equal(plan.fish.length, 24);
    assert.equal(plan.paths.length, 24);
    assert.equal(new Set(plan.fish.map((f) => f.path)).size, 24);
    assert.ok(plan.paths.every((p) => p.r === 0));
  });

  test('crowded: swarms, each with a radius', () => {
    const plan = planFish(keys(300), DESK);
    assert.equal(plan.fish.length, 300);
    assert.ok(plan.paths.length < 300 && plan.paths.length > 1);
    assert.ok(plan.paths.every((p) => p.r > 0));
  });

  test('a fish keeps its path while others come and go', () => {
    const a = planFish(['ana', 'bo'], DESK);
    const b = planFish(['bo', 'kenji', 'ana'], DESK);
    assert.deepEqual(a.paths[a.fish[0]!.path], b.paths[b.fish[2]!.path]);
  });

  test('crowded, one person leaving moves hardly anybody else', () => {
    /** How many of the others' marks move more than three body lengths. */
    const moved = (people: readonly (string | Swimmer)[], area: Area) => {
      const a = planFish(people, area);
      const b = planFish(people.slice(1), area);
      let n = 0;
      for (let i = 1; i < people.length; i++) {
        const far = [0, 37, 101].some((t) => {
          const p = fishAt(a, i, t);
          const q = fishAt(b, i - 1, t);
          return Math.hypot(p.x - q.x, p.y - q.y) > 3 * a.size;
        });
        if (far) n++;
      }
      return n / (people.length - 1);
    };
    assert.ok(moved(keys(300), DESK) <= 0.02, 'three hundred without a place');
    // Where the number of swarms changes, only the fish of the swarm that goes.
    assert.ok(moved(keys(39), PHONE) <= 0.2, 'a swarm fewer');
    const lisbon = keys(150).map((key) => ({ key, lat: 38.5, lon: -9.5 }));
    assert.ok(moved(lisbon, DESK) <= 0.02, 'a region split in three');
  });

  test('smaller fish in a crowd and on a phone', () => {
    assert.ok(planFish(keys(300), DESK).size < planFish(keys(10), DESK).size);
    assert.ok(planFish(keys(10), PHONE).size < planFish(keys(10), DESK).size);
  });
});

describe('fishAt', () => {
  test('fish stay on the water, quiet or crowded', () => {
    for (const [n, area] of [[24, DESK], [300, DESK], [60, PHONE]] as const) {
      const plan = planFish(keys(n), area);
      for (let t = 0; t < 600; t += 7.3) {
        for (let i = 0; i < n; i++) {
          const p = fishAt(plan, i, t);
          assert.ok(p.x > -10 && p.x < area.w + 10, `x ${p.x} at ${t}`);
          assert.ok(p.y > area.h * area.y0 - 10 && p.y < area.h * area.y1 + 10, `y ${p.y} at ${t}`);
        }
      }
    }
  });

  test('a touch pushes a nearby fish away, and lets it back', () => {
    const plan = planFish(['ana'], DESK);
    const at = fishAt(plan, 0, 100);
    const touch = { x: at.x - 10, y: at.y, t: 99.5 };
    const pushed = fishAt(plan, 0, 100, [touch]);
    assert.ok(pushed.x > at.x + 20, 'pushed away from the touch');
    const later = fishAt(plan, 0, 110, [touch]);
    assert.deepEqual(later, fishAt(plan, 0, 110));
  });
});

test('hash is stable', () => {
  assert.equal(hash('ana'), hash('ana'));
  assert.notEqual(hash('ana'), hash('bo'));
});

describe('swim', () => {
  const L = 20;
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  /** Steps a fish through `n` frames of `dt`, toward wherever `aim` says. */
  const run = (
    s: FishState,
    n: number,
    dt: number,
    aim: (s: FishState, t: number) => { x: number; y: number },
    alarm: (t: number) => number = () => 0,
    each?: (was: FishState, now: FishState, t: number) => void,
  ) => {
    for (let k = 0; k < n; k++) {
      const t = k * dt;
      const now = swim(s, aim(s, t), dt, { size: L, alarm: alarm(t) });
      each?.(s, now, t);
      s = now;
    }
    return s;
  };
  /** A mark that stays `d` px straight ahead: a steady speed, no turning. */
  const ahead = (d: number) => (s: FishState) => ({ x: s.x + Math.cos(s.heading) * d, y: s.y + Math.sin(s.heading) * d });
  /** How far along its wave each joint is, and how far it swings, at steady speed. */
  const wave = (d: number) => {
    let s = run(spawnFish({ x: 0, y: 0 }, 0, L), 600, 1 / 60, ahead(d));
    const sum = { head: [0, 0], body: [0, 0], tail: [0, 0] } as Record<'head' | 'body' | 'tail', [number, number]>;
    const peak = { head: 0, body: 0, tail: 0 };
    let turned = 0;
    s = run(s, 600, 1 / 60, ahead(d), undefined, (was, now) => {
      turned += (now.phase - was.phase + 2 * Math.PI) % (2 * Math.PI);
      for (const j of ['head', 'body', 'tail'] as const) {
        sum[j][0] += now.bend[j] * Math.sin(now.phase);
        sum[j][1] += now.bend[j] * Math.cos(now.phase);
        peak[j] = Math.max(peak[j], Math.abs(now.bend[j]));
      }
    });
    const phase = (j: 'head' | 'body' | 'tail') => Math.atan2(sum[j][1], sum[j][0]);
    return { phase, peak, hz: turned / (2 * Math.PI) / 10, speed: s.speed };
  };
  /** A mark that wanders like a fish's own, and sometimes doubles back. */
  const wander = (_: FishState, t: number) => ({
    x: 400 + 250 * Math.sin(t * 0.13) + 80 * Math.sin(t * 0.9),
    y: 300 + 150 * Math.sin(t * 0.21 + 1) + 60 * Math.cos(t * 1.3),
  });
  const burstEvery = (t: number) => (t % 20 < 3 ? 1 - (t % 20) / 3 : 0);

  test('nose first: it only ever moves the way it faces, never sideways or back', () => {
    for (const dt of [1 / 60, 1 / 30, 0.1]) {
      run(spawnFish({ x: 100, y: 100 }, 2, L), Math.round(300 / dt), dt, wander, burstEvery, (was, now) => {
        const mx = now.x - was.x;
        const my = now.y - was.y;
        if (Math.hypot(mx, my) < 1e-6) return;
        const off = Math.abs(wrap(Math.atan2(my, mx) - now.heading));
        assert.ok(off < 0.35, `off heading by ${off}`);
      });
    }
  });

  test('turns no faster than its limit, and only so tight at a crawl', () => {
    const dt = 1 / 60;
    run(spawnFish({ x: 0, y: 0 }, 0, L), 18000, dt, wander, burstEvery, (was, now, t) => {
      const rate = Math.abs(wrap(now.heading - was.heading)) / dt;
      const limit = burstEvery(t) > 0 ? SWIM.turnBurst : SWIM.turnFar;
      assert.ok(rate <= limit + 1e-9, `turned ${rate} rad/s`);
      const radius = burstEvery(t) > 0 ? SWIM.burstRadius : SWIM.chaseRadius;
      assert.ok(rate <= now.speed / (radius * L) + 1e-9, 'tighter than its smallest circle');
    });
  });

  test('speed stays between nothing and a burst, and changes smoothly', () => {
    const dt = 1 / 60;
    run(spawnFish({ x: 0, y: 0 }, 0, L), 18000, dt, wander, burstEvery, (was, now) => {
      assert.ok(now.speed >= 0 && now.speed <= SWIM.burst * L + 1e-9, `speed ${now.speed}`);
      assert.ok(Math.abs(now.speed - was.speed) / dt <= SWIM.burstAccel * L + 1e-6, 'a jolt');
    });
    // Calm, it never goes past a calm top speed.
    run(spawnFish({ x: 0, y: 0 }, 0, L), 6000, dt, wander, undefined, (_, now) => {
      assert.ok(now.speed <= SWIM.top * L + 1e-9);
      assert.ok(now.speed >= SWIM.idle * L - 1e-9, 'it never freezes');
    });
  });

  test('no joint ever bends past its limit, even startled and turning hard', () => {
    run(spawnFish({ x: 0, y: 0 }, 0, L), 18000, 1 / 60, wander, burstEvery, (_, now) => {
      assert.ok(Math.abs(now.bend.head) <= BEND.head + 1e-9);
      assert.ok(Math.abs(now.bend.body) <= BEND.body + 1e-9);
      assert.ok(Math.abs(now.bend.tail) <= BEND.tail + 1e-9);
    });
  });

  test('the wave travels head to tail, and swings wider toward the tail', () => {
    const w = wave(40);
    const lag = wrap(w.phase('body') - w.phase('tail'));
    assert.ok(lag > 0.5 && lag < 2, `the tail is ${lag} rad behind the body`);
    assert.ok(w.peak.head < w.peak.body && w.peak.body < w.peak.tail, JSON.stringify(w.peak));
    assert.ok(w.peak.head < 0.08, 'the head barely moves');
  });

  test('faster, it beats faster and wider; gliding, it hardly beats', () => {
    const slow = wave(6);
    const fast = wave(200);
    assert.ok(fast.speed > slow.speed * 5, `${slow.speed} → ${fast.speed}`);
    assert.ok(fast.hz > slow.hz * 2, `${slow.hz} Hz → ${fast.hz} Hz`);
    assert.ok(fast.peak.tail > slow.peak.tail * 3, `${slow.peak.tail} → ${fast.peak.tail}`);
    assert.ok(slow.peak.tail < 0.1, 'a glide');
  });

  test('turning, the body curves along the path the head took', () => {
    // Circling left (heading increasing): the rear body points back the way it came.
    const s = run(spawnFish({ x: 0, y: 0 }, 0, L), 600, 1 / 60, (f) => ({
      x: f.x + Math.cos(f.heading + 1) * 200,
      y: f.y + Math.sin(f.heading + 1) * 200,
    }));
    assert.ok(s.turn > 0.5, `turning ${s.turn} rad/s`);
    assert.ok(s.bend.body < 0 && s.bend.tail < 0, JSON.stringify(s.bend));
  });

  test('it reaches its mark, then hangs about it instead of spinning', () => {
    const mark = { x: 300, y: 200 };
    const dt = 1 / 60;
    let s = run(spawnFish({ x: 0, y: 0 }, Math.PI, L), 900, dt, () => mark);
    assert.ok(Math.hypot(s.x - mark.x, s.y - mark.y) < 2 * L, 'arrived');
    let turned = 0;
    const speeds: number[] = [];
    s = run(s, 3600, dt, () => mark, undefined, (was, now) => {
      turned += Math.abs(wrap(now.heading - was.heading));
      speeds.push(now.speed / L);
      // Turning round on its widest-but-one circle takes it out and back:
      // never further than its slack and that circle's width.
      assert.ok(Math.hypot(now.x - mark.x, now.y - mark.y) < (SWIM.slack + 2 * SWIM.radius + 0.5) * L, 'stays near');
      assert.ok(now.speed < 2 * L, 'no dash');
    });
    speeds.sort((a, b) => a - b);
    assert.ok(speeds[speeds.length >> 1]! <= SWIM.cruise + 1e-9, 'mostly idling');
    assert.ok(turned / 60 <= 0.35, `turned ${turned / 60} rad/s at its mark`);
  });

  test('a long frame is swum in tenths, a huge gap puts it back at its mark', () => {
    const mark = { x: 500, y: 500 };
    const s = spawnFish({ x: 0, y: 0 }, 0, L);
    let four = s;
    for (let k = 0; k < 4; k++) four = swim(four, mark, 0.1, { size: L });
    const long = swim(s, mark, 0.4, { size: L });
    for (const f of ['x', 'y', 'heading', 'speed', 'turn', 'phase'] as const) {
      assert.ok(Math.abs(long[f] - four[f]) < 1e-9, `${f}: ${long[f]} against ${four[f]}`);
    }
    assert.ok(long.x > swim(s, mark, 0.1, { size: L }).x, 'a slow frame does not slow the fish');
    const back = swim(s, mark, 40, { size: L });
    assert.equal(back.x, 500);
    assert.equal(back.y, 500);
    assert.equal(swim(s, mark, 0, { size: L }), s);
    assert.equal(swim(s, mark, Number.NaN, { size: L }), s);
  });

  test('at ten frames a second a startled beat does not alias', () => {
    let s = spawnFish({ x: 0, y: 0 }, 0, L);
    for (let k = 0; k < 100; k++) {
      const was = s;
      s = swim(s, { x: s.x + 400, y: s.y }, 0.1, { size: L, alarm: 1 });
      assert.ok((s.phase - was.phase + 2 * Math.PI) % (2 * Math.PI) <= Math.PI / 2 + 1e-9);
    }
  });

  test('always finite, even with its mark right on top of it', () => {
    let s = spawnFish({ x: 50, y: 50 }, 1, L);
    for (let k = 0; k < 5000; k++) {
      const on = k % 3 === 0 ? { x: s.x, y: s.y } : { x: 50, y: 50 };
      s = swim(s, on, k % 7 === 0 ? 0.1 : 1 / 60, { size: L, alarm: k % 500 < 30 ? 1 : 0 });
      const sp = spine(s, L);
      for (const v of [s.x, s.y, s.heading, s.speed, s.turn, s.phase, sp.nose.x, sp.fin.y, sp.finAngle]) {
        assert.ok(Number.isFinite(v), `not finite at ${k}`);
      }
    }
  });

  test('the spine: nose ahead of the head, body and tail behind, a fish long', () => {
    const sp = spine(spawnFish({ x: 0, y: 0 }, 0, L), L);
    assert.ok(sp.nose.x > 0 && sp.body.x < 0 && sp.tail.x < sp.body.x && sp.fin.x < sp.tail.x);
    assert.ok(Math.abs(sp.nose.x - sp.fin.x - L) < 0.1 * L);
  });

  test('a touch alarms the fish near it, and only while it pushes', () => {
    const plan = planFish(['ana'], DESK);
    const at = fishAt(plan, 0, 100);
    const touch = { x: at.x - 10, y: at.y, t: 99.5 };
    assert.ok(alarmAt(plan, 0, 100, [touch]) > 0.5);
    assert.equal(alarmAt(plan, 0, 100), 0);
    assert.equal(alarmAt(plan, 0, 110, [touch]), 0);
  });
});

describe('a loose map', () => {
  const LISBON = { lat: 38.5, lon: -9.5 };
  const TOKYO = { lat: 35.5, lon: 139.5 };
  const OSLO = { lat: 59.5, lon: 10.5 };
  const SYDNEY = { lat: -33.5, lon: 151.5 };

  test('west on the left, north at the top, all on the water', () => {
    assert.ok(homeFor(LISBON.lat, LISBON.lon, DESK).x < homeFor(TOKYO.lat, TOKYO.lon, DESK).x);
    assert.ok(homeFor(OSLO.lat, OSLO.lon, DESK).y < homeFor(SYDNEY.lat, SYDNEY.lon, DESK).y);
    for (const [lat, lon] of [[90, -180], [-90, 180], [0, 0]]) {
      const h = homeFor(lat!, lon!, DESK);
      assert.ok(h.x > 0 && h.x < DESK.w && h.y > DESK.h * DESK.y0 && h.y < DESK.h * DESK.y1);
    }
  });

  test('a quiet fish wanders near its person\'s place', () => {
    const plan = planFish([{ key: 'ana', lat: 40.5, lon: -74.5 }, { key: 'kenji', ...TOKYO }], DESK);
    for (let t = 0; t < 600; t += 11) {
      assert.ok(fishAt(plan, 0, t).x < DESK.w / 2, 'New York stays west');
      assert.ok(fishAt(plan, 1, t).x > DESK.w / 2, 'Tokyo stays east');
    }
  });

  test('crowded, a region swims together, and every fish stays on the water', () => {
    const people: Swimmer[] = [
      ...keys(150).map((key) => ({ key, ...LISBON })),
      ...keys(150).map((key) => ({ key: `t${key}`, ...TOKYO })),
      { key: 'far', lat: 89.5, lon: 179.5 },
      { key: 'nowhere' },
    ];
    const plan = planFish(people, DESK);
    assert.equal(plan.fish.length, people.length);
    assert.equal(new Set(plan.fish.slice(0, 150).map((f) => f.path)).size <= 3, true);
    assert.ok(plan.fish.slice(0, 150).every((f) => !plan.fish.slice(150, 300).some((o) => o.path === f.path)));
    for (let t = 0; t < 300; t += 9.1) {
      people.forEach((_, i) => {
        const p = fishAt(plan, i, t);
        assert.ok(p.x > -10 && p.x < DESK.w + 10 && p.y > DESK.h * DESK.y0 - 10 && p.y < DESK.h * DESK.y1 + 10, `${i} at ${t}`);
      });
    }
  });
});
