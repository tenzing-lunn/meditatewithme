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
    for (const i of members) groups[pick(hash(all[i]!.key), parts)]!.push(i);
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
    // Rounded rather than rounded up, so the count holds while people come
    // and go around a steady crowd (g grows with n); never over 60 to one.
    const swarms = Math.max(1, Math.round(unplaced.length / g), Math.ceil(unplaced.length / 60));
    const first = paths.length;
    const members = new Array<number>(swarms).fill(0);
    for (const i of unplaced) {
      const s = pick(hash(all[i]!.key), swarms);
      members[s]!++;
      fish[i] = orbitFor(hash(all[i]!.key) ^ 0x9e3779b9, first + s);
    }
    for (let s = 0; s < swarms; s++) paths.push(pathFor(0x5eed + s * 7919, radius(members[s]!), area));
  }
  return { paths, fish, size };
}

/**
 * Which of `count` swarms a fish joins: the one its key scores highest
 * with (rendezvous hashing). When the count changes by one only the fish
 * that pick the new swarm, or lose the old one, move; `hash % count` would
 * send most of the pond swimming across the water.
 */
function pick(h: number, count: number): number {
  let best = 0;
  let top = -1;
  for (let s = 0; s < count; s++) {
    let x = (h ^ Math.imul(s + 1, 0x9e3779b9)) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    x = (x ^ (x >>> 16)) >>> 0;
    if (x > top) {
      top = x;
      best = s;
    }
  }
  return best;
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
  const { x, y } = pushed(plan, i, t, touches);
  return { x, y };
}

/**
 * How hard fish `i` is being scattered at `t`, 0 to 1: what lets it dart
 * rather than cruise while a touch is still pushing it.
 */
export function alarmAt(plan: FishPlan, i: number, t: number, touches: readonly Touch[] = []): number {
  return pushed(plan, i, t, touches).alarm;
}

function pushed(plan: FishPlan, i: number, t: number, touches: readonly Touch[]) {
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
  let alarm = 0;
  let px = 0;
  let py = 0;
  for (const s of touches) {
    const age = t - s.t;
    if (age < 0 || age > SCATTER_S) continue;
    const dx = x - s.x;
    const dy = y - s.y;
    const d = Math.hypot(dx, dy) + 0.01;
    if (d >= reach) continue;
    const env = age < 0.3 ? age / 0.3 : Math.exp(-(age - 0.3) * 0.8);
    const push = (reach - d) * 1.15 * env;
    px += (dx / d) * push;
    py += (dy / d) * push;
    alarm = Math.max(alarm, Math.min(1, 1.6 * env * (1 - d / reach)));
  }
  return { x: x + px, y: y + py, alarm };
}

/*
 * HOW A FISH SWIMS
 *
 * `fishAt` says where a fish ought to be; `swim` is how it gets there. A
 * fish has a heading and a speed and only ever moves along the heading,
 * nose first: it steers toward its mark at a limited rate of turn, speeds
 * up and slows down smoothly, and can never slide sideways, back up, or
 * pivot on the spot, because how sharply it may turn shrinks with how
 * slowly it swims, and a calm fish only turns in wide circles. Arrived, it
 * idles: a lazy drift past its mark, a gentle turn, and back.
 *
 * Its spine has three axes (Tenzing, 28 September 2026): the head, the
 * body and the tail, each a joint that turns. Two things turn them. A
 * turn curves the body along the path the head just took, more the
 * tighter the turn. And a travelling wave runs from head to tail, the way
 * a carp or a trout swims: barely at the head, more at the body, most at
 * the tail and its fin, each a little behind the one in front, beating
 * faster and wider the faster the fish goes, so a gliding fish hardly
 * moves and a scattered one beats hard.
 *
 * Speeds are in body lengths, so a small fish on a phone swims like a big
 * one on a desk.
 */

/** A spine joint, or any point on the water. */
export interface Joint {
  x: number;
  y: number;
}

