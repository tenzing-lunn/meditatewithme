// The water, on the phone: the site's pond (`components/Pond.tsx`) drawn
// with Skia instead of a browser canvas. The fish, their swimming and the
// rings are the same code (`lib/fish.ts`, `lib/pond.ts`, read through
// Metro); only the strokes are Skia's. Everyone sitting right now is a grey
// fish in their part of the world; your stone, when it is on the water,
// breathes a soft ring now and then. A touch on the water flicks a pale
// pebble to it from the near bank, and the fish scatter where it lands.
// Begin throws your stone: the site's skim (`skimConfig`, `skimAt`), its
// touches, its landing and then its breaths.
//
// One picture a frame, recorded on the JS thread from the same maths the
// site runs, handed to the canvas through a shared value so React never
// re-renders for a frame.
import { Canvas, Picture, Skia, PaintStyle, StrokeCap, TileMode, createPicture, matchFont, useImage, type SkCanvas, type SkPaint, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { alarmAt, fishAt, hash, lookFor, planFish, SCATTER_S, spawnFish, spine, swim, type FishPlan, type FishState, type Joint, type Look, type Spine, type Touch } from '../lib/fish';
import { breathsAt, flickConfig, reachFor, skimAt, skimConfig, smooth, touchRings, trainAt, type Point, type Ring, type SkimConfig, type SkimFrame } from '../lib/pond';

export interface Stone {
  key: string;
  label?: string;
  lat?: number;
  lon?: number;
}

/** Where your stone sits, as a fraction of the pond (the site's `YOU`). */
const YOU = { x: 0.5, y: 0.44 };
/** Seconds of breathing already behind a stone that was simply there. */
const SETTLED = 90;
/** Your stone's landing, and a flicked pebble's stop: the site's trains. */
const LANDING = { rings: 4, life: 9, strength: 0.6, width: 1.2, rise: 0.12 };
const SETTLE = { rings: 3, life: 4.5, reach: 70, strength: 0.7, width: 1.1, rise: 0.1 };

/** Where the throw left the hand, in the pond's own points, and when (`performance.now()`). */
export interface Thrown {
  at: Point;
  t: number;
}

const INK = [62, 76, 86] as const;
const FISH = '#7a868d';
const ACCENT = '#3e4c55';
const SHADOW = [47, 59, 66] as const;
const LABEL = '#5a656c';

const rgba = (c: readonly [number, number, number], a: number) => Skia.Color(`rgba(${c[0]},${c[1]},${c[2]},${a})`);

export default function Pond({
  stones, you, throwFrom = null, water = false,
}: {
  stones: readonly Stone[];
  /** Whether your stone is on the water (or on its way). */
  you: boolean;
  throwFrom?: Thrown | null;
  /** Bare water can be touched: a pebble is flicked to the spot. */
  water?: boolean;
}) {
  const picture = useSharedValue<SkPicture>(createPicture(() => undefined, { x: 0, y: 0, width: 1, height: 1 }));
  const size = useRef({ w: 0, h: 0 });
  const props = useRef({ stones, you, throwFrom });
  props.current = { stones, you, throwFrom };
  const touches = useRef<Touch[]>([]);
  const flicks = useRef<{ cfg: SkimConfig; t0: number }[]>([]);
  // The pond's own clock starts here: the breaths are counted up from zero,
  // and a clock since the epoch would be counted for a very long time.
  const start = useRef(performance.now());
  const stone = useImage(require('./assets/skipping-stone.webp'));
  const stoneRef = useRef(stone);
  stoneRef.current = stone;

  useEffect(() => {
    let raf = 0;
    let plan: FishPlan | null = null;
    let planned = '';
    const drawn = new Map<string, FishState>();
    const seen = new Map<string, number>();
    let last = 0;
    const font = matchFont({ fontFamily: 'Helvetica', fontSize: 11 });

    const fill = Skia.Paint();
    fill.setAntiAlias(true);
    const stroke = Skia.Paint();
    stroke.setAntiAlias(true);
    stroke.setStyle(PaintStyle.Stroke);
    stroke.setStrokeCap(StrokeCap.Round);

    const ring = (c: SkCanvas, r: Ring) => {
      if (r.o <= 0.004) return;
      stroke.setStrokeWidth(r.w ?? 1);
      stroke.setColor(Skia.Color(`rgba(255,255,255,${0.7 * r.o})`));
      c.drawCircle(r.x, r.y, r.r + 1, stroke);
      stroke.setColor(r.yours ? Skia.Color(ACCENT) : rgba(INK, 1));
      stroke.setAlphaf(r.yours ? r.o : r.o * 0.62);
      c.drawCircle(r.x, r.y, r.r, stroke);
      stroke.setAlphaf(1);
    };

    const shadow = (c: SkCanvas, x: number, y: number, sw: number, sh: number, alpha: number) => {
      if (alpha <= 0) return;
      const p: SkPaint = Skia.Paint();
      p.setAntiAlias(true);
      p.setShader(
        Skia.Shader.MakeRadialGradient(
          { x: 0, y: 0 }, 1,
          [rgba(SHADOW, alpha), rgba(SHADOW, alpha * 0.6), rgba(SHADOW, 0)],
          [0, 0.55, 1],
          TileMode.Clamp,
        ),
      );
      c.save();
      c.translate(x, y);
      c.scale(sw / 2, sh / 2);
      c.drawCircle(0, 0, 1, p);
      c.restore();
    };

    /** The stone image, centred, turned and faded. */
    const pebble = (c: SkCanvas, x: number, y: number, pw: number, ph: number, deg: number, alpha: number) => {
      const img = stoneRef.current;
      if (!img || alpha <= 0) return;
      c.save();
      c.translate(x, y);
      c.rotate(deg, 0, 0);
      fill.setAlphaf(alpha);
      c.drawImageRect(img, { x: 0, y: 0, width: img.width(), height: img.height() }, { x: -pw / 2, y: -ph / 2, width: pw, height: ph }, fill);
      fill.setAlphaf(1);
      c.restore();
    };

    // A brief, low spray at each touch, quieter with every skip.
    const splash = (c: SkCanvas, q: SkimFrame['touches'][number]) => {
      const life = 0.42;
      if (q.age <= 0 || q.age >= life || q.k < 0.25) return;
      const f = q.age / life;
      const strength = q.k * Math.sin(Math.PI * f) * (1 - f);
      const rx = 3 + 10 * f * q.k;
      const ry = 1 + 3 * f * q.k;
      stroke.setStrokeWidth(1);
      stroke.setColor(Skia.Color(`rgba(255,255,255,${strength * 0.85})`));
      c.drawArc({ x: q.x - rx, y: q.y - ry, width: rx * 2, height: ry * 2 }, 180, 180, false, stroke);
      fill.setColor(Skia.Color(`rgba(99,113,122,${strength * 0.55})`));
      for (let i = 0; i < 3; i++) {
        const side = i - 1;
        const lift = (i === 1 ? 9 : 5) * q.k * 4 * f * (1 - f);
        c.drawOval({ x: q.x + side * (3 + 9 * f) * q.k - 0.7, y: q.y - lift - 1.1, width: 1.4, height: 2.2 }, fill);
      }
    };

    /** One fish through its three joints, as the site draws it. */
    const fish = (c: SkCanvas, sp: Spine, size: number, look: Look, alpha: number) => {
      if (alpha <= 0) return;
      const { nose, head, body, tail } = sp;
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
      const mid = (a: Joint, b: Joint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      const path = Skia.Path.Make();
      const start = mid(outline[outline.length - 1]!, outline[0]!);
      path.moveTo(start.x, start.y);
      outline.forEach((pt, k) => {
        const m = mid(pt, outline[(k + 1) % outline.length]!);
        path.quadTo(pt.x, pt.y, m.x, m.y);
      });
      path.close();
      const back = { x: -Math.cos(sp.finAngle), y: -Math.sin(sp.finAngle) };
      const across = { x: -back.y, y: back.x };
      const reach = size * look.fin;
      const spread = size * look.fork;
      const fin = Skia.Path.Make();
      fin.moveTo(tail.x, tail.y);
      fin.lineTo(tail.x + back.x * reach + across.x * spread, tail.y + back.y * reach + across.y * spread);
      fin.lineTo(tail.x + back.x * reach * 0.62, tail.y + back.y * reach * 0.62);
      fin.lineTo(tail.x + back.x * reach - across.x * spread, tail.y + back.y * reach - across.y * spread);
      fin.close();
      fill.setColor(Skia.Color(FISH));
      fill.setAlphaf(alpha);
      c.drawPath(path, fill);
      c.drawPath(fin, fill);
      fill.setAlphaf(1);
    };

    const draw = (c: SkCanvas, nowMs: number) => {
      const { w, h } = size.current;
      const p = props.current;
      const t = nowMs / 1000;
      const R = reachFor(w, h);
      const me = { x: YOU.x * w, y: YOU.y * h };

      // The fish keep to the open water above the words, as on the arrival.
      const band = p.you ? { y0: 0.08, y1: 0.84 } : { y0: 0.1, y1: 0.5 };
      const sig = `${p.stones.map((s) => s.key).join('|')}#${w}x${h}#${band.y1}`;
      if (sig !== planned) {
        plan = planFish(p.stones, { w, h, ...band });
        planned = sig;
      }
      const dt = last ? t - last : 0;
      last = t;
      touches.current = touches.current.filter((s) => t - s.t < SCATTER_S);

      const here = new Set<string>();
      const swimming: { spine: Spine; size: number; look: Look; o: number; label?: string }[] = [];
      p.stones.forEach((s, i) => {
        here.add(s.key);
        if (!seen.has(s.key)) seen.set(s.key, nowMs);
        const fade = Math.min(1, (nowMs - seen.get(s.key)!) / 1500);
        const to = fishAt(plan!, i, t, touches.current);
        const k = hash(s.key);
        const look = lookFor(s.key);
        const own = plan!.size * look.scale;
        const was = drawn.get(s.key);
        const now = !was
          ? spawnFish(to, ((k % 360) * Math.PI) / 180, own, ((k >>> 9) % 628) / 100)
          : swim(was, to, dt, { size: own, alarm: alarmAt(plan!, i, t, touches.current) });
        drawn.set(s.key, now);
        swimming.push({ spine: spine(now, own), size: own, look, o: (0.55 + 0.3 * ((i * 7) % 5) / 4) * fade, label: s.label });
      });
      for (const k of drawn.keys()) if (!here.has(k)) drawn.delete(k);

      const rings: Ring[] = [];
      const splashes: SkimFrame['touches'] = [];

      // Your stone: thrown, settling, or simply there.
      let flying: SkimFrame['stone'] | null = null;
      if (p.you) {
        const since = p.throwFrom ? (performance.now() - p.throwFrom.t) / 1000 : Infinity;
        const frame = p.throwFrom ? skimAt(since, skimConfig(p.throwFrom.at, me, w, h)) : null;
        if (frame) {
          flying = frame.stone;
          rings.push(...touchRings(frame.touches));
          splashes.push(...frame.touches);
          const landed = since - frame.stopAt;
          rings.push(...trainAt(landed, { x: me.x, y: me.y, reach: R * 1.4, yours: true, ...LANDING }));
          rings.push(...breathsAt(landed, me, R * 1.2, Math.floor(p.throwFrom!.t) >>> 0));
        } else {
          rings.push(...breathsAt(t + SETTLED, me, R * 1.2, 1));
        }
      }

      // Flicked pebbles: their touches, and once sunk, a few rings of their own.
      const pebbles: SkimFrame['stone'][] = [];
      const clock = performance.now();
      flicks.current = flicks.current.filter((f) => {
        const since = (clock - f.t0) / 1000;
        if (since > f.cfg.T + SETTLE.life + 1.5) return false;
        const frame = skimAt(since, f.cfg);
        rings.push(...touchRings(frame.touches, 0.7));
        splashes.push(...frame.touches);
        rings.push(...trainAt(since - f.cfg.T, { x: f.cfg.to.x, y: f.cfg.to.y, yours: false, ...SETTLE }));
        if (frame.stone.sunk < 1) pebbles.push(frame.stone);
        return true;
      });

      for (const r of rings) ring(c, r);
      for (const q of splashes) splash(c, q);
      for (const f of pebbles) {
        const sk = smooth(f.sunk);
        const up = f.h / 4;
        shadow(c, f.x, f.y + 1, (11 + sk * 3) * (1 - up * 0.1), (4.5 + sk * 3) * (1 - up * 0.1), f.sunk > 0 ? 0.2 * (1 - sk) : (0.22 - up * 0.07) * f.o);
        const sz = (1 - 0.25 * Math.min(1, f.spin / 70)) * (1 - 0.2 * sk);
        pebble(c, f.x, f.y - f.h - 2 + sk * 2, 15 * sz, 7 * sz, f.spin * 0.22 - 5, f.o * 0.75);
      }

      fill.setColor(Skia.Color(LABEL));
      for (const f of swimming) {
        fish(c, f.spine, f.size, f.look, f.o);
        if (f.label && f.o > 0) {
          fill.setColor(Skia.Color(LABEL));
          fill.setAlphaf(Math.min(1, f.o * 1.2));
          c.drawText(f.label, f.spine.head.x + plan!.size * 0.7, f.spine.head.y - plan!.size * 0.9 + 4, fill, font);
          fill.setAlphaf(1);
        }
      }

      if (p.you) {
        if (flying) {
          // In flight: the shadow on the water, the stone lifted off it by
          // the hop; once it stops it settles in, smaller, fading as it goes,
          // and its shadow becomes the one the settled stone keeps.
          const sk = smooth(flying.sunk);
          const up = flying.h / 12;
          const distance = 1 - 0.38 * Math.min(1, flying.spin / 38);
          const sw = (23 * distance + sk * 2) * (1 + up * 0.25);
          const sh = (8 * distance + sk * 2) * (1 + up * 0.25);
          shadow(c, flying.x, flying.y + 1, sw, sh, flying.sunk > 0 ? 0.24 - 0.08 * sk : (0.26 - up * 0.1) * Math.max(flying.o, sk));
          const sz = distance * (1 - 0.25 * sk);
          pebble(c, flying.x, flying.y - flying.h + sk * 2.5, 28 * sz, 10 * sz, flying.spin * 0.22, flying.o);
        } else {
          // Settled: only the shadow of the stone under the water, as on the site.
          shadow(c, me.x, me.y + 1, 16, 9, 0.16);
        }
      }
    };

    const loop = () => {
      const { w, h } = size.current;
      if (w && h) {
        const nowMs = performance.now() - start.current;
        picture.value = createPicture((c) => draw(c, nowMs), { x: 0, y: 0, width: w, height: h });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [picture]);

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={water ? 'auto' : 'none'}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        size.current = { w: width, h: height };
      }}
      onStartShouldSetResponder={() => water}
      onResponderRelease={(e) => {
        // From just below the bottom edge, a little to one side, as if thrown
        // from the near bank; the fish scatter where it lands.
        const to = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
        const { w, h } = size.current;
        const side: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
        const from = { x: Math.max(-20, Math.min(w + 20, to.x - side * Math.min(180, w * 0.3))), y: h + 24 };
        const cfg = flickConfig(from, to, side);
        const t0 = performance.now();
        flicks.current = [...flicks.current, { cfg, t0 }].slice(-12);
        touches.current = [...touches.current, { ...to, t: (t0 - start.current) / 1000 + cfg.T }].slice(-6);
      }}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}
