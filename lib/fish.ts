/**
 * Everyone else sitting, as fish in the pond: where each one is, with no I/O.
 *
 * One fish per person. While the water is quiet every fish wanders a path
 * of its own — two slow sine loops, from a hash of the person's key, so a
 * fish keeps its path for as long as its person is here and nobody follows
 * anybody. Once the pond is crowded (more fish than one per QUIET_AREA of
 * water) they gather into swarms: each swarm drifts on a path of its own and
 * its fish mill around its centre, each at its own distance and speed, most
 * one way round and a few the other. Swarms grow as more people come.
 *
 * A touch on the water scatters the fish near it: they are pushed straight
 * away, hard at first and easing off over a few seconds, and drift back.
 *
 * Pure and portable (tests/portability.test.ts): the caller owns the clock
 * and the canvas.
 */

/** Square px of water per fish before they start to gather. */
export const QUIET_AREA = 12_000;

/** How long a touch keeps pushing, s. */
export const SCATTER_S = 5;

export interface Area {
  w: number;
  h: number;
  /** The band of the water fish keep to, as fractions of `h`. */
  y0: number;
  y1: number;
}

interface Path {
  cx: number;
  cy: number;
  ax: number;
  ay: number;
  w1: number;
  w2: number;
  p1: number;
  p2: number;
  /** The swarm's radius; 0 for a fish on its own. */
  r: number;
  dir: 1 | -1;
}

interface Orbit {
  path: number;
  rad: number;
  om: number;
  ph: number;
  br: number;
  sp: number;
}

export interface FishPlan {
  paths: Path[];
  fish: Orbit[];
  /** Nose to tail, px. */
  size: number;
}

export interface Touch {
  x: number;
  y: number;
  /** When, on the caller's clock, s. */
  t: number;
}

/** FNV-1a, 32 bits. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function rand(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How many fish share a swarm, for this many on this much water. */
export function swarmSize(n: number, area: Area): number {
  const quiet = (area.w * area.h) / QUIET_AREA;
  if (n <= quiet) return 1;
  return Math.max(6, Math.min(60, Math.round(n / 8)));
}

function pathFor(seed: number, r: number, a: Area): Path {
  const next = rand(seed);
  const lo = a.h * a.y0;
  const hi = a.h * a.y1;
  const cx = a.w * (0.15 + 0.7 * next());
  const cy = lo + (hi - lo) * (0.15 + 0.7 * next());
  // The loop reaches 1.35 × ax across and 1.3 × ay down, and a swarm's
  // fish up to 1.12 × r (0.81 × r down) beyond its centre: all of it on the water.
  const rx = r * 1.12 + 4;
  const ry = r * 0.81 + 4;
  const ax = Math.min(a.w * (0.1 + 0.15 * next()), cx - 20 - rx, a.w - 20 - rx - cx) / 1.35;
  const ay = Math.min((hi - lo) * (0.12 + 0.18 * next()), cy - lo - ry, hi - ry - cy) / 1.3;
  return {
    cx,
    cy,
    ax: Math.max(0, ax),
    ay: Math.max(0, ay),
    w1: (0.05 + 0.06 * next()) * (next() < 0.5 ? -1 : 1),
    w2: (0.03 + 0.05 * next()) * (next() < 0.5 ? -1 : 1),
    p1: next() * 2 * Math.PI,
    p2: next() * 2 * Math.PI,
    r,
    dir: next() < 0.5 ? -1 : 1,
  };
}

