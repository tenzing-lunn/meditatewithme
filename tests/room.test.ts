import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  nextTurn,
  parseRoomChoice,
  resolveRoom,
  roomAtHour,
  switchRoom,
} from '../lib/room.ts';

/** 16 September 2026, local time. */
const on = (day: number, hour: number, minute = 30) => new Date(2026, 8, day, hour, minute);

describe('the room', () => {
  test('is dawn from six in the morning and dusk from six in the evening', () => {
    assert.equal(roomAtHour(0), 'dusk');
    assert.equal(roomAtHour(5), 'dusk');
    assert.equal(roomAtHour(6), 'dawn');
    assert.equal(roomAtHour(17), 'dawn');
    assert.equal(roomAtHour(18), 'dusk');
    assert.equal(roomAtHour(23), 'dusk');
  });

  test('follows the hour when nothing has been switched', () => {
    assert.equal(resolveRoom(on(16, 12), null), 'dawn');
    assert.equal(resolveRoom(on(16, 21), null), 'dusk');
  });

  test('turns at the next six o’clock', () => {
    assert.equal(nextTurn(on(16, 3)), new Date(2026, 8, 16, 6).getTime());
    assert.equal(nextTurn(on(16, 12)), new Date(2026, 8, 16, 18).getTime());
    assert.equal(nextTurn(on(16, 20)), new Date(2026, 8, 17, 6).getTime());
  });

  test('holds a switch until the day next turns, then lets it go', () => {
    const noon = switchRoom(on(16, 12), 'dawn');
    assert.equal(noon.room, 'dusk');
    assert.equal(resolveRoom(on(16, 17, 59), noon), 'dusk');
    assert.equal(resolveRoom(on(16, 19), noon), 'dusk');
    assert.equal(resolveRoom(on(17, 12), noon), 'dawn');
  });

  test('does not carry a night-time switch into the next evening', () => {
    const night = switchRoom(on(16, 20), 'dusk');
    assert.equal(night.room, 'dawn');
    assert.equal(resolveRoom(on(16, 23), night), 'dawn');
    assert.equal(resolveRoom(on(17, 3), night), 'dawn');
    assert.equal(resolveRoom(on(17, 21), night), 'dusk');
  });

  test('reads only a real stored choice', () => {
    assert.deepEqual(parseRoomChoice('{"room":"dawn","until":5}'), { room: 'dawn', until: 5 });
    assert.equal(parseRoomChoice(null), null);
    assert.equal(parseRoomChoice('not json'), null);
    assert.equal(parseRoomChoice('null'), null);
    assert.equal(parseRoomChoice('{"room":"noon","until":5}'), null);
    assert.equal(parseRoomChoice('{"room":"dusk"}'), null);
  });
});
