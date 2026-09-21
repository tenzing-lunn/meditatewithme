import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  DIAL_END,
  DIAL_START,
  angleOf,
  clampToArc,
  joinStops,
  stopAngle,
  stopAt,
} from '../lib/dial.ts';

const said = (stops: ReturnType<typeof joinStops>) =>
  stops.map((s) => (s.bell ? 'bell' : s.minutes));

describe('the stops when sitting with others', () => {
  test('put the bell where it falls in time', () => {
    assert.deepEqual(said(joinStops([1, 5, 10, 15], 12)), [1, 5, 10, 'bell', 15]);
  });

  test('put a bell as long as a stop before that stop', () => {
    assert.deepEqual(said(joinStops([1, 5, 10], 10)), [1, 5, 'bell', 10]);
  });

  test('put a bell further off than every stop last', () => {
    assert.deepEqual(said(joinStops([1, 5], 58)), [1, 5, 'bell']);
  });

  test('put a bell not yet known last, without minutes', () => {
    const stops = joinStops([1, 5, 10], null);
    assert.deepEqual(said(stops), [1, 5, 10, 'bell']);
    assert.equal(stops[3]!.minutes, null);
  });

  test('keep the minutes to the bell on the bell', () => {
    assert.equal(joinStops([1, 5, 10, 15], 12)[3]!.minutes, 12);
  });
});

describe('the dial', () => {
  test('sets its first and last stops at the ends of the arc', () => {
    assert.equal(stopAngle(0, 13), DIAL_START);
    assert.equal(stopAngle(12, 13), DIAL_END);
  });

  test('reads angles clockwise from twelve o’clock', () => {
    assert.equal(angleOf(0, -1), 0);
    assert.equal(angleOf(1, 0), 90);
    assert.equal(angleOf(0, 1), 180);
    assert.equal(angleOf(-1, 0), 270);
  });

  test('reads every stop’s own angle as that stop', () => {
    for (let i = 0; i < 13; i += 1) {
      assert.equal(stopAt(stopAngle(i, 13), 13, 0), i);
    }
  });

  test('reads an angle between two stops as the nearer', () => {
    const between = (stopAngle(4, 13) * 3 + stopAngle(5, 13)) / 4;
    assert.equal(stopAt(between, 13, 0), 4);
  });

  test('holds the hand at the end it was nearer when the finger crosses the top', () => {
    assert.equal(stopAt(5, 13, 11), 12);
    assert.equal(stopAt(355, 13, 12), 12);
    assert.equal(stopAt(355, 13, 1), 0);
    assert.equal(stopAt(5, 13, 0), 0);
  });

  test('draws a held hand at the finger’s own angle on the arc', () => {
    assert.equal(clampToArc(123.4, 100), 123.4);
    assert.equal(clampToArc(DIAL_START, 300), DIAL_START);
  });

  test('keeps a held hand at the nearer end while the finger is in the gap', () => {
    assert.equal(clampToArc(355, 330), DIAL_END);
    assert.equal(clampToArc(5, 330), DIAL_END);
    assert.equal(clampToArc(5, 40), DIAL_START);
    assert.equal(clampToArc(355, 40), DIAL_START);
  });

  test('has one stop when there is one', () => {
    assert.equal(stopAngle(0, 1), DIAL_START);
    assert.equal(stopAt(200, 1, 0), 0);
  });
});
