#!/usr/bin/env node
/**
 * Builds `public/places.txt`, the list the origin question searches.
 *
 *   node scripts/places.mjs path/to/cities15000.txt
 *
 * The source is GeoNames' `cities15000` dump — every populated place of
 * 15,000 people or more — from https://download.geonames.org/export/dump/,
 * licensed CC BY 4.0. It is credited on the privacy page and in the first
 * line of the output.
 *
 * WHAT IS KEPT
 * The place's name and its two-letter country code, one per line, largest
 * first, so that the order of the file is the order ties are broken in.
 * Nothing else: no coordinates, because the earth places people from the
 * connection and not from what they type; no alternate names, which are
 * five times the size of everything else together. A second place with the
 * same name in the same country is dropped — "Springfield, United States"
 * is one answer, and it is the biggest one. Country names are not stored
 * either: the browser has them all, in the reader's language.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const source = process.argv[2];
if (!source) {
  console.error('usage: node scripts/places.mjs path/to/cities15000.txt');
  process.exit(1);
}

const rows = readFileSync(source, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => line.split('\t'))
  .map((c) => ({ name: c[1]?.trim(), code: c[8]?.trim(), pop: Number(c[14]) || 0 }))
  .filter((r) => r.name && /^[A-Z]{2}$/.test(r.code ?? ''))
  .sort((a, b) => b.pop - a.pop);

const seen = new Set();
const lines = [];
for (const r of rows) {
  const key = `${r.name.toLowerCase()}\t${r.code}`;
  if (seen.has(key)) continue;
  seen.add(key);
  lines.push(`${r.name.replace(/\s+/g, ' ')}\t${r.code}`);
}

const header = `# GeoNames cities15000 (geonames.org), CC BY 4.0. Built ${new Date().toISOString().slice(0, 10)} by scripts/places.mjs.`;
writeFileSync('public/places.txt', `${header}\n${lines.join('\n')}\n`);
console.log(`${lines.length} places written to public/places.txt`);
