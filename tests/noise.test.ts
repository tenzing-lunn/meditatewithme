import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { buildNoiseLoop, fillNoise, type NoiseKind } from '../lib/noise.ts';
import {
  DEFAULT_MASTER,
  MASTER_KEY,
  TRACK_SLUGS,
  isTrackSlug,
} from '../lib/types.ts';

const KINDS: NoiseKind[] = ['white', 'pink', 'brown'];

describe('fillNoise', () => {
  test('produces finite samples for every colour', () => {
    for (const kind of KINDS) {
      const out = new Float32Array(4096);
      fillNoise(out, kind);
      for (const v of out) assert.ok(Number.isFinite(v), `${kind} produced ${v}`);
    }
  });

  test('brown does not wander off to a DC offset', () => {
    // The leak in the integrator is the only thing stopping it. Without it a
    // long run drifts towards one rail and the bed turns into a thump.
    const out = new Float32Array(48_000 * 12);
    fillNoise(out, 'brown');
    let sum = 0;
    for (const v of out) sum += v;
    assert.ok(Math.abs(sum / out.length) < 0.05, `mean ${sum / out.length}`);
  });
});

describe('buildNoiseLoop', () => {
  test('returns exactly the requested length', () => {
    for (const kind of KINDS) {
      assert.equal(buildNoiseLoop(2048, 256, kind).length, 2048);
    }
  });

  test('stays inside the range an AudioBuffer can carry', () => {
    // Anything far beyond ±1 clips at the destination, and both pink and brown
    // are built from running sums that could in principle grow.
    for (const kind of KINDS) {
      const out = buildNoiseLoop(48_000, 4_000, kind);
      for (const v of out) {
        assert.ok(Number.isFinite(v), `${kind} produced ${v}`);
        assert.ok(Math.abs(v) <= 1.5, `${kind} reached ${v}`);
      }
    }
  });

  test('the wrap is not a click', () => {
    // The whole reason the tail is crossfaded over the head. A loop whose last
    // sample and first sample are far apart pops on every repeat — obvious on
    // the twentieth pass, inaudible on the first, which is why it is asserted
    // rather than listened for.
    for (const kind of KINDS) {
      const out = buildNoiseLoop(48_000, 4_000, kind);

      let total = 0;
      for (let i = 1; i < out.length; i++) {
        total += Math.abs((out[i] ?? 0) - (out[i - 1] ?? 0));
      }
      const averageStep = total / (out.length - 1);
      const wrapStep = Math.abs((out[0] ?? 0) - (out[out.length - 1] ?? 0));

      // The claim is "the same order as an ordinary step between neighbours",
      // not "smaller". An uncrossfaded seam lands far outside this.
      assert.ok(
        wrapStep < averageStep * 12,
        `${kind}: wrap ${wrapStep} vs average step ${averageStep}`,
      );
    }
  });

  test('a fade longer than the buffer does not read off the end', () => {
    // Reachable by shortening LOOP_SECONDS below WRAP_FADE_SECONDS. Without
    // the clamp this fills the head with undefined and the bed goes silent at
    // the start of every repeat.
    const out = buildNoiseLoop(64, 4096, 'white');
    assert.equal(out.length, 64);
    for (const v of out) assert.ok(Number.isFinite(v));
  });

  test('a zero fade is still a valid buffer', () => {
    const out = buildNoiseLoop(1024, 0, 'pink');
    assert.equal(out.length, 1024);
    for (const v of out) assert.ok(Number.isFinite(v));
  });
});

describe('the track vocabulary', () => {
  test('is the five the scope table promises', () => {
    assert.equal(TRACK_SLUGS.length, 5);
  });

  test('every slug is unique', () => {
    assert.equal(new Set(TRACK_SLUGS).size, TRACK_SLUGS.length);
  });

  test('the master key cannot collide with a track', () => {
    // Master volume rides in the same record as the tracks. A track named
    // "master" would silently become the master fader.
    assert.ok(!(TRACK_SLUGS as readonly string[]).includes(MASTER_KEY));
  });

  test('isTrackSlug rejects anything not on the list', () => {
    // Levels round-trip through localStorage and a jsonb column, both of which
    // can be edited by hand.
    assert.ok(isTrackSlug('rain'));
    assert.ok(!isTrackSlug('airhorn'));
    assert.ok(!isTrackSlug(MASTER_KEY));
    assert.ok(!isTrackSlug(undefined));
    assert.ok(!isTrackSlug(7));
  });

  test('the default master is audible but not the point', () => {
    assert.ok(DEFAULT_MASTER > 0 && DEFAULT_MASTER < 1);
  });
});
