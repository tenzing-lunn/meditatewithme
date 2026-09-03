#!/usr/bin/env node
/**
 * Confirm captured sessions into TIMELOG.md.
 *
 * The hooks in .claude/hooks/ capture wall-clock automatically. Wall-clock is
 * an upper bound and usually a poor one — it counts the twenty minutes an agent
 * ran while you were elsewhere. So nothing reaches TIMELOG.md until a human
 * says what the engaged time actually was.
 *
 * That confirmation is the whole point. An automatically-written hours figure
 * is a fabricated hours figure, and this project bills by the hour.
 *
 *   npm run timelog          list unconfirmed sessions
 *   npm run timelog -- 45 20 confirm them in order, in minutes ("-" to skip)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const PENDING = '.timelog/pending.tsv';
const LOG = 'TIMELOG.md';

if (!existsSync(PENDING)) {
  console.log('Nothing captured yet. The hooks write here when a session ends.');
  process.exit(0);
}

const all = readFileSync(PENDING, 'utf8')
  .split('\n').filter(Boolean)
  .map((l) => {
    const [date, from, to, mins, reason, commits] = l.split('\t');
    return { date, from, to, mins: Number(mins), reason, commits };
  });

// A session that never closed (crash, killed terminal) has a start and no end.
// It cannot be confirmed here because there is no ceiling to check against —
// add its row to TIMELOG.md by hand, from memory, or skip it.
const unclosed = all.filter((r) => r.reason === 'unclosed');
const rows = all
  .filter((r) => r.reason !== 'unclosed')
  .filter((r) => r.mins >= 2); // a session opened and shut is not work

if (unclosed.length) {
  console.log(`\n${unclosed.length} session(s) never closed — no end time, so not confirmable here. Log by hand:`);
  unclosed.forEach((r) => console.log(`  ${r.date}  from ${r.from}  ${r.commits === '-' ? 'no commits' : r.commits}`));
}

// Two Claude windows open at once are one person working, not two. Flag rows
// that overlap the previous one so the same minutes are not confirmed twice.
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
rows.forEach((r, i) => {
  r.overlaps = rows.slice(0, i).some((p) => p.date === r.date && toMin(r.from) < toMin(p.to) && toMin(r.to) > toMin(p.from));
});

if (rows.length === 0) {
  if (unclosed.length) writeFileSync(PENDING, unclosed.map((r) => [r.date, r.from, r.to, r.mins, r.reason, r.commits].join('\t')).join('\n') + '\n');
  console.log('Nothing to confirm.');
  process.exit(0);
}

const given = process.argv.slice(2);

if (given.length === 0) {
  console.log(`\n${rows.length} unconfirmed session${rows.length === 1 ? '' : 's'}:\n`);
  rows.forEach((r, i) => {
    const h = (r.mins / 60).toFixed(2);
    console.log(`  ${i + 1}. ${r.date}  ${r.from}–${r.to}  open ${h}h  ${r.commits === '-' ? 'no commits' : r.commits}${r.overlaps ? '  ⚠ overlaps an earlier row — count these minutes once' : ''}`);
  });
  console.log(`\nOpen time is a CEILING, not your engaged time.`);
  console.log(`Confirm with minutes in this order, "-" to skip:\n`);
  console.log(`  npm run timelog -- ${rows.map(() => '30').join(' ')}\n`);
  process.exit(0);
}

if (given.length !== rows.length) {
  console.error(`Got ${given.length} values for ${rows.length} sessions. One per session, "-" to skip.`);
  process.exit(1);
}

const confirmed = [];
rows.forEach((r, i) => {
  if (given[i] === '-') return;
  const m = Number(given[i]);
  if (!Number.isFinite(m) || m < 0) {
    console.error(`"${given[i]}" is not a number of minutes.`);
    process.exit(1);
  }
  if (m > r.mins) {
    console.error(`Session ${i + 1}: ${m}min engaged but the session was only open ${r.mins}min. Refusing.`);
    process.exit(1);
  }
  confirmed.push({ ...r, engaged: m });
});

if (confirmed.length === 0) { console.log('All skipped, nothing written.'); process.exit(0); }

let log = readFileSync(LOG, 'utf8');
const anchor = '| | | **— / 55** | | |';
if (!log.includes(anchor)) {
  console.error(`Could not find the total row in ${LOG}. Add rows by hand.`);
  process.exit(1);
}
const added = confirmed.map((c) => {
  const d = new Date(`${c.date}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return `| ${d} | ${c.from}–${c.to} | **${(c.engaged / 60).toFixed(2)}h** | _describe what landed_ | ${c.commits} |`;
}).join('\n');

writeFileSync(LOG, log.replace(anchor, `${added}\n${anchor}`));
// Keep unclosed rows until they are dealt with by hand; clear everything else.
writeFileSync(PENDING, unclosed.length ? unclosed.map((r) => [r.date, r.from, r.to, r.mins, r.reason, r.commits].join('\t')).join('\n') + '\n' : '');

const total = confirmed.reduce((a, c) => a + c.engaged, 0) / 60;
console.log(`Wrote ${confirmed.length} row(s), ${total.toFixed(2)}h, to ${LOG}.`);
console.log(`Now fill in "describe what landed" — that part is not automatic either.`);