/** How a fish moves. Speeds in body lengths per second; turns in radians per second. */
export const SWIM = {
  /** Never slower, away from its mark; and right at it, a lazy drift that never quite stops. */
  cruise: 0.25,
  idle: 0.1,
  /** As fast as a calm fish goes, and as fast as a startled one does. */
  top: 4.5,
  burst: 10,
  /**
   * Wanted speed per unit of distance to the mark beyond `slack` body
   * lengths of it, 1/s: about a second behind it.
   */
  pull: 1.5,
  slack: 0.75,
  /** Change of speed, body lengths/s², calm and startled. */
  accel: 2.5,
  burstAccel: 30,
  /** Rate of turn near its mark, far from it, and startled. */
  turn: 1.4,
  turnFar: 2.4,
  turnBurst: 5,
  /**
   * The tightest circle, body lengths, calm and startled: however slow, it
   * never turns tighter, so a calm fish sweeps round rather than chasing
   * its tail.
   */
  radius: 1.5,
  burstRadius: 0.5,
  /** Its tightest calm circle once well behind its mark, so it keeps up with a swarm. */
  chaseRadius: 0.75,
  /** How quickly the rate of turn itself changes, rad/s², calm and startled. */
  spin: 6,
  spinBurst: 40,
  /** A longer frame is swum in steps no longer than this. */
  step: 0.1,
  /** A gap longer than this (a tab left hidden) puts the fish back at its mark. */
  gap: 1,
} as const;

/** The most each joint bends, radians: never folded. */
export const BEND = { head: 0.15, body: 0.5, tail: 0.7 } as const;

/** Nose piece, front body, rear body and tail fin, as fractions of the length. */
const SEG = { nose: 0.2, front: 0.28, rear: 0.28, fin: 0.26 } as const;

export interface FishState {
  /** The head joint, px. */
  x: number;
  y: number;
  /** Which way it faces and swims, radians. */
  heading: number;
  /** px/s, along the heading. */
  speed: number;
  /** Rate of turn, rad/s. */
  turn: number;
  /** Where the swimming wave is, radians. */
  phase: number;
  /**
   * Each joint's bend, radians: the head joint turns the nose off the
   * heading, the body joint the rear body off the front, and the tail
   * joint the tail fin off the rear body.
   */
  bend: { head: number; body: number; tail: number };
}

