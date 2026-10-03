import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useDb } from './_db.ts';
import { basic, bearer, request } from './_request.ts';
import { POST as auth } from '../../app/api/live/auth/route.ts';
import { POST as hook } from '../../app/api/live/hook/route.ts';

const AUTH = 'auth-secret-for-tests';
const HOOK = 'hook-secret-for-tests';
const KEY = 'k'.repeat(40);
const since = () => new Date(Date.now() - 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z');

beforeEach(() => {
  process.env.LIVE_AUTH_SECRET = AUTH;
  process.env.LIVE_HOOK_SECRET = HOOK;
});

describe('/api/live/auth — may this publisher go live?', () => {
  const publish = (body: unknown, headers: Record<string, string> = basic(AUTH)) =>
    auth(request('/api/live/auth', { body, headers }));
  const good = { action: 'publish', path: 'live/abcd1234', password: KEY };

  test('no server secret, or the wrong one, is 401 before the body is read', async () => {
    const db = useDb({ tables: { stream_keys: { data: { slug: 'abcd1234' } } } });
    assert.equal((await publish(good, {})).status, 401);
    assert.equal((await publish(good, basic('wrong'))).status, 401);
    assert.equal(db.calls.length, 0);
  });

  test('a read, not a publish, is refused', async () => {
    useDb({ tables: { stream_keys: { data: { slug: 'abcd1234' } } } });
    assert.equal((await publish({ ...good, action: 'read' })).status, 401);
  });

  test('a malformed slug or key never reaches the database', async () => {
    const db = useDb();
    assert.equal((await publish({ ...good, path: 'live/ABC' })).status, 401);
    assert.equal((await publish({ ...good, password: 'short' })).status, 401);
    assert.equal(db.calls.length, 0);
  });

  test('a key with no matching unrevoked row is 401', async () => {
    useDb({ tables: { stream_keys: { data: null } } });
    assert.equal((await publish(good)).status, 401);
  });

  test('the database being down fails closed', async () => {
    useDb({ tables: { stream_keys: { error: { message: 'down' } } } });
    assert.equal((await publish(good)).status, 401);
  });

  test('a matching key is let in, looked up by its hash and never in clear', async () => {
    const db = useDb({ tables: { stream_keys: { data: { slug: 'abcd1234' } } } });
    assert.equal((await publish(good)).status, 204);
    assert.ok(db.calls.includes(`stream_keys.eq("key_hash")`), db.calls.join('\n'));
    assert.ok(db.calls.includes('stream_keys.is("revoked_at")'));
    assert.ok(!db.calls.some((c) => c.includes(KEY)), 'the clear key is never sent');
  });
});

describe('/api/live/hook — the server reporting a stream', () => {
  const tell = (body: unknown, headers: Record<string, string> = bearer(HOOK)) =>
    hook(request('/api/live/hook', { body, headers }));

  test('the wrong bearer is 401', async () => {
    useDb();
    assert.equal((await tell({ path: 'live/abcd1234', state: 'online', since: since() }, bearer('nope'))).status, 401);
    assert.equal((await tell({ path: 'live/abcd1234', state: 'online', since: since() }, {})).status, 401);
  });

  test('a bad path, state or since is 400', async () => {
    useDb();
    assert.equal((await tell({ path: 'other', state: 'online', since: since() })).status, 400);
    assert.equal((await tell({ path: 'live/abcd1234', state: 'dancing', since: since() })).status, 400);
    assert.equal((await tell({ path: 'live/abcd1234', state: 'online', since: 'yesterday' })).status, 400);
  });

  test('a revoked key is told 410 so the server cuts the connection', async () => {
    useDb({ tables: { stream_keys: { data: [] } } });
    assert.equal((await tell({ path: 'live/abcd1234', state: 'seen', since: since() })).status, 410);
  });

  test('a live key is marked seen, 204', async () => {
    const db = useDb({ tables: { stream_keys: { data: [{ slug: 'abcd1234' }] } } });
    assert.equal((await tell({ path: 'live/abcd1234', state: 'online', since: since(), server: 'hel1' })).status, 204);
    assert.ok(db.calls.includes('stream_keys.is("revoked_at")'), db.calls.join('\n'));
  });

  test('offline is always recorded, scoped to its own since', async () => {
    const db = useDb({ tables: { stream_keys: { data: null } } });
    const s = since();
    assert.equal((await tell({ path: 'live/abcd1234', state: 'offline', since: s })).status, 204);
    assert.ok(db.calls.includes('stream_keys.eq("live_since")'), db.calls.join('\n'));
  });
});
