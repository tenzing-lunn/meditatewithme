'use client';

import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';

import { fishAt, follow, planFish, SCATTER_S, type FishPlan, type Joint, type Touch } from '@/lib/fish';
import {
  flickConfig,
  reachFor,
  ringsAt,
  skimAt,
  skimConfig,
  touchRings,
  type Point,
  type Ring,
  type SkimConfig,
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
 * milling swarms once it is crowded (`lib/fish.ts`). A touch scatters the
 * ones near it; a flicked pebble scatters them where it lands.
 */

export interface Stone {
  /** Stable while the person is here; their fish's path is hashed from it. */
  key: string;
  /** "Ana from Lisbon", when they chose to be seen. */
  label?: string;
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

/** A flicked pebble's own rings once it has sunk: a few, soon gone. */
const SETTLE = { rings: 3, period: 1.1, life: 4.5, reach: 70 };

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
     * Each fish as drawn: its head, the body and tail joints trailing it,
     * and where its tail is in its beat — so it eases toward where it
     * should be and bends on the way.
     */
    const drawn = new Map<string, { x: number; y: number; body: Joint; tail: Joint; beat: number }>();
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
     * One fish from its three joints: a rounded head, the body narrowing
     * to the tail joint, and a forked tail fin swung by `sway` (radians).
     */
    const fish = (head: Joint, body: Joint, tail: Joint, size: number, sway: number, alpha: number) => {
      if (alpha <= 0) return;
      const unit = (ax: number, ay: number) => {
        const d = Math.hypot(ax, ay) || 1;
        return { x: ax / d, y: ay / d };
      };
      const d0 = unit(head.x - body.x, head.y - body.y);
      const d1 = unit(body.x - tail.x, body.y - tail.y);
      const dm = unit(d0.x + d1.x, d0.y + d1.y);
      const side = (p: Joint, d: { x: number; y: number }, w: number, s: 1 | -1) => ({
        x: p.x - d.y * w * s,
        y: p.y + d.x * w * s,
      });
      const nose = { x: head.x + d0.x * size * 0.2, y: head.y + d0.y * size * 0.2 };
      const outline = [
        nose,
        side(head, d0, size * 0.13, 1),
        side(body, dm, size * 0.12, 1),
        side(tail, d1, size * 0.035, 1),
        side(tail, d1, size * 0.035, -1),
        side(body, dm, size * 0.12, -1),
        side(head, d0, size * 0.13, -1),
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
      // The tail fin, swinging about the tail joint.
      const c = Math.cos(sway);
      const sn = Math.sin(sway);
      const back = { x: -(d1.x * c - d1.y * sn), y: -(d1.x * sn + d1.y * c) };
      const across = { x: -back.y, y: back.x };
      const reach = size * 0.26;
      const spread = size * 0.15;
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
        plan = planFish(keys, { w, h, ...band });
        planned = sig;
      }
      const clock = nowMs / 1000;
      const dt = last ? Math.min(0.1, clock - last) : 0;
      last = clock;
      const ease = p.reduced ? 1 : 1 - Math.exp(-dt * 2.5);
      const swimming: { head: Joint; body: Joint; tail: Joint; sway: number; o: number; label?: string }[] = [];
      const here = new Set<string>();
      p.stones.forEach((s, i) => {
        here.add(s.key);
        if (!seen.current.has(s.key)) seen.current.set(s.key, nowMs);
        const fade = p.reduced ? 1 : Math.min(1, (nowMs - seen.current.get(s.key)!) / 1500);
        const to = fishAt(plan!, i, p.reduced ? 4.2 : clock, p.reduced ? [] : touches.current);
        const was = drawn.get(s.key);
        const x = was ? was.x + (to.x - was.x) * ease : to.x;
        const y = was ? was.y + (to.y - was.y) * ease : to.y;
        const seg = plan!.size * 0.28;
        let body: Joint;
        let tail: Joint;
        if (was) {
          [body, tail] = follow({ x, y }, [was.body, was.tail], seg) as [Joint, Joint];
        } else {
          // A newcomer starts straight, facing a way of its own.
          const a = (Math.PI * ((i * 37) % 360)) / 180;
          body = { x: x - Math.cos(a) * seg, y: y - Math.sin(a) * seg };
          tail = { x: x - Math.cos(a) * seg * 2, y: y - Math.sin(a) * seg * 2 };
        }
        // The tail beats faster, and wider, the faster the fish swims.
        const speed = was && dt > 0 ? Math.hypot(x - was.x, y - was.y) / dt : 0;
        const beat = (was?.beat ?? i * 1.3) + dt * (3 + Math.min(7, speed * 0.2));
        const sway = p.reduced ? 0 : Math.sin(beat) * (0.2 + Math.min(0.35, speed * 0.01));
        drawn.set(s.key, { x, y, body, tail, beat });
        swimming.push({ head: { x, y }, body, tail, sway, o: (0.55 + 0.3 * ((i * 7) % 5) / 4) * fade * others, label: s.label });
      });
      for (const k of drawn.keys()) if (!here.has(k)) drawn.delete(k);

      const rings: Ring[] = [];

      // Your stone: thrown, settling, or simply there.
      let stone: { x: number; y: number; h: number; sunk: number; spin: number } | null = null;
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
        if (bell === null && landed >= 0) {
          // Your rings: counted from the moment it stopped, so the first one
          // leaves the stone as it lands rather than arriving already spread.
          const P = 2.8;
          const L = 10;
          const fade = 0.95;
          if (Number.isFinite(landed)) {
            for (let j = Math.max(0, Math.ceil((landed - L) / P)); j * P <= landed; j++) {
              const age = landed - j * P;
              if (age > L) continue;
              const u = age / L;
              rings.push({
                x: me.x, y: me.y, r: 3 + u ** 0.75 * R * 1.4,
                o: Math.min(1, age / 0.4) * (1 - u) ** 1.7 * fade, yours: true,
              });
            }
          } else {
            rings.push(
              ...ringsAt(t + 4.2, [
                { x: me.x, y: me.y, reach: R * 1.4, period: P, life: L, phase: 0, strength: fade, yours: true },
              ]),
            );
          }
        }
        if (bell !== null) {
          // The bell: one wide ring after another from your stone.
          const P = 3.4;
          const L = 13;
          for (let j = Math.max(0, Math.ceil((bell - L) / P)); j * P <= bell; j++) {
            const age = bell - j * P;
            if (age > L) continue;
            const u = age / L;
            rings.push({
              x: me.x, y: me.y, r: 3 + u ** 0.75 * Math.max(w, h) * 0.75,
              o: Math.min(1, age / 0.4) * (1 - u) ** 1.7 * 0.9, yours: true,
            });
          }
        }
      }

      // Flicked pebbles: their touches, and once sunk, a few rings of their own.
      const flying: { x: number; y: number; h: number; sunk: number; spin: number }[] = [];
      flicks.current = flicks.current.filter((f) => {
        const since = (nowMs - f.t0) / 1000;
        const end = f.cfg.T + (SETTLE.rings - 1) * SETTLE.period + SETTLE.life;
        if (since > end) return false;
        const frame = skimAt(since, f.cfg);
        rings.push(...touchRings(frame.touches));
        for (let j = 0; j < SETTLE.rings; j++) {
          const age = since - f.cfg.T - j * SETTLE.period;
          if (age < 0 || age > SETTLE.life) continue;
          const u = age / SETTLE.life;
          rings.push({
            x: f.cfg.to.x, y: f.cfg.to.y, r: 2 + u ** 0.75 * SETTLE.reach,
            o: Math.min(1, age / 0.3) * (1 - u) ** 1.7 * 0.7, yours: false,
          });
        }
        if (frame.stone.sunk < 1) flying.push(frame.stone);
        return true;
      });

      for (const r of rings) ring(r);

      for (const f of flying) {
        const so = f.sunk > 0 ? 0.2 * (1 - f.sunk) : 0.22 - f.h * 0.03;
        shadow(f.x, f.y + 1, 11 + f.sunk * 3, 4.5 + f.sunk * 3, so);
        pebble(
          f.x, f.y - f.h - 2, 12, 9, (f.spin * 1.6 - 8) * (Math.PI / 180), PALE, 1 - f.sunk,
          `rgba(${INK},${(0.35 * (1 - f.sunk)).toFixed(3)})`,
        );
      }

      const phone = w < 640;
      ctx.font = `${phone ? 11 : 12}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
      ctx.textBaseline = 'middle';
      for (const f of swimming) {
        fish(f.head, f.body, f.tail, plan!.size, f.sway, f.o);
        if (f.label && f.o > 0) {
          ctx.globalAlpha = Math.min(1, f.o * 1.2);
          ctx.fillStyle = LABEL;
          ctx.fillText(f.label, f.head.x + plan!.size * 0.7, f.head.y - plan!.size * 0.9);
          ctx.globalAlpha = 1;
        }
      }

      if (p.you) {
        if (stone) {
          // In flight: a small shadow on the water, the stone just above it.
          const sw = 12 + stone.sunk * 4;
          const sh = 5 + stone.sunk * 4;
          const so = stone.sunk > 0 ? 0.24 - 0.08 * stone.sunk : 0.26 - stone.h * 0.03;
          shadow(stone.x, stone.y + 1, sw, sh, so);
          pebble(stone.x, stone.y - stone.h - 2, 13, 10, (stone.spin - 8) * (Math.PI / 180), ACCENT, 1 - stone.sunk);
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
