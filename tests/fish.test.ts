import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { fishAt, hash, planFish, swarmSize, type Area } from '../lib/fish.ts';

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
