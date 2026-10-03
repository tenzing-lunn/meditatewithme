import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fakeDb } from './_db.ts';
import { bearer, request } from './_request.ts';
import { GET, POST } from '../../app/api/admin/route.ts';

const ADMIN = { id: 'admin-1', email: 'jonny@example.com' };

/** A database where `admins` holds the caller and nothing else is set up. */
const asAdmin = (extra: Record<string, { data?: unknown; error?: unknown }> = {}) =>
  fakeDb({ user: ADMIN, tables: { admins: { data: { user_id: ADMIN.id } }, guide_applications: { data: [] }, stream_keys: { data: [] }, ...extra } });

describe('/api/admin — who may act', () => {
  test('no token is 403', async () => {
    fakeDb({ user: null });
    assert.equal((await GET(request('/api/admin'))).status, 403);
    assert.equal((await POST(request('/api/admin', { body: { action: 'remove', slug: 'abcd1234' } }))).status, 403);
  });

  test('a valid token for someone who is not an admin is 403', async () => {
    const db = fakeDb({ user: { id: 'u2' }, tables: { admins: { data: null } } });
    const res = await POST(request('/api/admin', { body: { action: 'remove', slug: 'abcd1234' }, headers: bearer('t') }));
    assert.equal(res.status, 403);
    // The decision was taken before any write.
    assert.ok(!db.calls.some((c) => c.startsWith('stream_keys.')), db.calls.join('\n'));
  });

  test('a database failure while checking is 403, not 500 — fails closed', async () => {
    fakeDb({ user: ADMIN, tables: { admins: { error: { message: 'down' } } } });
    assert.equal((await GET(request('/api/admin', { headers: bearer('t') }))).status, 403);
  });

  test('an admin gets the page', async () => {
    asAdmin();
    const res = await GET(request('/api/admin', { headers: bearer('t') }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, applications: [], guides: [] });
  });
});

describe('/api/admin POST — actions', () => {
  const act = (body: unknown) => POST(request('/api/admin', { body, headers: bearer('t') }));

  test('an unknown action is 400', async () => {
    asAdmin();
    assert.equal((await act({ action: 'explode' })).status, 400);
    assert.equal((await act({})).status, 400);
  });

  test('remove revokes only a key that is not already revoked', async () => {
    const db = asAdmin();
    assert.equal((await act({ action: 'remove', slug: 'abcd1234' })).status, 200);
    const update = db.calls.find((c) => c.startsWith('stream_keys.update'));
    assert.ok(update?.includes('"revoked_at"'), update);
    assert.ok(!update?.includes('"stopped_at"'), 'remove does not mark a stop');
    assert.ok(db.calls.includes('stream_keys.is("revoked_at")'), db.calls.join('\n'));
  });

  test('shut-off also marks when it stopped, so viewers are told it will be back', async () => {
    const db = asAdmin();
    assert.equal((await act({ action: 'shut-off', slug: 'abcd1234' })).status, 200);
    const update = db.calls.find((c) => c.startsWith('stream_keys.update'));
    assert.ok(update?.includes('"stopped_at"'), update);
  });

  test('accepting an application that is gone is 404', async () => {
    asAdmin({ guide_applications: { data: null } });
    const res = await act({ action: 'accept', userId: 'u9' });
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { ok: false, reason: 'gone' });
  });

  test('inviting an address with no account is 404', async () => {
    fakeDb({ user: ADMIN, tables: { admins: { data: { user_id: ADMIN.id } } }, rpc: { data: null, error: null } });
    const res = await act({ action: 'invite', email: 'new@example.com', name: 'New' });
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { ok: false, reason: 'no-account' });
  });

  test('inviting with no name or a bad address is 400', async () => {
    asAdmin();
    assert.equal((await act({ action: 'invite', email: 'x', name: 'N' })).status, 400);
    assert.equal((await act({ action: 'invite', email: 'new@example.com', name: '' })).status, 400);
  });
});
