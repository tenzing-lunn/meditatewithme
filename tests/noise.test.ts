import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { BED_SOURCES, CROSSFADE_SECONDS } from '../lib/beds.ts';
import { fillNoise, type NoiseKind } from '../lib/noise.ts';
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

describe('the track vocabulary', () => {
  test('is the five the scope table promised, and the four added since', () => {
    assert.equal(TRACK_SLUGS.length, 9);
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

describe('the recorded beds', () => {
  test('every bed has exactly one source, and every source is a bed', () => {
    assert.deepEqual(
      [...BED_SOURCES.map((b) => b.slug)].sort(),
      [...TRACK_SLUGS].sort(),
    );
  });

  test('every loop is long enough to hide its crossfade', () => {
    for (const b of BED_SOURCES) {
      assert.ok(b.loop > CROSSFADE_SECONDS * 4, `${b.slug}: ${b.loop}s`);
      assert.ok(b.start >= 0, `${b.slug}: starts at ${b.start}`);
    }
  });

  test('every loop is a whole number of MP3 frames at 48 kHz', () => {
    // Otherwise the two loop points sit at different places in a frame and
    // are compressed differently: a faint tick once a loop.
    for (const b of BED_SOURCES) assert.equal(b.loop % 3, 0, `${b.slug}: ${b.loop}s`);
  });
});
