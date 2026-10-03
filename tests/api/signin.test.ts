import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { useDb } from './_db.ts';
import { fromIp, request } from './_request.ts';
import { POST, PUT } from '../../app/api/signin/route.ts';

const EMAIL = 'ana@example.com';
const future = () => new Date(Date.now() + 5 * 60_000).toISOString();
const hashOf = (code: string) =>
  createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').update(`${EMAIL}:${code}`).digest('hex');

describe('/api/signin POST — asking for a code', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = '';
  });

  test('an address this route does not know is passed to Supabase', async () => {
    useDb({ tables: { account_emails: { data: null } } });
    const res = await POST(request('/api/signin', { body: { email: EMAIL }, headers: fromIp() }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { kind: 'account' });
  });

  test('a malformed address is treated the same, without touching the database', async () => {
    const db = useDb();
    const res = await POST(request('/api/signin', { body: { email: 'not an email' }, headers: fromIp() }));
    assert.deepEqual(await res.json(), { kind: 'account' });
    assert.equal(db.calls.length, 0);
  });

  test('a connected address with no mail key is 503, and says so', async () => {
    useDb({ tables: { account_emails: { data: { user_id: 'u1' } } } });
    const res = await POST(request('/api/signin', { body: { email: EMAIL }, headers: fromIp() }));
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { kind: 'connected', ok: false, reason: 'unavailable' });
  });

  test('one address may ask five times a minute, then waits', async () => {
    useDb({ tables: { account_emails: { data: null } } });
    const ip = fromIp('198.51.100.7');
    for (let i = 0; i < 5; i++) {
      assert.equal((await POST(request('/api/signin', { body: { email: EMAIL }, headers: ip }))).status, 200);
    }
    const res = await POST(request('/api/signin', { body: { email: EMAIL }, headers: ip }));
    assert.equal(res.status, 429);
    assert.equal((await res.json()).reason, 'wait');
  });
});

describe('/api/signin PUT — proving a code', () => {
  const put = (body: unknown) => PUT(request('/api/signin', { method: 'PUT', body }));

  test('a code that is not six digits is refused before the database', async () => {
    const db = useDb();
    assert.equal((await put({ email: EMAIL, code: '12' })).status, 400);
    assert.equal((await put({ email: EMAIL, code: 123456 })).status, 400);
    assert.equal((await put({ email: EMAIL })).status, 400);
    assert.equal(db.calls.length, 0);
  });

  test('no code outstanding is "dead"', async () => {
    useDb({ tables: { email_codes: { data: null } } });
    const res = await put({ email: EMAIL, code: '123456' });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { ok: false, reason: 'dead' });
  });

  test('a code issued for another purpose is "dead"', async () => {
    useDb({
      tables: {
        email_codes: { data: { purpose: 'connect', user_id: 'u1', code_hash: hashOf('123456'), attempts: 0, expires_at: future() } },
      },
    });
    assert.deepEqual(await (await put({ email: EMAIL, code: '123456' })).json(), { ok: false, reason: 'dead' });
  });

  test('a spent code (five tries) is "dead"', async () => {
    useDb({
      tables: {
        email_codes: { data: { purpose: 'sign-in', user_id: 'u1', code_hash: hashOf('123456'), attempts: 5, expires_at: future() } },
      },
    });
    assert.deepEqual(await (await put({ email: EMAIL, code: '123456' })).json(), { ok: false, reason: 'dead' });
  });

  test('a wrong code is "wrong" and counts against the five', async () => {
    const db = useDb({
      tables: {
        email_codes: { data: { purpose: 'sign-in', user_id: 'u1', code_hash: hashOf('123456'), attempts: 1, expires_at: future() } },
      },
    });
    const res = await put({ email: EMAIL, code: '000000' });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { ok: false, reason: 'wrong' });
    assert.ok(db.calls.some((c) => c.startsWith('email_codes.update({"attempts":2}')), db.calls.join('\n'));
  });

  test('the right code is spent and trades for a token hash of the main address', async () => {
    const db = useDb({
      tables: {
        email_codes: { data: { purpose: 'sign-in', user_id: 'u1', code_hash: hashOf('123456'), attempts: 0, expires_at: future() } },
      },
      users: { u1: { id: 'u1', email: 'main@example.com' } },
    });
    const res = await put({ email: EMAIL, code: '123456' });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, tokenHash: 'hash-123' });
    assert.ok(db.calls.some((c) => c.startsWith('email_codes.delete')));
  });
});
