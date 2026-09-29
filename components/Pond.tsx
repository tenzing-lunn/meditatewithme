'use client';

import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';

import {
  alarmAt,
  fishAt,
  hash,
  lookFor,
  planFish,
  SCATTER_S,
  spawnFish,
  spine,
  swim,
  type FishPlan,
  type FishState,
  type Joint,
  type Look,
  type Spine,
  type Touch,
} from '@/lib/fish';
import {
  breathsAt,
  flickConfig,
  reachFor,
  ringsAt,
  skimAt,
  skimConfig,
  smooth,
  touchRings,
  trainAt,
  type Point,
  type Ring,
  type SkimConfig,
  type Train,
} from '@/lib/pond';

/**
 * The water, drawn on one canvas, every frame.
 *
 * It is one canvas rather than a ring per element because the throw has to be
 * smooth: the stone, its shadow and every ring move in the same frame, and a
 * page of absolutely placed divs restyled sixty times a second is what made
 * the wireframe's skim look stepped.
 *
 * The pond stays mounted from the arrival to the ending (`Journey` draws it
 * under every stage), so the fish swim on and your rings carry on through
 * the change of words above them. Only its props change.
 *
 * Everyone else sitting is a grey fish (27 September 2026, in place of the
 * other stones): alone on a path of its own while the water is quiet, in
 * milling swarms once it is crowded, each in its person's part of the
 * world on a loose map (`lib/fish.ts`). A touch scatters the
 * ones near it; a flicked pebble scatters them where it lands.
 */

export interface Stone {
  /** Stable while the person is here; their fish's path is hashed from it. */
  key: string;
  /** "Ana from Lisbon", when they chose to be seen. */
  label?: string;
  /** Roughly where they are (a one-degree cell): where on the water they swim. */
  lat?: number;
  lon?: number;
}

/** What the page can do to the water from outside. */
export interface PondHandle {
  /** Flick a pale pebble from the shore to this point (client pixels). */
  flick: (at: Point) => void;
  /** Scatter the fish near this point (client pixels), now. */
  scatter: (at: Point) => void;
}

/** A pebble in the air or just sunk: its throw, and when it left the hand (ms). */
interface Flick {
  cfg: SkimConfig;
  t0: number;
}

/** A flicked pebble's own train once it stops: three rings, soon gone. */
const SETTLE = { rings: 3, life: 4.5, reach: 70, strength: 0.7, width: 1.1, rise: 0.1 };

/** Your stone's landing: the biggest train on the water, five rings. */
const LANDING = { rings: 5, life: 9, strength: 1, width: 1.6, rise: 0.12 };

/** The bell: one soft train, wide, and then the water is still. */
const BELL = { rings: 4, life: 13, strength: 0.85, width: 1.4, rise: 0.4 };

/**
 * Seconds of breathing already behind a stone that was simply there rather
 * than thrown, so it breathes at its settled pace from the first frame.
 */
const SETTLED = 90;

/** A stone in the air, sliding, or going under (`skimAt`'s stone). */
type Flying = { x: number; y: number; h: number; sunk: number; spin: number; o: number };

/** The seed of your stone's breaths: the same all through one sitting. */
function seed(thrown: { t: number } | null): number {
  return thrown ? Math.floor(thrown.t) >>> 0 : 1;
}

/** Where your stone lands, as a fraction of the pond. */
export const YOU: Point = { x: 0.5, y: 0.44 };

const INK = '62,76,86';
const FISH = '#7a868d';
const ACCENT = '#3e4c55';
const SHADOW = '47,59,66';
const LABEL = '#5a656c';
/** The flicked pebble: pale, so it is yours to play with and not a person. */
const PALE = '#f6f8f9';

