/**
 * The pond: where the stones lie, how their rings spread, and how your stone
 * skims in. Pure arithmetic, no drawing — `components/Pond.tsx` draws it.
 *
 * Every position here is in pixels of the pond's own box, and every time in
 * seconds. Nothing reads a clock: the caller passes `t`.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * One ring on the water: centre, radius, how much of it is left (0..1), and
 * how thick its line is in pixels (1 when not given).
 */
export interface Ring {
  x: number;
  y: number;
  r: number;
  o: number;
  yours: boolean;
  w?: number;
}

/**
 * Something that rings on a fixed period. Only the still picture drawn under
 * reduced motion uses it now: anything that moves rings in trains and
 * breaths (below), because rings on a period read as a beat.
 */
export interface Source {
  x: number;
  y: number;
  /** How far a ring gets before it is gone. */
  reach: number;
  /** Seconds between rings. */
  period: number;
  /** Seconds a ring lasts. */
  life: number;
  /** Seconds added to `t`, so neighbours do not ring in step. */
  phase: number;
  /** 0..1, the ring's opacity as it leaves the stone. */
  strength: number;
  yours: boolean;
}

/**
 * Every ring on the water at `t`. A ring starts at the stone, slows as it
 * spreads (the 0.75 power), and fades faster than it grows (the 1.7 power),
 * so the water near a stone is busier than the water between them.
 */
export function ringsAt(t: number, sources: readonly Source[]): Ring[] {
  const out: Ring[] = [];
  for (const s of sources) {
    for (let k = 0; k * s.period < s.life; k++) {
      const a = (((t + s.phase) % s.period) + s.period) % s.period + k * s.period;
      if (a > s.life) continue;
      const u = a / s.life;
      out.push({
        x: s.x,
        y: s.y,
        r: 3 + u ** 0.75 * s.reach,
        o: Math.min(1, a / 0.5) * (1 - u) ** 1.7 * s.strength,
        yours: s.yours,
      });
    }
  }
  return out;
}

/** How far a stone's rings reach, from the size of the pond. */
export function reachFor(width: number, height: number): number {
  return 0.066 * (width + height);
}


/**
 * A ring train: what the water does when something drops into it. Not one
 * ring but a leading ring and a few behind it, each leaving a little later
 * than the last and closer behind it, each smaller and fainter. Every ring
 * slows as it spreads, thins, and fades as its energy spreads over a longer
 * circle (the amplitude goes as one over the square root of the radius);
 * then the water is still again.
 */
export interface Train {
  x: number;
  y: number;
  /** How far the leading ring gets, in pixels. */
  reach: number;
  /** Seconds the leading ring lasts. */
  life: number;
  /** Rings in the train, the leading one included. */
  rings: number;
  /** 0..1, the leading ring's opacity as it leaves. */
  strength: number;
  /** The leading ring's line as it leaves, in pixels. */
  width: number;
  /** Seconds a ring takes to come up: a splash is quick, a breath is slow. */
  rise: number;
  yours: boolean;
}

/** The shape of every train, whatever its size. */
export const TRAIN = {
  /** The first ring behind the leader leaves this fraction of `life` later… */
  lag: 0.045,
  /** …and each after it this much closer behind the one in front. */
  closing: 0.72,
  /** Each ring behind is this much fainter than the one in front. */
  fainter: 0.6,
  /** And reaches this much less far (a fraction of `reach`, per ring). */
  shorter: 0.12,
  /** How hard a ring slows: the ease-out exponent of its radius. */
  slowing: 2.4,
  /** Where thinning with distance takes hold, as a fraction of `reach`. */
  spread: 0.3,
} as const;

/** Seconds after the leading ring that ring `j` of a train leaves. */
export function trainDelay(j: number, life: number): number {
  return (life * TRAIN.lag * (1 - TRAIN.closing ** j)) / (1 - TRAIN.closing);
}

/** The rings of one train `a` seconds after it was set off. Nothing before, nothing once it is spent. */
export function trainAt(a: number, s: Train): Ring[] {
  const out: Ring[] = [];
  if (!(a >= 0)) return out;
  const r0 = 1.5;
  const ref = TRAIN.spread * s.reach;
  for (let j = 0; j < s.rings; j++) {
    const age = a - trainDelay(j, s.life);
    const life = s.life * (1 - 0.08 * j);
    if (age < 0 || age > life) continue;
    const u = age / life;
    const r = r0 + s.reach * (1 - TRAIN.shorter * j) * (1 - (1 - u) ** TRAIN.slowing);
    const o =
      s.strength *
      TRAIN.fainter ** j *
      smooth(age / s.rise) *
      Math.sqrt((ref + r0) / (ref + r)) *
      (1 - u) ** 1.3;
    out.push({
      x: s.x,
      y: s.y,
      r,
      o,
      yours: s.yours,
      w: Math.max(0.5, s.width * (0.55 + 0.45 * (1 - u)) * (1 - 0.18 * j)),
    });
  }
  return out;
}

