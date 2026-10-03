import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fakeDb } from './_db.ts';
import { bearer, fromIp, request } from './_request.ts';
import { DELETE } from '../../app/api/account/route.ts';
import * as emails from '../../app/api/account/emails/route.ts';
import * as stream from '../../app/api/account/stream/route.ts';

const ME = { id: 'u1', email: 'me@example.com' };

describe('/api/account DELETE — the one route that deletes an auth user', () => {
  test('no token is 401 and nothing is touched', async () => {
    const db = fakeDb({ user: ME });
    const res = await DELETE(request('/api/account', { method: 'DELETE' }));
    assert.equal(res.status, 401);
    assert.equal(db.calls.length, 0);
  });

  test('a token the Auth server rejects is 401 and nothing is deleted', async () => {
    const db = fakeDb({ user: null });
    const res = await DELETE(request('/api/account', { method: 'DELETE', headers: bearer('stale') }));
    assert.equal(res.status, 401);
    assert.ok(!db.calls.some((c) => c.includes('deleteUser')), db.calls.join('\n'));
  });

  test('deletes exactly the account the token proves', async () => {
    const db = fakeDb({ user: ME });
    const res = await DELETE(request('/api/account', { method: 'DELETE', headers: bearer('good') }));
    assert.equal(res.status, 200);
    assert.ok(db.calls.includes(`auth.admin.deleteUser(${ME.id})`), db.calls.join('\n'));
  });
});

describe('/api/account/emails — connected addresses', () => {
  test('every method is 401 without a valid token', async () => {
    fakeDb({ user: null });
    const h = bearer('bad');
    assert.equal((await emails.GET(request('/api/account/emails', { headers: h }))).status, 401);
    assert.equal((await emails.POST(request('/api/account/emails', { body: { email: 'a@b.co' }, headers: { ...h, ...fromIp() } }))).status, 401);
    assert.equal((await emails.PUT(request('/api/account/emails', { method: 'PUT', body: { email: 'a@b.co', code: '123456' }, headers: h }))).status, 401);
    assert.equal((await emails.DELETE(request('/api/account/emails', { method: 'DELETE', body: { email: 'a@b.co' }, headers: h }))).status, 401);
  });

  test('a Gmail address cannot be connected — it signs in with Google', async () => {
    fakeDb({ user: ME });
    const res = await emails.POST(request('/api/account/emails', { body: { email: 'x@gmail.com' }, headers: { ...bearer('t'), ...fromIp() } }));
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { ok: false, reason: 'gmail' });
  });

  test('an address another account holds is "taken"', async () => {
    fakeDb({ user: ME, rpc: { data: 'someone-else', error: null } });
    const res = await emails.POST(request('/api/account/emails', { body: { email: 'theirs@example.com' }, headers: { ...bearer('t'), ...fromIp() } }));
    assert.equal(res.status, 409);
    assert.deepEqual(await res.json(), { ok: false, reason: 'taken' });
  });

  test('a proved code for another account does not connect to this one', async () => {
    fakeDb({
      user: ME,
      tables: {
        email_codes: { data: { purpose: 'connect', user_id: 'someone-else', code_hash: 'x', attempts: 0, expires_at: new Date(Date.now() + 60_000).toISOString() } },
      },
    });
    const res = await emails.PUT(request('/api/account/emails', { method: 'PUT', body: { email: 'a@example.com', code: '123456' }, headers: bearer('t') }));
    assert.equal(res.status, 400);
  });

  test('the last address cannot be removed', async () => {
    fakeDb({ user: ME, tables: { account_emails: { data: [] } } });
    const res = await emails.DELETE(request('/api/account/emails', { method: 'DELETE', body: { email: ME.email }, headers: bearer('t') }));
    assert.equal(res.status, 409);
    assert.deepEqual(await res.json(), { ok: false, reason: 'last' });
  });
});

describe('/api/account/stream — a guide’s own key', () => {
  test('401 without a valid token', async () => {
    fakeDb({ user: null });
    assert.equal((await stream.GET(request('/api/account/stream', { headers: bearer('bad') }))).status, 401);
    assert.equal((await stream.POST(request('/api/account/stream', { method: 'POST', headers: bearer('bad') }))).status, 401);
  });

  test('someone with no key is told so, and where their application stands', async () => {
    fakeDb({ user: ME, tables: { stream_keys: { data: null }, admins: { data: null }, guide_applications: { data: { status: 'pending' } } } });
    const res = await stream.GET(request('/api/account/stream', { headers: bearer('t') }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, approved: false, admin: false, application: 'pending' });
  });

  test('renewing a key you do not have is 404', async () => {
    fakeDb({ user: ME, tables: { stream_keys: { data: null } } });
    assert.equal((await stream.POST(request('/api/account/stream', { method: 'POST', headers: bearer('t') }))).status, 404);
  });
});
