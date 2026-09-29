// Stream keys for live video.
//
//   npm run live:key -- new "Anna"      make a key and print how to use it
//   npm run live:key -- list            everyone, and who is live
//   npm run live:key -- revoke <slug>   stop a key working at its next publish
//
// The key is shown once, at creation, and never stored — only its SHA-256.
// Lose it and make a new one. Reads .env.local (see package.json); needs
// SUPABASE_SERVICE_ROLE_KEY, and LIVE_INGEST_HOST for the printed addresses.

import { createHash, randomBytes, randomInt } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const host = process.env.LIVE_INGEST_HOST || 'localhost';
// Anywhere but this Mac, keys go over RTMPS (infra/mediamtx/README.md, step 7).
const rtmp =
  host === 'localhost' ? `rtmp://${host}:1935/live` : `rtmps://${host}:1936/live`;

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const newSlug = () =>
  Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

const [command, arg] = process.argv.slice(2);

if (command === 'new') {
  const name = (arg ?? '').trim();
  if (!name || name.length > 60) {
    console.error('Usage: npm run live:key -- new "Name" (1–60 characters)');
    process.exit(1);
  }
  const slug = newSlug();
  const key = randomBytes(32).toString('base64url');
  const key_hash = createHash('sha256').update(key).digest('hex');
  const { error } = await db.from('stream_keys').insert({ slug, name, key_hash });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(`
Key for ${name} — shown once. Send it privately.

  OBS / most apps
    Server      ${rtmp}
    Stream key  ${slug}?key=${key}

  Moblin (iPhone) — all of it in the URL box, its stream key box left empty
    ${rtmp}/${slug}?key=${key}

  SRT (Moblin, Larix, OBS) — not encrypted; prefer the above over the internet
    srt://${host}:8890?streamid=publish:live/${slug}:key:${key}

  Slug (public): ${slug}
`);
} else if (command === 'list') {
  const { data, error } = await db
    .from('stream_keys')
    .select('slug, name, created_at, revoked_at, live_since, live_seen, live_server')
    .order('created_at');
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  const now = Date.now();
  for (const r of data) {
    // 90 s: LIVE_STALE_MS in lib/live.ts, the same rule /api/live uses.
    const live =
      r.live_seen && now - Date.parse(r.live_seen) < 90_000
        ? `LIVE since ${r.live_since} on ${r.live_server ?? '?'}`
        : '';
    const state = r.revoked_at ? `revoked ${r.revoked_at}` : live;
    console.log(`${r.slug}  ${r.name.padEnd(24)} ${state}`);
  }
  if (data.length === 0) console.log('No keys yet.');
} else if (command === 'revoke') {
  if (!arg) {
    console.error('Usage: npm run live:key -- revoke <slug>');
    process.exit(1);
  }
  const { data, error } = await db
    .from('stream_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('slug', arg)
    .is('revoked_at', null)
    .select('slug, name');
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(
    data.length
      ? `Revoked ${data[0].name} (${arg}). The site stops showing it within seconds; the key is refused at their next connection.`
      : `No active key ${arg}.`,
  );
} else {
  console.error('Usage: npm run live:key -- new "Name" | list | revoke <slug>');
  process.exit(1);
}