export default function Pond({
  stones,
  you,
  throwFrom,
  bellAt,
  reduced,
  className = '',
  ref,
}: {
  stones: readonly Stone[];
  /** Whether your stone is on the water (or on its way). */
  you: boolean;
  /**
   * Where the throw left the hand, in client pixels, and when
   * (`performance.now()`). Null when your stone was never thrown on this
   * pond — it is simply there, settled.
   */
  throwFrom: { at: Point; t: number } | null;
  /** When the bell rang (`performance.now()`): one wide ring, and the others go. */
  bellAt: number | null;
  reduced: boolean;
  className?: string;
  ref?: Ref<PondHandle>;
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const props = useRef({ stones, you, throwFrom, bellAt, reduced });
  props.current = { stones, you, throwFrom, bellAt, reduced };

  /** When each stone was first seen, so a newcomer fades in rather than appears. */
  const seen = useRef(new Map<string, number>());

  /**
   * Touch the water and a pebble skims to that spot from the shore below,
   * in 1.9 seconds whatever the distance. Off under reduced motion: it is
   * play, and the motion is all it is.
   */
  const flicks = useRef<Flick[]>([]);
  /** Touches on the water, on the pond's clock (s), still pushing fish away. */
  const touches = useRef<Touch[]>([]);
  const touch = (x: number, y: number, t: number) => {
    touches.current = [...touches.current.filter((s) => t - s.t < SCATTER_S), { x, y, t }].slice(-6);
  };
  useImperativeHandle(
    ref,
    () => ({
      flick(at) {
        const el = canvas.current;
        if (!el || props.current.reduced) return;
        const r = el.getBoundingClientRect();
        const to = { x: at.x - r.left, y: at.y - r.top };
        const side: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
        // From just below the bottom edge, a little to one side, as if
        // thrown from the near bank.
        const from = {
          x: Math.max(-20, Math.min(r.width + 20, to.x - side * Math.min(180, r.width * 0.3))),
          y: r.height + 24,
        };
        const cfg = flickConfig(from, to, side);
        const t0 = performance.now();
        flicks.current.push({ cfg, t0 });
        if (flicks.current.length > 12) flicks.current.shift();
        // The fish scatter where it lands, not where the finger was.
        touch(to.x, to.y, t0 / 1000 + cfg.T);
      },
      scatter(at) {
        const el = canvas.current;
        if (!el || props.current.reduced) return;
        const r = el.getBoundingClientRect();
        touch(at.x - r.left, at.y - r.top, performance.now() / 1000);
      },
    }),
    [],
  );

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let plan: FishPlan | null = null;
    let planned = '';
    /**
     * Each fish as it swims (`swim` in lib/fish.ts): where it is, which way
     * it faces, how fast, and how its three joints are bent.
     */
    const drawn = new Map<string, FishState>();
    let last = 0;

    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = el.clientWidth;
      h = el.clientHeight;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      planned = '';
      // New water: every fish is put straight where it belongs rather than
      // swimming over from where it was on the old size (or from the corner,
      // when the canvas was measured hidden at nothing by nothing).
      drawn.clear();
    };

    const ring = (r: Ring) => {
      if (r.o <= 0.004) return;
      ctx.lineWidth = r.w ?? 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r + 1, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${(0.7 * r.o).toFixed(3)})`;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.globalAlpha = r.yours ? r.o : r.o * 0.62;
      ctx.strokeStyle = r.yours ? ACCENT : `rgb(${INK})`;
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const pebble = (
      x: number, y: number, pw: number, ph: number, rot: number, fill: string, alpha: number,
      edge?: string,
    ) => {
      if (alpha <= 0) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.beginPath();
      // A little lopsided, like the CSS pebble in the wireframes.
      ctx.ellipse(0, 0, pw / 2, ph / 2, 0.08, 0, Math.PI * 2);
      ctx.fill();
      if (edge) {
        ctx.strokeStyle = edge;
        ctx.stroke();
      }
      ctx.restore();
    };

    /**
     * One fish through its three joints: a rounded head, the body
     * narrowing to the tail joint, and a forked tail fin off the tail
     * joint — so the swimming wave shows along the whole body.
     */
    const fish = (sp: Spine, size: number, look: Look, alpha: number) => {
      if (alpha <= 0) return;
      const { nose, head, body, tail } = sp;
      // Across each joint, square to the two pieces meeting there.
      const side = (p: Joint, a: number, b: number, w: number, s: 1 | -1) => {
        const m = Math.atan2(Math.sin(a) + Math.sin(b), Math.cos(a) + Math.cos(b));
        return { x: p.x - Math.sin(m) * w * s, y: p.y + Math.cos(m) * w * s };
      };
      const { nose: an, front, rear } = sp.angles;
      const outline = [
        nose,
        side(head, an, front, size * look.head, 1),
        side(body, front, rear, size * look.body, 1),
        side(tail, rear, sp.finAngle, size * look.tail, 1),
        side(tail, rear, sp.finAngle, size * look.tail, -1),
        side(body, front, rear, size * look.body, -1),
        side(head, an, front, size * look.head, -1),
      ];
      ctx.globalAlpha = alpha;
      ctx.fillStyle = FISH;
      ctx.beginPath();
      // A closed curve through the midpoints, so the outline has no corners.
      const mid = (a: Joint, b: Joint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      const start = mid(outline[outline.length - 1]!, outline[0]!);
      ctx.moveTo(start.x, start.y);
      outline.forEach((pt, k) => {
        const m = mid(pt, outline[(k + 1) % outline.length]!);
        ctx.quadraticCurveTo(pt.x, pt.y, m.x, m.y);
      });
      ctx.fill();
      // The tail fin, hanging off the tail joint.
      const back = { x: -Math.cos(sp.finAngle), y: -Math.sin(sp.finAngle) };
      const across = { x: -back.y, y: back.x };
      const reach = size * look.fin;
      const spread = size * look.fork;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(tail.x + back.x * reach + across.x * spread, tail.y + back.y * reach + across.y * spread);
      ctx.lineTo(tail.x + back.x * reach * 0.62, tail.y + back.y * reach * 0.62);
      ctx.lineTo(tail.x + back.x * reach - across.x * spread, tail.y + back.y * reach - across.y * spread);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const shadow = (x: number, y: number, sw: number, sh: number, alpha: number) => {
      if (alpha <= 0) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sw / 2, sh / 2);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(${SHADOW},${alpha.toFixed(3)})`);
      g.addColorStop(0.55, `rgba(${SHADOW},${(alpha * 0.6).toFixed(3)})`);
      g.addColorStop(1, `rgba(${SHADOW},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const draw = (nowMs: number) => {
      const p = props.current;
      if (!w || !h) return;
      const t = p.reduced ? 4.2 : nowMs / 1000;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;

      const R = reachFor(w, h);
      const me = { x: YOU.x * w, y: YOU.y * h };
      const bell = p.bellAt === null ? null : (nowMs - p.bellAt) / 1000;
      // The others go quietly once the bell has rung.
      const others = bell === null ? 1 : Math.max(0, 1 - bell / 2.5);

      // The fish keep to the open water: all of it while sitting, above the
      // words on the arrival.
      const band = p.you ? { y0: 0.08, y1: 0.84 } : w > h ? { y0: 0.1, y1: 0.56 } : { y0: 0.1, y1: 0.5 };
      const keys = p.stones.map((s) => s.key);
      const sig = `${keys.join('|')}#${w}x${h}#${band.y1}`;
      if (sig !== planned) {
        plan = planFish(p.stones, { w, h, ...band });
        planned = sig;
      }
      const clock = nowMs / 1000;
      // Unclamped: `swim` swims a slow frame in tenths of a second and puts
      // a fish back at its mark after a long gap.
      const dt = last ? clock - last : 0;
      last = clock;
      const size = plan!.size;
      const swimming: { spine: Spine; size: number; look: Look; o: number; label?: string }[] = [];
      const here = new Set<string>();
      p.stones.forEach((s, i) => {
        here.add(s.key);
        if (!seen.current.has(s.key)) seen.current.set(s.key, nowMs);
        const fade = p.reduced ? 1 : Math.min(1, (nowMs - seen.current.get(s.key)!) / 1500);
        const to = fishAt(plan!, i, p.reduced ? 4.2 : clock, p.reduced ? [] : touches.current);
        const k = hash(s.key);
        const look = lookFor(s.key);
        const own = size * look.scale;
        const was = drawn.get(s.key);
        // A newcomer starts straight at its mark, facing a way of its own;
        // under reduced motion every fish is simply there, still.
        const now =
          !was || p.reduced
            ? spawnFish(to, ((k % 360) * Math.PI) / 180, own, ((k >>> 9) % 628) / 100)
            : swim(was, to, dt, { size: own, alarm: alarmAt(plan!, i, clock, touches.current) });
        drawn.set(s.key, now);
        swimming.push({ spine: spine(now, own), size: own, look, o: (0.55 + 0.3 * ((i * 7) % 5) / 4) * fade * others, label: s.label });
      });
      for (const k of drawn.keys()) if (!here.has(k)) drawn.delete(k);

      const rings: Ring[] = [];

      // Your stone: thrown, settling, or simply there.
      let stone: Flying | null = null;
      if (p.you) {
        const since = p.throwFrom && !p.reduced ? (nowMs - p.throwFrom.t) / 1000 : Infinity;
        const rect = el.getBoundingClientRect();
        const cfg = p.throwFrom
          ? skimConfig(
              { x: p.throwFrom.at.x - rect.left, y: p.throwFrom.at.y - rect.top },
              me, w, h,
            )
          : null;
        const frame = cfg && Number.isFinite(since) ? skimAt(since, cfg) : null;
        if (frame) {
          stone = frame.stone;
          rings.push(...touchRings(frame.touches));
        }
        const landed = frame ? since - frame.stopAt : Infinity;
        if (p.reduced) {
          // Still water: a few rings drawn once, never moving.
          if (bell === null) {
            rings.push(
              ...ringsAt(8.4, [
                { x: me.x, y: me.y, reach: R * 1.4, period: 2.8, life: 10, phase: 0, strength: 0.95, yours: true },
              ]),
            );
          }
        } else if (bell === null) {
          if (Number.isFinite(landed)) {
            // It landed: the big train, then the stone breathes now and then.
            rings.push(...trainAt(landed, { x: me.x, y: me.y, reach: R * 1.4, yours: true, ...LANDING }));
            rings.push(...breathsAt(landed, me, R * 1.2, seed(p.throwFrom)));
          } else if (!p.throwFrom) {
            rings.push(...breathsAt(t + SETTLED, me, R * 1.2, seed(null)));
          }
        }
        if (bell !== null) {
          // The bell: one soft, wide train from your stone. Held at one
          // moment under reduced motion, so it is there but does not spread.
          const bellTrain: Train = { x: me.x, y: me.y, reach: Math.max(w, h) * 0.75, yours: true, ...BELL };
          rings.push(...trainAt(p.reduced ? 3 : bell, bellTrain));
        }
      }

      // Flicked pebbles: their touches, and once sunk, a few rings of their own.
      const flying: Flying[] = [];
      flicks.current = flicks.current.filter((f) => {
        const since = (nowMs - f.t0) / 1000;
        const end = f.cfg.T + SETTLE.life + 1.5;
        if (since > end) return false;
        const frame = skimAt(since, f.cfg);
        rings.push(...touchRings(frame.touches, 0.7));
        rings.push(...trainAt(since - f.cfg.T, { x: f.cfg.to.x, y: f.cfg.to.y, yours: false, ...SETTLE }));
        if (frame.stone.sunk < 1) flying.push(frame.stone);
        return true;
      });

      for (const r of rings) ring(r);
      ctx.lineWidth = 1;

      for (const f of flying) {
        // The shadow stays on the water; the pebble is lifted off it by the
        // hop, so the two part in the air and meet at each touch.
        const sk = smooth(f.sunk);
        const up = f.h / 4;
        const so = f.sunk > 0 ? 0.2 * (1 - sk) : (0.22 - up * 0.07) * f.o;
        shadow(f.x, f.y + 1, (11 + sk * 3) * (1 - up * 0.1), (4.5 + sk * 3) * (1 - up * 0.1), so);
        const size = (1 + up * 0.06) * (1 - 0.2 * sk);
        pebble(
          f.x, f.y - f.h - 2 + sk * 2, 12 * size, 9 * size, (f.spin - 8) * (Math.PI / 180), PALE, f.o,
          `rgba(${INK},${(0.35 * f.o).toFixed(3)})`,
        );
      }

      const phone = w < 640;
      ctx.font = `${phone ? 11 : 12}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
      ctx.textBaseline = 'middle';
      for (const f of swimming) {
        fish(f.spine, f.size, f.look, f.o);
        if (f.label && f.o > 0) {
          ctx.globalAlpha = Math.min(1, f.o * 1.2);
          ctx.fillStyle = LABEL;
          ctx.fillText(f.label, f.spine.head.x + plan!.size * 0.7, f.spine.head.y - plan!.size * 0.9);
          ctx.globalAlpha = 1;
        }
      }

      if (p.you) {
        if (stone) {
          // In flight: the shadow on the water, the stone lifted off it by
          // the hop, so they part in the air and meet at each touch; the
          // higher it is the smaller and fainter the shadow. Once it stops it
          // settles into the water, a little smaller and fading as it goes,
          // and its shadow becomes the one the settled stone keeps.
          const sk = smooth(stone.sunk);
          const up = stone.h / 8;
          const sw = (12 + sk * 4) * (1 - up * 0.18);
          const sh = (5 + sk * 4) * (1 - up * 0.18);
          const so = stone.sunk > 0 ? 0.24 - 0.08 * sk : (0.26 - up * 0.1) * Math.max(stone.o, sk);
          shadow(stone.x, stone.y + 1, sw, sh, so);
          const size = (1 + up * 0.08) * (1 - 0.25 * sk);
          pebble(
            stone.x, stone.y - stone.h - 2 + sk * 2.5, 13 * size, 10 * size,
            (stone.spin - 8) * (Math.PI / 180), ACCENT, stone.o,
          );
        } else {
          // Settled: only the shadow of the stone under the water.
          shadow(me.x, me.y + 1, 16, 9, 0.16);
        }
      }
    };

    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };

    fit();
    const ro = new ResizeObserver(() => {
      fit();
      if (props.current.reduced) draw(performance.now());
    });
    ro.observe(el);
    const redraw = () => draw(performance.now());
    el.addEventListener('pond-redraw', redraw);
    if (reduced) redraw();
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pond-redraw', redraw);
    };
  }, [reduced]);

  // Under reduced motion there is no loop; draw again when anything changes.
  useEffect(() => {
    if (!reduced) return;
    const el = canvas.current;
    if (!el) return;
    el.dispatchEvent(new Event('pond-redraw'));
  }, [reduced, stones, you, throwFrom, bellAt]);

  return <canvas ref={canvas} aria-hidden className={`block h-full w-full ${className}`} />;
}
