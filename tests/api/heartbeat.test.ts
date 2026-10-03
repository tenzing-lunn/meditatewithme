import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useDb } from './_db.ts';
import { fromIp, request } from './_request.ts';
import { POST } from '../../app/api/heartbeat/route.ts';

const ID = '7d8a1f3e-4b2c-4a6d-9e1f-0c3b5a7d9e2f';
const beat = (body: unknown, headers: Record<string, string> = fromIp()) =>
  POST(request('/api/heartbeat', { body, headers }));

describe('/api/heartbeat', () => {
  beforeEach(() => useDb({ tables: { heartbeats: { error: null, count: 3 } } }));

  test('refuses a body that is not JSON', async () => {
    const res = await POST(request('/api/heartbeat', { method: 'POST', raw: 'nope', headers: fromIp() }));
    assert.equal(res.status, 400);
  });

  test('refuses an id that is not a v4 uuid', async () => {
    assert.equal((await beat({ anonId: 'me' })).status, 400);
    assert.equal((await beat({ anonId: 12 })).status, 400);
    assert.equal((await beat({})).status, 400);
  });

  test('records a beat and never caches the answer', async () => {
    const res = await beat({ anonId: ID });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  test('a beginning answers how many began with it', async () => {
    const res = await beat({ anonId: ID, began: true });
    assert.deepEqual(await res.json(), { ok: true, beganCount: 3 });
  });

  test('a database failure is a calm 200, not an error', async () => {
    useDb({ tables: { heartbeats: { error: { message: 'down' } } } });
    const res = await beat({ anonId: ID });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: false });
  });

  test('the label is cleaned and capped, and null clears it', async () => {
    const db = useDb();
    await beat({ anonId: ID, label: ' Ana\u0000 from Lisbon ' });
    assert.ok(db.calls.some((c) => c.includes('"label":"Ana from Lisbon"')), db.calls.join('\n'));
    await beat({ anonId: ID, label: null });
    assert.ok(db.calls.some((c) => c.includes('"label":null')));
  });

  test('one address may not invent more than fifty people in an hour', async () => {
    const ip = fromIp('203.0.113.9');
    for (let i = 0; i < 50; i++) {
      const id = `7d8a1f3e-4b2c-4a6d-9e1f-${String(i).padStart(12, '0')}`;
      assert.equal((await beat({ anonId: id }, ip)).status, 200, `person ${i}`);
    }
    // The fifty-first new id is refused; one already counted still beats.
    assert.equal((await beat({ anonId: ID }, ip)).status, 429);
    assert.equal((await beat({ anonId: '7d8a1f3e-4b2c-4a6d-9e1f-000000000003' }, ip)).status, 200);
  });

  test('one address may not beat more than 120 times a minute', async () => {
    const ip = fromIp('203.0.113.10');
    for (let i = 0; i < 120; i++) assert.equal((await beat({ anonId: ID }, ip)).status, 200);
    assert.equal((await beat({ anonId: ID }, ip)).status, 429);
  });
});
