'use client';

import { useEffect, useRef } from 'react';

import {
  reachFor,
  ringsAt,
  skimAt,
  skimConfig,
  spotFor,
  touchRings,
  type Point,
  type Ring,
  type Source,
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
 * under every stage), so the stones never move and your rings carry on
 * through the change of words above them. Only its props change.
 */

export interface Stone {
  /** Stable while the person is here; the stone's place is hashed from it. */
  key: string;
  /** "Ana from Lisbon", when they chose to be seen. */
  label?: string;
}

/** Where your stone lands, as a fraction of the pond. */
export const YOU: Point = { x: 0.5, y: 0.44 };

const INK = '62,76,86';
const STONE = '#9ba6ac';
const ACCENT = '#3e4c55';
const SHADOW = '47,59,66';
const LABEL = '#5a656c';

export default function Pond({
  stones,
  you,
  throwFrom,
  bellAt,
  reduced,
  className = '',
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
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const props = useRef({ stones, you, throwFrom, bellAt, reduced });
  props.current = { stones, you, throwFrom, bellAt, reduced };

  /** When each stone was first seen, so a newcomer fades in rather than appears. */
  const seen = useRef(new Map<string, number>());

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let spots = new Map<string, Point>();

    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = el.clientWidth;
      h = el.clientHeight;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spots = new Map();
    };

    /** Keep stones off your own and out from under the words. */
    const avoid = (p: Point) => {
      const near = Math.hypot((p.x - YOU.x) * w, (p.y - YOU.y) * h) < 0.14 * Math.min(w, h) + 40;
      const wide = w > h;
      const underWords = wide
        ? (p.x < 0.55 && p.y > 0.56) || (p.y > 0.86 && p.x > 0.2 && p.x < 0.8)
        : p.y > 0.62;
      return near || underWords;
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

    const pebble = (x: number, y: number, pw: number, ph: number, rot: number, fill: string, alpha: number) => {
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
      ctx.restore();
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
      const t = p.reduced ? 4.2 : nowMs / 1000;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;

      // A crowded pond is quieter water: past a dozen stones each one's rings
      // reach less far and leave it fainter, so the whole stays about as busy
      // as the wireframe's nine.
      const crowd = Math.min(1, Math.sqrt(12 / Math.max(1, p.stones.length)));
      const R = reachFor(w, h);
      const me = { x: YOU.x * w, y: YOU.y * h };
      const bell = p.bellAt === null ? null : (nowMs - p.bellAt) / 1000;
      // The others go quietly once the bell has rung.
      const others = bell === null ? 1 : Math.max(0, 1 - bell / 2.5);

      const sources: Source[] = [];
      const placed: { x: number; y: number; i: number; s: Stone; a: number }[] = [];
      p.stones.forEach((s, i) => {
        let spot = spots.get(s.key);
        if (!spot) {
          spot = spotFor(s.key, avoid);
          spots.set(s.key, spot);
        }
        if (!seen.current.has(s.key)) seen.current.set(s.key, nowMs);
        const a = p.reduced ? 1 : Math.min(1, (nowMs - seen.current.get(s.key)!) / 1500);
        const x = spot.x * w;
        const y = spot.y * h;
        placed.push({ x, y, i, s, a: a * others });
        sources.push({
          x, y, reach: R * (0.45 + 0.55 * crowd), period: 2.8, life: 10,
          phase: ((i * 1.7) % 2.8), strength: 0.75 * a * others * crowd, yours: false,
        });
      });

      const rings = ringsAt(t + 4.2, sources);

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

      for (const r of rings) ring(r);

      const phone = w < 640;
      ctx.font = `${phone ? 11 : 12}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
      ctx.textBaseline = 'middle';
      for (const q of placed) {
        const pw = 9 + ((q.i * 7) % 5);
        pebble(q.x, q.y, pw, pw * 0.78, (((q.i * 37) % 180) - 90) * (Math.PI / 180), STONE, q.a);
        if (q.s.label && q.a > 0) {
          ctx.globalAlpha = q.a;
          ctx.fillStyle = LABEL;
          ctx.fillText(q.s.label, q.x + 13, q.y);
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
