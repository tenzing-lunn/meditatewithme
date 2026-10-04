// The water, on the phone: the site's pond (`components/Pond.tsx`) drawn
// with Skia instead of a browser canvas. The fish, their swimming and the
// rings are the same code (`lib/fish.ts`, `lib/pond.ts`, read through
// Metro); only the strokes are Skia's. Everyone sitting right now is a grey
// fish in their part of the world; your stone, when it is on the water,
// breathes a soft ring now and then. A touch scatters the fish near it.
//
// One picture a frame, recorded on the JS thread from the same maths the
// site runs, handed to the canvas through a shared value so React never
// re-renders for a frame. Nothing is thrown here yet: the throw is Begin's,
// and Begin is still the site's.
import { Canvas, Picture, Skia, PaintStyle, StrokeCap, TileMode, createPicture, matchFont, useImage, type SkCanvas, type SkPaint, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { alarmAt, fishAt, hash, lookFor, planFish, SCATTER_S, spawnFish, spine, swim, type FishPlan, type FishState, type Joint, type Look, type Spine, type Touch } from '../lib/fish';
import { breathsAt, reachFor, type Ring } from '../lib/pond';

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

const INK = [62, 76, 86] as const;
const FISH = '#7a868d';
const ACCENT = '#3e4c55';
const SHADOW = [47, 59, 66] as const;
const LABEL = '#5a656c';

const rgba = (c: readonly [number, number, number], a: number) => Skia.Color(`rgba(${c[0]},${c[1]},${c[2]},${a})`);

export default function Pond({ stones, you, onTouch }: { stones: readonly Stone[]; you: boolean; onTouch?: () => void }) {
  const picture = useSharedValue<SkPicture>(createPicture(() => undefined, { x: 0, y: 0, width: 1, height: 1 }));
  const size = useRef({ w: 0, h: 0 });
  const props = useRef({ stones, you });
  props.current = { stones, you };
  const touches = useRef<Touch[]>([]);
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

      if (p.you) {
        for (const r of breathsAt(t + SETTLED, me, R * 1.2, 1)) ring(c, r);
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
        // Settled: the stone on the water over its shadow.
        shadow(c, me.x, me.y + 1, 16, 9, 0.16);
        const img = stoneRef.current;
        if (img) {
          c.drawImageRect(
            img,
            { x: 0, y: 0, width: img.width(), height: img.height() },
            { x: me.x - 14, y: me.y - 5, width: 28, height: 10 },
            fill,
          );
        }
      }
    };

    // The pond's own clock, from when it was first drawn: the breaths are
    // counted up from zero, and a clock since the epoch would be counted for
    // a very long time.
    const t0 = performance.now();
    const loop = () => {
      const { w, h } = size.current;
      if (w && h) {
        const nowMs = performance.now() - t0;
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
      pointerEvents={onTouch ? 'auto' : 'none'}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        size.current = { w: width, h: height };
      }}
      onStartShouldSetResponder={() => Boolean(onTouch)}
      onResponderRelease={(e) => {
        const { locationX, locationY } = e.nativeEvent;
        touches.current = [...touches.current, { x: locationX, y: locationY, t: performance.now() / 1000 }].slice(-6);
        onTouch?.();
      }}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}
