// Cuts the beds in public/sounds/ from their Freesound originals.
//
//   node --experimental-strip-types scripts/build-sounds.mjs <dir>
//
// <dir> holds one file per bed named by slug (rain.mp3, wind.mp3, ...),
// downloaded from the Freesound pages listed in lib/beds.ts. Needs ffmpeg.
// A drum.mp3 there (any format ffmpeg reads) rebuilds the recorded bell too.
//
// For each bed: the stretch lib/beds.ts names is decoded to 48 kHz stereo,
// its last CROSSFADE_SECONDS folded over its first so the loop has no seam,
// padded with PAD_SECONDS of itself at either end (see lib/beds.ts for why),
// set to a common loudness, and encoded as 128 kbps MP3.
//
// Loudness is K-weighted to ITU-R BS.1770: every bed to -20 LUFS, with a
// limiter holding peaks under -1 dBFS. Real recordings have a few spikes far
// above their average — one pop in the fire, one wave harder than the rest —
// and matching loudness without a limiter meant those few samples held whole
// beds 10 to 17 dB under the others. The limiter takes at most MAX_LIMIT_DB
// off any spike; a bed that would need more sits under -20 by the difference
// rather than being squashed, and the script says so. The same numbers
// omarchy-ambient settled on for loops cut from some of these recordings.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import { BED_SOURCES, CROSSFADE_SECONDS, DRUM_SOURCE, PAD_SECONDS } from '../lib/beds.ts';

const RATE = 48_000;
const TARGET_LUFS = -20;
const PEAK_CEILING_DB = -1;
const MAX_LIMIT_DB = 8;
/** The limiter's window: long enough not to distort, short enough not to pump. */
const LIMIT_WINDOW = Math.round(0.01 * RATE);
const OUT = path.join(import.meta.dirname, '..', 'public', 'sounds');

const dir = process.argv[2];
if (!dir) {
  console.error('usage: build-sounds.mjs <dir of originals>');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

function decode(file, start, seconds) {
  const raw = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-ss', String(start), '-t', String(seconds), '-i', file,
      '-ac', '2', '-ar', String(RATE), '-f', 'f32le', '-'],
    { maxBuffer: 1 << 30 },
  );
  const all = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  const n = all.length / 2;
  const ch = [new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) {
    ch[0][i] = all[2 * i];
    ch[1][i] = all[2 * i + 1];
  }
  return ch;
}

/** The tail folded over the head, equal power: a loop of exactly `length`. */
function circular(x, length, fade) {
  const out = x.slice(0, length);
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    out[i] = x[i] * Math.sqrt(t) + x[length + i] * Math.sqrt(1 - t);
  }
  return out;
}

function biquad(x, b, a) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

/** BS.1770 integrated loudness, ungated: these are steady beds. */
function lufs(channels) {
  let sum = 0;
  for (const c of channels) {
    let k = biquad(c, [1.53512485958697, -2.69169618940638, 1.19839281085285],
      [1, -1.69065929318241, 0.73248077421585]);
    k = biquad(k, [1, -2, 1], [1, -1.99004745483398, 0.99007225036621]);
    let ms = 0;
    for (const v of k) ms += v * v;
    sum += ms / k.length;
  }
  return -0.691 + 10 * Math.log10(sum);
}

/**
 * A look-ahead brick-wall limiter, stereo-linked and circular, because the
 * loop has no ends: its last sample runs into its first.
 *
 * The gain each sample needs to stay under the ceiling, then the minimum of
 * that over a window either side, then a moving average over the same
 * window. Averaging a curve that was min-filtered over the window it is
 * averaged over never exceeds what any sample inside needed, so nothing
 * passes the ceiling, and the gain moves over twenty milliseconds rather
 * than jumping. In place; returns the most reduction applied, in dB, and
 * the share of the loop limited by more than 1 dB.
 */
function limit(channels, ceiling) {
  const n = channels[0].length;
  const w = LIMIT_WINDOW;
  const need = (i) => {
    const k = ((i % n) + n) % n;
    const p = Math.max(Math.abs(channels[0][k]), Math.abs(channels[1][k]));
    return p > ceiling ? ceiling / p : 1;
  };

  // Sliding minimum over [i - w, i + w], with a monotonic deque.
  const floor = new Float64Array(n + 2 * w);
  const deque = [];
  let head = 0;
  const values = new Float64Array(n + 4 * w);
  for (let k = 0; k < values.length; k++) values[k] = need(k - 2 * w);
  for (let k = 0; k < values.length; k++) {
    while (deque.length > head && values[deque[deque.length - 1]] >= values[k]) deque.pop();
    deque.push(k);
    if (deque[head] <= k - (2 * w + 1)) head++;
    // values[k] is sample k - 2w; the window centred on sample c = k - 3w.
    const c = k - 3 * w;
    if (c >= -w && c < n + w) floor[c + w] = values[deque[head]];
  }

  // Moving average of the floor over the same window, for samples 0..n-1.
  const prefix = new Float64Array(floor.length + 1);
  for (let k = 0; k < floor.length; k++) prefix[k + 1] = prefix[k] + floor[k];
  let most = 1;
  let touched = 0;
  for (let i = 0; i < n; i++) {
    const gain = (prefix[i + 2 * w + 1] - prefix[i]) / (2 * w + 1);
    if (gain < 0.891) touched++;
    channels[0][i] *= gain;
    channels[1][i] *= gain;
    if (gain < most) most = gain;
  }
  return { most: -20 * Math.log10(most), share: touched / n };
}

