import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useDb } from './_db.ts';
import { GET } from '../../app/api/health/route.ts';
import { GET as count } from '../../app/api/count/route.ts';

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
});

describe('/api/health', () => {
  test('everything wired is 200', async () => {
    useDb();
    const res = await GET();
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, failed: [] });
  });

  test('a missing variable is named, and the database is not asked', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const db = useDb();
    const res = await GET();
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { ok: false, failed: ['env:SUPABASE_SERVICE_ROLE_KEY'] });
    assert.equal(db.calls.length, 0);
  });

  test('a table that does not answer is named', async () => {
    useDb({ tables: { live_hours: { error: { message: 'relation does not exist' } } } });
    const res = await GET();
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { ok: false, failed: ['table:live_hours'] });
  });
});

describe('/api/count — degrades, and now says so', () => {
  test('a database failure is a 200 with null counts and no caching', async (t) => {
    const errors: unknown[][] = [];
    t.mock.method(console, 'error', (...args: unknown[]) => void errors.push(args));
    useDb({ tables: { heartbeats: { error: { message: 'down' } } } });
    const res = await count();
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.count, null);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(errors.length, 1, 'reported exactly once');
    assert.match(String(errors[0]?.[0]), /^\[api\/count\]/);
  });
});
