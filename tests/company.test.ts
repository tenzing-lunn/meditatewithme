import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { LABEL_TURN_MS, companyLine } from '../lib/company.ts';

describe('companyLine', () => {
  test('a name, alone and with a count', () => {
    assert.equal(
      companyLine(['Ana from Lisbon'], null, null, null, 0),
      'Ana from Lisbon is meditating with you.',
    );
    assert.equal(
      companyLine(['Ana from Lisbon'], 2, 2, null, 0),
      'Ana from Lisbon is meditating with you.',
    );
    assert.equal(
      companyLine(['Ana from Lisbon'], 5, 6, null, 0),
      'Ana from Lisbon and 3 others are meditating with you.',
    );
    assert.equal(
      companyLine(['Ana from Lisbon'], 3, 3, null, 0),
      'Ana from Lisbon and 1 other are meditating with you.',
    );
  });

  test('your own label is never read back, and only once', () => {
    assert.equal(companyLine(['Ana from Lisbon'], 1, 1, 'Ana from Lisbon', 0), 'You are the first here this hour.');
    assert.equal(
      companyLine(['Ana from Lisbon', 'Ana from Lisbon'], 2, 2, 'Ana from Lisbon', 0),
      'Ana from Lisbon is meditating with you.',
    );
  });

  test('names take turns, twenty seconds each, from the clock', () => {
    const labels = ['Ana from Lisbon', 'Bo from Oslo', 'Cy'];
    assert.match(companyLine(labels, null, null, null, 0)!, /^Ana/);
    assert.match(companyLine(labels, null, null, null, LABEL_TURN_MS)!, /^Bo/);
    assert.match(companyLine(labels, null, null, null, LABEL_TURN_MS * 2)!, /^Cy/);
    assert.match(companyLine(labels, null, null, null, LABEL_TURN_MS * 3)!, /^Ana/);
  });

  test('counts without names', () => {
    assert.equal(companyLine([], 5, 7, null, 0), '4 others are meditating with you.');
    assert.equal(companyLine([], 2, 2, null, 0), '1 other is meditating with you.');
    assert.equal(companyLine([], 1, 1, null, 0), 'You are the first here this hour.');
    assert.equal(companyLine([], 1, 4, null, 0), '3 others sat here earlier this hour.');
    assert.equal(companyLine([], 1, 2, null, 0), '1 other sat here earlier this hour.');
  });

  test('nothing is invented', () => {
    assert.equal(companyLine([], null, null, null, 0), null);
    assert.equal(companyLine([], null, 3, null, 0), null);
    assert.equal(companyLine([], 0, 0, null, 0), null);
    // A count that lags the labels never goes negative.
    assert.equal(
      companyLine(['Ana from Lisbon'], 1, 1, null, 0),
      'Ana from Lisbon is meditating with you.',
    );
  });
});
