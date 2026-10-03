// The "secret key" Supabase asks for when Sign in with Apple is turned on.
//
//   node scripts/apple-secret.mjs ~/Downloads/AuthKey_XXXXXXXXXX.p8
//
// Apple has no static secret: it wants a short-lived JWT signed with the
// .p8 key from the developer portal. This makes one, good for six months
// (Apple's maximum), and copies it to the clipboard — it is never printed.
// Paste it into Supabase, Authentication, Providers, Apple. **It expires:**
// run this again and paste the new one before it does, or Apple sign-in
// stops working for everybody without anything else changing.
//
// The key file stays where it is and is never read by anything else. Team
// ID, Key ID and Services ID are not secret; they are the defaults below.

import { createPrivateKey, createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

const TEAM_ID = 'R598JFC7DK';
const SERVICES_ID = 'online.meditatewithme.web';
const SIX_MONTHS_S = 15_777_000; // Apple's ceiling

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/apple-secret.mjs <path to AuthKey_XXXXXXXXXX.p8>');
  process.exit(1);
}
const keyId = /^AuthKey_([A-Z0-9]{10})\.p8$/.exec(basename(file))?.[1];
if (!keyId) {
  console.error('The file should be named AuthKey_<10-character Key ID>.p8, as Apple downloads it.');
  process.exit(1);
}

const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const unsigned = `${b64({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.${b64({
  iss: TEAM_ID,
  iat: now,
  exp: now + SIX_MONTHS_S,
  aud: 'https://appleid.apple.com',
  sub: SERVICES_ID,
})}`;
const signature = createSign('SHA256')
  .update(unsigned)
  .sign({ key: createPrivateKey(readFileSync(file)), dsaEncoding: 'ieee-p1363' })
  .toString('base64url');

execFileSync('pbcopy', { input: `${unsigned}.${signature}` });
const until = new Date((now + SIX_MONTHS_S) * 1000).toISOString().slice(0, 10);
console.log(`Copied to the clipboard. Key ID ${keyId}, Services ID ${SERVICES_ID}.`);
console.log(`It stops working on ${until}. Put a reminder in your calendar a week before.`);
