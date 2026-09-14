import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  LABEL_MAX,
  NAME_MAX,
  ORIGIN_MAX,
  cleanText,
  composeLabel,
  normalizeProfile,
} from '../lib/label.ts';

const ZERO_WIDTH_SPACE = String.fromCodePoint(0x200b);
const RIGHT_TO_LEFT_OVERRIDE = String.fromCodePoint(0x202e);
const CANDLE = String.fromCodePoint(0x1f56f);

describe('cleanText', () => {
  test('trims and collapses whitespace', () => {
    assert.equal(cleanText('  Ana   Silva ', NAME_MAX), 'Ana Silva');
  });

  test('strips control characters, zero-width and bidi marks', () => {
    const dirty = `A${ZERO_WIDTH_SPACE}na${RIGHT_TO_LEFT_OVERRIDE}`;
    assert.equal(cleanText(dirty, NAME_MAX), 'Ana');
  });

  test('caps by code points, not UTF-16 units', () => {
    // A candle is two UTF-16 units and one code point.
    const out = cleanText(CANDLE.repeat(30), 5)!;
    assert.equal(Array.from(out).length, 5);
    assert.equal(cleanText('e'.repeat(3), 3), 'eee');
  });

  test('null for non-strings and for nothing left', () => {
    assert.equal(cleanText(42, NAME_MAX), null);
    assert.equal(cleanText(null, NAME_MAX), null);
    assert.equal(cleanText(`   ${ZERO_WIDTH_SPACE} `, NAME_MAX), null);
  });
});

describe('composeLabel', () => {
  test('name and origin', () => {
    assert.equal(composeLabel('Ana', 'Lisbon'), 'Ana from Lisbon');
  });

  test('name alone, origin alone, neither', () => {
    assert.equal(composeLabel('Ana', null), 'Ana');
    assert.equal(composeLabel(null, 'Lisbon'), 'Someone from Lisbon');
    assert.equal(composeLabel(null, null), null);
    assert.equal(composeLabel('', '  '), null);
  });

  test('never longer than LABEL_MAX', () => {
    const label = composeLabel('n'.repeat(NAME_MAX), 'o'.repeat(ORIGIN_MAX))!;
    assert.equal(Array.from(label).length <= LABEL_MAX, true);
  });
});

describe('normalizeProfile', () => {
  test('cleans each field and keeps share only as a boolean', () => {
    assert.deepEqual(
      normalizeProfile({ name: ' Ana ', origin: 'Lisbon ', share: 'yes' }),
      { name: 'Ana', origin: 'Lisbon', share: null },
    );
    assert.deepEqual(normalizeProfile({ share: true }), {
      name: null,
      origin: null,
      share: true,
    });
  });

  test('anything malformed is the empty profile', () => {
    assert.deepEqual(normalizeProfile(null), { name: null, origin: null, share: null });
    assert.deepEqual(normalizeProfile('x'), { name: null, origin: null, share: null });
  });
});
