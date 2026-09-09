import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { localTime, sentenceList } from '../lib/format.ts';

describe('sentenceList', () => {
  test('nothing, one, two, three', () => {
    assert.equal(sentenceList([]), '');
    assert.equal(sentenceList(['rain']), 'rain');
    assert.equal(sentenceList(['rain', 'wind']), 'rain and wind');
    assert.equal(
      sentenceList(['rain', 'wind', 'night']),
      'rain, wind and night',
    );
  });
});

describe('localTime', () => {
  test('takes a Date or a timestamp and says the same thing', () => {
    const at = new Date(2026, 8, 8, 13, 0);
    assert.equal(localTime(at), localTime(at.getTime()));
    assert.match(localTime(at), /1:00|13:00/);
  });
});
