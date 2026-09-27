import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { fishAt, follow, hash, homeFor, planFish, swarmSize, type Area, type Swimmer } from '../lib/fish.ts';

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

describe('follow', () => {
  test('each joint keeps its length behind the one ahead', () => {
    const [body, tail] = follow({ x: 10, y: 0 }, [{ x: 0, y: 0 }, { x: -5, y: 0 }], 6);
    assert.ok(Math.abs(Math.hypot(body!.x - 10, body!.y) - 6) < 1e-9);
    assert.ok(Math.abs(Math.hypot(tail!.x - body!.x, tail!.y - body!.y) - 6) < 1e-9);
  });

  test('through a turn the body bends: the tail trails where the head was', () => {
    // Swimming right, then the head turns up.
    const [body, tail] = follow({ x: 0, y: -6 }, [{ x: 0, y: 0 }, { x: -6, y: 0 }], 6);
    assert.ok(Math.abs(body!.x) < 1e-9 && Math.abs(body!.y) < 1e-9);
    // Trailing to the side the head came from, bent as far as a fish bends.
    assert.ok(tail!.x < -3 && tail!.y > 0);
  });

  test('the tail never folds back past its body', () => {
    // The tail left lying ahead of the body, as after a sharp reversal.
    const [body, tail] = follow({ x: 0, y: 0 }, [{ x: -6, y: 0 }, { x: 0, y: 0.5 }], 6);
    const back = Math.atan2(body!.y, body!.x);
    const seg = Math.atan2(tail!.y - body!.y, tail!.x - body!.x);
    const bend = Math.abs(Math.atan2(Math.sin(seg - back), Math.cos(seg - back)));
    assert.ok(bend <= 0.9 + 1e-9, `bent ${bend}`);
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