/**
 * Your stone while you sit: now and then the water over it stirs, one soft
 * ring, never on a beat. The gaps are drawn from a slow random process,
 * seeded, so the same sitting always breathes the same way: short at first
 * while the water is still unsettled from the landing, stretching over the
 * first minute or so to about one every twelve seconds, sometimes six,
 * sometimes twenty. Two gaps in a row are never nearly the same length.
 */
export const BREATH = {
  /** Seconds after the landing of the first breath, at the earliest. */
  first: 5.5,
  /** The mean gap just after the landing, and where it settles. */
  early: 4.5,
  settled: 12,
  /** Seconds over which the gaps stretch from `early` towards `settled`. */
  tau: 22,
  /** Seconds a breath's ring lasts, and how long it takes to come up. */
  life: 10,
  rise: 1.4,
  /** How faint it is beside the landing (0..1), at most. */
  strength: 0.34,
  /** How far off the stone's centre a breath can come up, in pixels. */
  drift: 4,
} as const;

/** The gap after the breath at `s` seconds, the `k`th, following a gap of `prev`. */
function breathGap(seed: number, k: number, s: number, prev: number): number {
  const m = BREATH.settled - (BREATH.settled - BREATH.early) * Math.exp(-s / BREATH.tau);
  // Half the mean plus an exponential part, capped: never two at once, never a long silence.
  const x = Math.min(1.5, -0.5 * Math.log(1 - unit(seed, 4 * k)));
  const g = m * (0.5 + x);
  // Nearly the gap before it would start to sound like a beat: move it well off.
  if (prev > 0 && Math.abs(g - prev) < 0.18 * prev) return prev >= m ? prev * 0.62 : prev * 1.45;
  return g;
}

/** Start times of every breath, from the landing, out to at least `until`. Kept, per seed. */
const schedules = new Map<number, number[]>();

export function breathTimes(until: number, seed: number): number[] {
  let s = schedules.get(seed);
  if (!s) {
    s = [BREATH.first + 2 * unit(seed, 1_000_003)];
    if (schedules.size > 8) schedules.clear();
    schedules.set(seed, s);
  }
  while (s[s.length - 1]! <= until) {
    const k = s.length;
    const last = s[k - 1]!;
    const prev = k > 1 ? last - s[k - 2]! : 0;
    s.push(last + breathGap(seed, k, last, prev));
  }
  return s;
}

/** Your stone's breaths at `since` seconds after it landed. */
export function breathsAt(since: number, at: Point, reach: number, seed: number): Ring[] {
  const out: Ring[] = [];
  if (!(since >= 0)) return out;
  const times = breathTimes(since, seed);
  // The schedule only grows; find the first that could still be showing.
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid]! < since - BREATH.life) lo = mid + 1;
    else hi = mid;
  }
  for (let k = lo; k < times.length && times[k]! <= since; k++) {
    out.push(
      ...trainAt(since - times[k]!, {
        x: at.x + (unit(seed, 4 * k + 1) - 0.5) * 2 * BREATH.drift,
        y: at.y + (unit(seed, 4 * k + 2) - 0.5) * 2 * BREATH.drift,
        reach,
        life: BREATH.life,
        rings: 1,
        strength: BREATH.strength * (0.6 + 0.4 * unit(seed, 4 * k + 3)),
        width: 1.1,
        rise: BREATH.rise,
        yours: true,
      }),
    );
  }
  return out;
}

/**
 * The skim, as it looks from the bank: the stone leaves the hand low and
 * flat, hops, touches, hops again, each hop shorter, lower and quicker than
 * the one before, the whole throw one long deceleration. Once it is too slow
 * to leave the water it slides a little way on the surface, stops, and sinks.
 */
export interface SkimConfig {
  from: Point;
  to: Point;
  /** Touches on the water. */
  n: number;
  /** Each hop takes this fraction of the time of the one before. */
  ratio: number;
  /** Seconds from release to the stop. */
  T: number;
  /** The part of `T` spent hopping; the rest is the slide to the stop. */
  hops: number;
  /** How hard it decelerates: the ease-out exponent. */
  k: number;
  /** Lift at the top of the first hop, in pixels. Small: a skim, not a bounce. */
  H: number;
  /** How far the path bows to one side, in pixels. */
  bend: number;
  /** Seconds it takes to sink once it has stopped. */
  sink: number;
  /** Degrees it turns over the whole throw, slowing as it slows. */
  spin: number;
}

