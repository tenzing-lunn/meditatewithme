import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildIndex,
  foldPlace,
  parsePlaces,
  placeLabel,
  searchPlaces,
} from '../lib/places.ts';

const NAMES: Record<string, string> = {
  PT: 'Portugal',
  US: 'United States',
  FR: 'France',
  BR: 'Brazil',
  IN: 'India',
  VC: 'Saint Vincent and the Grenadines',
};

// Largest first, as the built file is.
const ROWS = [
  { name: 'São Paulo', code: 'BR' },
  { name: 'Paris', code: 'FR' },
  { name: 'Indore', code: 'IN' },
  { name: 'Lisbon', code: 'PT' },
  { name: 'Porto', code: 'PT' },
  { name: 'Kingstown', code: 'VC' },
  { name: 'West New York', code: 'US' },
  { name: 'Paris', code: 'US' },
];

const index = buildIndex(ROWS, (code) => NAMES[code] ?? null);
const labels = (q: string) => searchPlaces(index, q).map((p) => p.label);

describe('foldPlace', () => {
  test('drops accents, case and punctuation', () => {
    assert.equal(foldPlace('São Paulo'), 'sao paulo');
    assert.equal(foldPlace('  Saint-Denis '), 'saint denis');
  });
});

describe('searchPlaces', () => {
  test('nothing typed is nothing found', () => {
    assert.deepEqual(labels(''), []);
    assert.deepEqual(labels(' , '), []);
  });

  test('the start of a name finds it, with its country', () => {
    assert.deepEqual(labels('lisb'), ['Lisbon, Portugal']);
  });

  test('accents do not have to be typed', () => {
    assert.deepEqual(labels('sao'), ['São Paulo, Brazil']);
  });

  test('a country comes before a town at the same rank', () => {
    assert.deepEqual(labels('por'), ['Portugal', 'Porto, Portugal']);
    assert.deepEqual(labels('ind'), ['India', 'Indore, India']);
  });

  test('a whole name comes first, then the larger place', () => {
    assert.deepEqual(labels('paris'), ['Paris, France', 'Paris, United States']);
  });

  test('after a comma, the country narrows it', () => {
    assert.deepEqual(labels('paris, uni'), ['Paris, United States']);
    assert.deepEqual(labels('paris, us'), ['Paris, United States']);
  });

  test('a later word in a name matches after the names that begin with it', () => {
    assert.deepEqual(labels('new'), ['West New York, United States']);
  });

  test('a label too long for an origin keeps the town', () => {
    assert.deepEqual(labels('kingst'), ['Kingstown']);
  });

  test('never more than the limit', () => {
    assert.equal(searchPlaces(index, 'p', 2).length, 2);
  });
});

describe('placeLabel', () => {
  test('a whole country is its name', () => {
    assert.equal(placeLabel(null, 'Portugal'), 'Portugal');
  });
});

describe('public/places.txt', () => {
  const rows = parsePlaces(readFileSync('public/places.txt', 'utf8'));

  test('is built, and credits its source', () => {
    assert.ok(readFileSync('public/places.txt', 'utf8').startsWith('# GeoNames'));
    assert.ok(rows.length > 20000);
  });

  test('holds real places with real codes', () => {
    assert.ok(rows.some((r) => r.name === 'Lisbon' && r.code === 'PT'));
    assert.ok(rows.every((r) => /^[A-Z]{2}$/.test(r.code)));
  });
});
