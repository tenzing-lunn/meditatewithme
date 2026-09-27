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
 * Where a fish swims is a loose map of where its person is (Tenzing, 27
 * September 2026): west on the left, north at the top, so somebody in
 * Lisbon wanders the left of the water and somebody in Tokyo the right.
 * Crowded, the swarms are regions: everybody in the same stretch of the
 * world mills together. A fish with no place keeps a path hashed from its
 * key, as they all did before.
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

/** One person to draw: their key, and roughly where they are, if known. */
export interface Swimmer {
  key: string;
  lat?: number;
  lon?: number;
}

/** A stretch of the world that swims together once the pond is crowded, degrees. */
const REGION_LON = 24;
const REGION_LAT = 16;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Where on the water a place is: a loose map, west on the left and north at
 * the top. Latitude runs from 62°N to 43°S, where nearly everybody lives,
 * so the inhabited world fills the water rather than a strip of it.
 */
export function homeFor(lat: number, lon: number, a: Area): { x: number; y: number } {
  const lo = a.h * a.y0;
  const hi = a.h * a.y1;
  return {
    x: a.w * (0.1 + 0.8 * clamp01((lon + 170) / 340)),
    y: lo + (hi - lo) * (0.12 + 0.76 * clamp01((62 - lat) / 105)),
  };
}

const placed = (s: Swimmer): s is Swimmer & { lat: number; lon: number } =>
  typeof s.lat === 'number' && typeof s.lon === 'number';

/** How many fish share a swarm, for this many on this much water. */
export function swarmSize(n: number, area: Area): number {
  const quiet = (area.w * area.h) / QUIET_AREA;
  if (n <= quiet) return 1;
  return Math.max(6, Math.min(60, Math.round(n / 8)));
}

function pathFor(seed: number, r: number, a: Area, home?: { x: number; y: number }): Path {
  const next = rand(seed);
  const lo = a.h * a.y0;
  const hi = a.h * a.y1;
  const fx = next();
  const fy = next();
  // At home, a little off it so neighbours do not sit on one another, and a
  // smaller loop, so a fish stays in its part of the world.
  const cx = home
    ? Math.max(a.w * 0.08, Math.min(a.w * 0.92, home.x + a.w * 0.06 * (fx - 0.5)))
    : a.w * (0.15 + 0.7 * fx);
  const cy = home
    ? Math.max(lo + (hi - lo) * 0.08, Math.min(hi - (hi - lo) * 0.08, home.y + (hi - lo) * 0.12 * (fy - 0.5)))
    : lo + (hi - lo) * (0.15 + 0.7 * fy);
  const wander = home ? 0.25 : 1;
  // The loop reaches 1.35 × ax across and 1.3 × ay down, and a swarm's
  // fish up to 1.12 × r (0.81 × r down) beyond its centre: all of it on the water.
  const rx = r * 1.12 + 4;
  const ry = r * 0.81 + 4;
  const ax = Math.min(a.w * (0.1 + 0.15 * next()) * wander, cx - 20 - rx, a.w - 20 - rx - cx) / 1.35;
  const ay = Math.min((hi - lo) * (0.12 + 0.18 * next()) * wander, cy - lo - ry, hi - ry - cy) / 1.3;
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
export function planFish(people: readonly (string | Swimmer)[], area: Area): FishPlan {
  const all: Swimmer[] = people.map((p) => (typeof p === 'string' ? { key: p } : p));
  const n = all.length;
  const phone = area.w < 640;
  const size = n > 100 ? (phone ? 11 : 14) : phone ? 15 : 20;
  const g = swarmSize(n, area);
  const paths: Path[] = [];
  const fish: Orbit[] = new Array<Orbit>(n);
  const radius = (m: number) => size * (0.9 + 0.55 * Math.sqrt(Math.max(1, m)));

  if (g === 1) {
    all.forEach((s, i) => {
      const h = hash(s.key);
      paths.push(pathFor(h, 0, area, placed(s) ? homeFor(s.lat, s.lon, area) : undefined));
      fish[i] = orbitFor(h ^ 0x9e3779b9, i);
    });
    return { paths, fish, size };
  }

  // Crowded. The placed swim with their region, a region too full for one
  // swarm splitting into several; the rest in swarms hashed from their keys.
  const regions = new Map<string, number[]>();
  const unplaced: number[] = [];
  all.forEach((s, i) => {
    if (!placed(s)) return void unplaced.push(i);
    const r = `${Math.floor((s.lon + 180) / REGION_LON)},${Math.floor((s.lat + 90) / REGION_LAT)}`;
    const list = regions.get(r) ?? [];
    list.push(i);
    regions.set(r, list);
  });

  for (const [r, members] of regions) {
    const parts = Math.ceil(members.length / 60);
    const groups: number[][] = Array.from({ length: parts }, () => []);
    for (const i of members) groups[hash(all[i]!.key) % parts]!.push(i);
    groups.forEach((group, part) => {
      if (group.length === 0) return;
      let lat = 0;
      let lon = 0;
      for (const i of group) {
        lat += all[i]!.lat!;
        lon += all[i]!.lon!;
      }
      const home = homeFor(lat / group.length, lon / group.length, area);
      const path = paths.length;
      // One from a region on its own is a fish on its own.
      paths.push(pathFor(hash(r) + part * 7919, group.length === 1 ? 0 : radius(group.length), area, home));
      for (const i of group) fish[i] = orbitFor(hash(all[i]!.key) ^ 0x9e3779b9, path);
    });
  }

  if (unplaced.length) {
    const swarms = Math.ceil(unplaced.length / g);
    const first = paths.length;
    const members = new Array<number>(swarms).fill(0);
    for (const i of unplaced) {
      const s = hash(all[i]!.key) % swarms;
      members[s]!++;
      fish[i] = orbitFor(hash(all[i]!.key) ^ 0x9e3779b9, first + s);
    }
    for (let s = 0; s < swarms; s++) paths.push(pathFor(0x5eed + s * 7919, radius(members[s]!), area));
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