export interface SkimFrame {
  /**
   * Where the stone is on the water, its lift above it, how far it has sunk
   * (0..1), how far it has turned (degrees), and how much of it shows (0..1:
   * it comes out of the hand and fades as it goes under).
   */
  stone: Point & { h: number; sunk: number; spin: number; o: number };
  /** Every touch so far, with its age in seconds and how hard it hit (0..1). */
  touches: (Point & { age: number; k: number })[];
  /** Seconds after release that it stops. */
  stopAt: number;
}

/**
 * A pebble flicked from the shore to wherever the water was touched: the
 * same throw, quicker. It always takes `T` seconds however far it goes, so a
 * long throw skips more times and flies faster; a short one is two or three
 * soft touches. The bow's side is the caller's (`side`, ±1), so a run of
 * throws do not all curve the same way.
 */
export function flickConfig(from: Point, to: Point, side: 1 | -1, T = 1.9): SkimConfig {
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  return {
    from,
    to,
    n: Math.max(3, Math.min(9, Math.round(d / 75))),
    ratio: 0.8,
    T,
    hops: 0.8,
    k: 2,
    H: 4,
    bend: side * Math.min(40, d * 0.1),
    sink: 0.7,
    spin: 70,
  };
}

export function skimConfig(from: Point, to: Point, width: number, height: number): SkimConfig {
  const phone = width < 640;
  return {
    from,
    to,
    n: phone ? 8 : 10,
    ratio: 0.8,
    T: phone ? 4.4 : 5,
    hops: 0.74,
    k: 2.2,
    H: phone ? 6 : 8,
    bend: Math.min(60, 0.04 * (width + height)),
    sink: 1.1,
    spin: 110,
  };
}

/** When each touch happens, in seconds after release: `n` of them, the gaps shrinking by `ratio`. */
export function touchTimes(c: SkimConfig): number[] {
  let sum = 0;
  for (let i = 0; i < c.n; i++) sum += c.ratio ** i;
  const out: number[] = [];
  let acc = 0;
  for (let i = 0; i < c.n; i++) {
    acc += c.ratio ** i;
    // The last is exactly the end of the hops, not a hair either side.
    out.push(i === c.n - 1 ? c.hops * c.T : (c.hops * c.T * acc) / sum);
  }
  return out;
}

/** Where the throw is `t` seconds after it left the hand. */
export function skimAt(t: number, c: SkimConfig): SkimFrame {
  const dx = c.to.x - c.from.x;
  const dy = c.to.y - c.from.y;
  const dl = Math.hypot(dx, dy) || 1;
  const at = (f: number): Point => {
    const b = Math.sin(Math.PI * f) * c.bend;
    return {
      x: c.from.x + dx * f - (dy / dl) * b,
      y: c.from.y + dy * f + (dx / dl) * b,
    };
  };
  // One deceleration across the whole throw, reaching nothing at the stop;
  // each touch is a moment on it.
  const along = (time: number) => 1 - (1 - clamp01(time / c.T)) ** c.k;
  const f = along(t);
  const p = at(f);

  const times = touchTimes(c);
  const first = times[0]!;
  const touches: SkimFrame['touches'] = [];
  let h = 0;
  let t0 = 0;
  for (let i = 0; i < c.n; i++) {
    const t1 = times[i]!;
    // A hop's height goes as the square of its time in the air.
    const lift = c.H * ((t1 - t0) / first) ** 2;
    if (t >= t1) {
      touches.push({ ...at(along(t1)), age: t - t1, k: (t1 - t0) / first });
    } else if (t >= t0) {
      const v = (t - t0) / (t1 - t0);
      h = lift * 4 * v * (1 - v);
    }
    t0 = t1;
  }
  const sunk = clamp01((t - c.T) / c.sink);
  return {
    stone: { ...p, h, sunk, spin: c.spin * f, o: smooth(t / 0.2) * (1 - smooth(sunk)) },
    touches,
    stopAt: c.T,
  };
}

/** The little train each touch leaves: bigger for the early, harder hits, all smaller than the landing. */
export function touchRings(touches: SkimFrame['touches'], scale = 1): Ring[] {
  const out: Ring[] = [];
  for (const q of touches) {
    out.push(
      ...trainAt(q.age, {
        x: q.x,
        y: q.y,
        reach: scale * (22 + 46 * q.k),
        life: 1.6 + 1.2 * q.k,
        rings: q.k > 0.35 ? 3 : 2,
        strength: 0.45 + 0.35 * q.k,
        width: 1,
        rise: 0.08,
        yours: false,
      }),
    );
  }
  return out;
}

/** 0..1 → 0..1, eased at both ends; clamped outside. */
export function smooth(v: number): number {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
}

/** A number in [0, 1) from a seed and an index, the same every time. */
function unit(seed: number, k: number): number {
  let x = (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(k + 1, 0xc2b2ae35)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
