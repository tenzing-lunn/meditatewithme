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

/** One ring on the water: centre, radius, and how much of it is left (0..1). */
export interface Ring {
  x: number;
  y: number;
  r: number;
  o: number;
  yours: boolean;
}

/** Something that makes rings: a stone somebody is sitting as. */
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

/** How far a stranger's rings reach, from the size of the pond. */
export function reachFor(width: number, height: number): number {
  return 0.066 * (width + height);
}

/**
 * A stable place on the pond for a key, as a fraction of the box.
 *
 * Stones are not put where people are on the earth: a map of the world
 * crowds Europe and empties the Pacific, and the pond is not a map. Each key
 * hashes to its own spot and keeps it while it is there, so a stone never
 * jumps when somebody else arrives. A spot too close to your own stone, or
 * under the words, is skipped and the next one tried.
 */
export function spotFor(
  key: string,
  avoid: (p: Point) => boolean,
): Point {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let p: Point = { x: 0.5, y: 0.5 };
  for (let tries = 0; tries < 24; tries++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const a = ((h >>> 0) % 10007) / 10007;
    const b = (Math.floor((h >>> 0) / 10007) % 10009) / 10009;
    p = { x: 0.06 + a * 0.88, y: 0.12 + b * 0.8 };
    if (!avoid(p)) return p;
  }
  return p;
}

/**
 * The skim, as a professional throws it: low and flat, one long
 * deceleration, each touch a shorter hop than the last, spinning so slowly
 * that the turn is barely seen. Then it stops, sinks, and leaves its rings.
 */
export interface SkimConfig {
  from: Point;
  to: Point;
  /** Touches on the water. */
  n: number;
  /** Each hop is this fraction of the one before. */
  ratio: number;
  /** Seconds from release to the stop. */
  T: number;
  /** How hard it decelerates: the ease-out exponent. */
  k: number;
  /** Lift at the top of the first hop, in pixels. Small: a skim, not a bounce. */
  H: number;
  /** How far the path bows to one side, in pixels. */
  bend: number;
  /** Seconds it takes to sink once it has stopped. */
  sink: number;
}

export interface SkimFrame {
  /** Where the stone is, its lift above the water, and how far it has sunk (0..1). */
  stone: Point & { h: number; sunk: number; spin: number };
  /** Every touch so far, with its age in seconds and its strength (0..1). */
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
    ratio: 0.78,
    T,
    k: 2,
    H: 2.5,
    bend: side * Math.min(40, d * 0.1),
    sink: 0.7,
  };
}

export function skimConfig(from: Point, to: Point, width: number, height: number): SkimConfig {
  const phone = width < 640;
  return {
    from,
    to,
    n: phone ? 9 : 11,
    ratio: 0.8,
    T: phone ? 4.4 : 5,
    k: 2.2,
    H: phone ? 2 : 3,
    bend: Math.min(60, 0.04 * (width + height)),
    sink: 1.1,
  };
}

/** Where the throw is `t` seconds after it left the hand. */
export function skimAt(t: number, c: SkimConfig): SkimFrame {
  const w: number[] = [];
  let sum = 0;
  for (let i = 0; i < c.n; i++) {
    w.push(c.ratio ** i);
    sum += w[i]!;
  }
  const fr = [0];
  let acc = 0;
  for (let i = 0; i < c.n; i++) {
    acc += w[i]! / sum;
    // The last is exactly 1: summed, it can land a hair over, and a
    // negative base to a fractional power below is NaN.
    fr.push(i === c.n - 1 ? 1 : Math.min(1, acc));
  }
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
  // One deceleration across the whole throw; each skip is a moment on it.
  const when = (f: number) => c.T * (1 - Math.max(0, 1 - f) ** (1 / c.k));
  const u = clamp01(t / c.T);
  const p = at(1 - (1 - u) ** c.k);

  const touches: SkimFrame['touches'] = [];
  let h = 0;
  for (let i = 0; i < c.n; i++) {
    const t0 = when(fr[i]!);
    const t1 = when(fr[i + 1]!);
    if (t >= t1) {
      touches.push({ ...at(fr[i + 1]!), age: t - t1, k: Math.sqrt(w[i]!) });
    } else if (t >= t0) {
      const v = (t - t0) / (t1 - t0);
      h = c.H * Math.sqrt(w[i]!) * 4 * v * (1 - v);
    }
  }
  return {
    stone: { ...p, h, sunk: clamp01((t - c.T) / c.sink), spin: 35 * u },
    touches,
    stopAt: c.T,
  };
}

/** The two quick rings each touch leaves: bigger for the early, harder hops. */
export function touchRings(touches: SkimFrame['touches']): Ring[] {
  const out: Ring[] = [];
  const life = 2.4;
  for (const q of touches) {
    for (let j = 0; j < 2; j++) {
      const a = q.age - j * 0.3;
      if (a < 0 || a > life) continue;
      out.push({
        x: q.x,
        y: q.y,
        r: 1.5 + a * (16 + 22 * q.k) * (1 - (a / life) * 0.35),
        o: (1 - a / life) ** 1.6 * (0.55 + 0.35 * q.k) * (j ? 0.5 : 1),
        yours: false,
      });
    }
  }
  return out;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