/** A fish just arrived: at `at`, straight, facing `heading`, cruising. */
export function spawnFish(at: Joint, heading: number, size: number, phase = 0): FishState {
  return {
    x: at.x,
    y: at.y,
    heading: wrap(heading),
    speed: SWIM.cruise * size,
    turn: 0,
    phase,
    bend: { head: 0, body: 0, tail: 0 },
  };
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/**
 * Swimming toward `target`, `dt` seconds on, in steps of at most
 * `SWIM.step`. `size` is the fish's length, px; `alarm` (0 to 1, from
 * `alarmAt`) lets it dart.
 */
export function swim(
  s: FishState,
  target: Joint,
  dt: number,
  opts: { size: number; alarm?: number },
): FishState {
  if (!(dt > 0) || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return s;
  if (dt > SWIM.gap) return spawnFish(target, s.heading, opts.size, s.phase);
  const n = Math.ceil(dt / SWIM.step - 1e-9);
  for (let k = 0; k < n; k++) s = stroke(s, target, dt / n, opts);
  return s;
}

function stroke(s: FishState, target: Joint, dt: number, opts: { size: number; alarm?: number }): FishState {
  const L = opts.size;
  const alarm = clamp(opts.alarm ?? 0, 0, 1);

  const dx = target.x - s.x;
  const dy = target.y - s.y;
  const dist = Math.hypot(dx, dy);
  // Right on top of its mark there is no way to face: it carries on.
  const off = dist > L * 0.25 ? wrap(Math.atan2(dy, dx) - s.heading) : 0;

  // Speed: faster the further behind, and, near its mark, only once it
  // faces it, so a fish turning round there cruises rather than dashes.
  // Further off it keeps some pace while it turns, or it would fall behind. Within a body length or so of
  // its mark it is close enough, and only drifts.
  const near = clamp((dist / L - 0.5) / 1.5, 0, 1);
  const top = lerp(SWIM.top, SWIM.burst, alarm) * L;
  const away = 0.6 * clamp((dist / L - 1) / 1.5, 0, 1);
  const facing = away + (1 - away) * Math.max(0, Math.cos(off)) ** 2;
  const gap = Math.max(0, dist - SWIM.slack * L);
  const brake = lerp(SWIM.accel, SWIM.burstAccel, alarm) * L;
  // And never faster than it could still stop in, so it arrives rather than overshoots.
  const go = Math.min(SWIM.pull * gap, Math.sqrt(2 * 0.8 * brake * gap)) * facing;
  const want = clamp(go, lerp(SWIM.idle, SWIM.cruise, near) * L, top);
  const accel = brake * dt;
  const speed = clamp(s.speed + clamp(want - s.speed, -accel, accel), 0, SWIM.burst * L);

  // Turn: toward the mark, eased in, never faster than the limit, and
  // never tighter than its smallest circle.
  const far = clamp((dist / L - 2) / 4, 0, 1);
  const limit = Math.min(
    lerp(lerp(SWIM.turn, SWIM.turnFar, far), SWIM.turnBurst, alarm),
    // Fallen behind a swarm, it turns tighter to catch up rather than looping wide.
    speed / (lerp(lerp(SWIM.radius, SWIM.chaseRadius, far), SWIM.burstRadius, alarm) * L),
  );
  const spin = lerp(SWIM.spin, SWIM.spinBurst, alarm) * dt;
  // Close by it hardly steers, so it hangs and drifts rather than circling.
  const aim = clamp(off * lerp(0.4, 2.2, Math.max(near, alarm)), -limit, limit);
  const turn = clamp(s.turn + clamp(aim - s.turn, -spin, spin), -limit, limit);
  const heading = wrap(s.heading + turn * dt);

  // The wave: its beat and its sweep both grow with speed.
  const v = speed / L;
  // Never more than a quarter beat a step, so a slow frame cannot alias it.
  const hz = Math.min(5, 0.4 + 0.6 * v, 0.25 / dt);
  const phase = (s.phase + 2 * Math.PI * hz * dt) % (2 * Math.PI);
  const m = 0.1 + 0.9 * Math.min(1, v / 3) + 0.4 * clamp((v - 3) / 7, 0, 1);
  // The turn: each joint bends by the curve of the path the head took.
  const k = (turn * SEG.front) / Math.max(v, 0.6);
  const bend = {
    head: clamp(-0.04 * m * Math.sin(phase + 0.5) + 0.25 * k, -BEND.head, BEND.head),
    body: clamp(0.14 * m * Math.sin(phase) - k, -BEND.body, BEND.body),
    tail: clamp(0.3 * m * Math.sin(phase - 1.1) - 0.85 * k, -BEND.tail, BEND.tail),
  };

  return {
    x: s.x + Math.cos(heading) * speed * dt,
    y: s.y + Math.sin(heading) * speed * dt,
    heading,
    speed,
    turn,
    phase,
    bend,
  };
}

export interface Spine {
  nose: Joint;
  head: Joint;
  body: Joint;
  tail: Joint;
  /** The back of the tail fin, and which way the fin points forward, radians. */
  fin: Joint;
  finAngle: number;
  /** Which way each piece points forward: nose piece, front body, rear body. */
  angles: { nose: number; front: number; rear: number };
}

/** Where the joints are, for drawing a fish `size` px long. */
export function spine(s: FishState, size: number): Spine {
  const nose = s.heading + s.bend.head;
  const front = s.heading;
  const rear = front + s.bend.body;
  const fin = rear + s.bend.tail;
  const at = (p: Joint, a: number, len: number) => ({ x: p.x + Math.cos(a) * len, y: p.y + Math.sin(a) * len });
  const head = { x: s.x, y: s.y };
  const body = at(head, front, -SEG.front * size);
  const tail = at(body, rear, -SEG.rear * size);
  return {
    nose: at(head, nose, SEG.nose * size),
    head,
    body,
    tail,
    fin: at(tail, fin, -SEG.fin * size),
    finAngle: fin,
    angles: { nose, front, rear },
  };
}