/** Where everybody's fish swims, for these people on this water. */
export function planFish(keys: readonly string[], area: Area): FishPlan {
  const n = keys.length;
  const phone = area.w < 640;
  const size = n > 100 ? (phone ? 11 : 14) : phone ? 15 : 20;
  const g = swarmSize(n, area);
  const paths: Path[] = [];
  const fish: Orbit[] = [];

  if (g === 1) {
    keys.forEach((k, i) => {
      paths.push(pathFor(hash(k), 0, area));
      fish.push(orbitFor(hash(k) ^ 0x9e3779b9, i));
    });
  } else {
    const swarms = Math.ceil(n / g);
    const members = new Array<number>(swarms).fill(0);
    keys.forEach((k) => {
      const s = hash(k) % swarms;
      members[s]!++;
      fish.push(orbitFor(hash(k) ^ 0x9e3779b9, s));
    });
    for (let s = 0; s < swarms; s++) {
      paths.push(pathFor(0x5eed + s * 7919, size * (0.9 + 0.55 * Math.sqrt(Math.max(1, members[s]!))), area));
    }
  }
  return { paths, fish, size };
}

function orbitFor(seed: number, path: number): Orbit {
  const next = rand(seed);
  return {
    path,
    rad: Math.sqrt(0.08 + 0.92 * next()),
    om: (0.25 + 0.35 * next()) * (next() < 0.85 ? 1 : -1),
    ph: next() * 2 * Math.PI,
    br: next() * 2 * Math.PI,
    sp: 0.7 + 0.6 * next(),
  };
}

/** Where fish `i` is at `t` seconds, pushed by any touches still pushing. */
export function fishAt(plan: FishPlan, i: number, t: number, touches: readonly Touch[] = []): { x: number; y: number } {
  const f = plan.fish[i]!;
  const p = plan.paths[f.path]!;
  let x = p.cx + p.ax * Math.sin(p.w1 * t + p.p1) + p.ax * 0.35 * Math.sin(p.w2 * 2.3 * t + p.p2);
  let y = p.cy + p.ay * Math.sin(p.w2 * t + p.p2) + p.ay * 0.3 * Math.sin(p.w1 * 1.7 * t + p.p1);
  if (p.r > 0) {
    const th = p.dir * f.om * t + f.ph;
    const rr = p.r * f.rad * (1 + 0.12 * Math.sin(t * 0.6 + f.br));
    x += rr * Math.cos(th);
    y += rr * 0.72 * Math.sin(th);
  }
  x += 2 * Math.sin(t * f.sp + f.br);
  y += 1.6 * Math.cos(t * f.sp * 1.2 + f.br);

  const reach = plan.size * 11;
  for (const s of touches) {
    const age = t - s.t;
    if (age < 0 || age > SCATTER_S) continue;
    const dx = x - s.x;
    const dy = y - s.y;
    const d = Math.hypot(dx, dy) + 0.01;
    if (d >= reach) continue;
    const env = age < 0.3 ? age / 0.3 : Math.exp(-(age - 0.3) * 0.8);
    const push = (reach - d) * 1.15 * env;
    x += (dx / d) * push;
    y += (dy / d) * push;
  }
  return { x, y };
}

/**
 * A fish's spine: head, body, tail. Each joint follows the one ahead of it at
 * a fixed length, the way a chain dragged by its end does, so the body bends
 * through a turn instead of swinging round like a stick.
 */
export interface Joint {
  x: number;
  y: number;
}

export function follow(head: Joint, joints: readonly Joint[], seg: number, maxBend = 0.9): Joint[] {
  const out: Joint[] = [];
  let ahead: Joint | null = null;
  let lead = head;
  for (const j of joints) {
    let a = Math.atan2(j.y - lead.y, j.x - lead.x);
    if (ahead) {
      // No sharper than `maxBend` against the segment in front: a fish that
      // doubles back turns its body, it does not fold in half.
      const straight = Math.atan2(lead.y - ahead.y, lead.x - ahead.x);
      const bend = Math.atan2(Math.sin(a - straight), Math.cos(a - straight));
      a = straight + Math.max(-maxBend, Math.min(maxBend, bend));
    }
    const next = { x: lead.x + Math.cos(a) * seg, y: lead.y + Math.sin(a) * seg };
    out.push(next);
    ahead = lead;
    lead = next;
  }
  return out;
}