function peakDb(channels) {
  let p = 0;
  for (const c of channels) for (const v of c) p = Math.max(p, Math.abs(v));
  return 20 * Math.log10(p);
}

for (const bed of BED_SOURCES) {
  const length = Math.round(bed.loop * RATE);
  const fade = Math.round(CROSSFADE_SECONDS * RATE);
  const pad = Math.round(PAD_SECONDS * RATE);

  // Only the beds whose originals are in <dir> are rebuilt; the rest keep
  // the files already in public/sounds/.
  const file = path.join(dir, `${bed.slug}.mp3`);
  if (!existsSync(file)) {
    console.log(`${bed.slug.padEnd(10)} skipped: no ${bed.slug}.mp3 in ${dir}`);
    continue;
  }
  const src = decode(file, bed.start, bed.loop + CROSSFADE_SECONDS);
  if (src[0].length < length + fade) {
    throw new Error(`${bed.slug}: the recording is shorter than start + loop + crossfade`);
  }
  const loop = src.map((c) => circular(c, length, fade));

  const loudness = lufs(loop);
  const peak = peakDb(loop);
  // How far over the ceiling the loudest spike would land at the target, and
  // how far under the target the bed sits if that is more than the limiter
  // is allowed to take.
  const over = peak + (TARGET_LUFS - loudness) - PEAK_CEILING_DB;
  const target = TARGET_LUFS - Math.max(0, over - MAX_LIMIT_DB);
  const gain = 10 ** ((target - loudness) / 20);
  for (const c of loop) for (let i = 0; i < c.length; i++) c[i] *= gain;
  const limited = limit(loop, 10 ** (PEAK_CEILING_DB / 20));

  // [the loop's last second][the loop][the loop's first second]
  const total = length + 2 * pad;
  const interleaved = new Float32Array(total * 2);
  for (let i = 0; i < total; i++) {
    const at = (i - pad + length) % length;
    interleaved[2 * i] = loop[0][at];
    interleaved[2 * i + 1] = loop[1][at];
  }
  const out = path.join(OUT, `${bed.slug}.mp3`);
  execFileSync(
    'ffmpeg',
    ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(RATE), '-ac', '2', '-i', '-',
      '-c:a', 'libmp3lame', '-b:a', '128k', out],
    { input: Buffer.from(interleaved.buffer) },
  );
  console.log(
    `${bed.slug.padEnd(10)} measured ${loudness.toFixed(2)} LUFS, peak ${peak.toFixed(1)} dBFS` +
      ` -> ${lufs(loop).toFixed(2)} LUFS, peak ${peakDb(loop).toFixed(1)} dBFS, limited ${limited.most.toFixed(1)} dB at most, over 1 dB for ${(limited.share * 100).toFixed(2)}% of it` +
      (target < TARGET_LUFS ? ` (held ${(TARGET_LUFS - target).toFixed(1)} dB under)` : ''),
  );
}

// The recorded bell: not a loop, so no crossfade or padding. The first
// DRUM_SOURCE.seconds, its last BELL_FADE seconds faded to nothing, the peak
// set to BELL_PEAK_DB. Loudness is left to the peak: a bell is judged by its
// strike, and the synthesised ones are pinned by peak too (PEAK in audio.ts).
const BELL_PEAK_DB = -3;
const BELL_FADE = 3;
const drum = path.join(dir, 'drum.mp3');
if (existsSync(drum)) {
  const bell = decode(drum, 0, DRUM_SOURCE.seconds);
  const gain = 10 ** ((BELL_PEAK_DB - peakDb(bell)) / 20);
  const n = bell[0].length;
  const fade = Math.round(BELL_FADE * RATE);
  const interleaved = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const t = Math.min(1, (n - i) / fade);
    const g = gain * Math.sin((t * Math.PI) / 2);
    interleaved[2 * i] = bell[0][i] * g;
    interleaved[2 * i + 1] = bell[1][i] * g;
  }
  execFileSync(
    'ffmpeg',
    ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(RATE), '-ac', '2', '-i', '-',
      '-c:a', 'libmp3lame', '-b:a', '192k', path.join(OUT, 'drum.mp3')],
    { input: Buffer.from(interleaved.buffer) },
  );
  console.log(`drum       ${DRUM_SOURCE.seconds} s, raised ${(20 * Math.log10(gain)).toFixed(1)} dB to peak ${BELL_PEAK_DB} dBFS`);
} else {
  console.log(`drum       skipped: no drum.mp3 in ${dir}`);
}
