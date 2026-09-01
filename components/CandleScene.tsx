'use client';

import { useEffect, useRef } from 'react';

/**
 * The room, as a photograph with a live flame in it.
 *
 * This replaces `Candle.tsx`. The CSS candle was a stand-in for a licensed
 * video loop; this is the photograph with the flame lifted out of it and
 * redrawn every frame, which gets the movement a loop would give without
 * shipping a video — and unlike a loop it can react to the pointer.
 *
 * TWO IMAGES, ONE OBJECT
 * `room-base.png` is the photograph with the flame painted off the wall (the
 * wick is still there). `flame.png` is the flame alone, its alpha taken from
 * its own luminance. The flame is screen-blended back over the wall, so the
 * seam is invisible and the flame can move without dragging a rectangle of
 * background with it.
 *
 * WHY A CANVAS AND NOT A CSS TRANSFORM
 * A flame does not tilt, it bends. Drawing it as horizontal slices, each
 * offset a little more than the one below, lets the body travel while the base
 * stays welded to the wick. A single transform reads as a sticker being
 * rotated — which is exactly what the old CSS flame looked like.
 *
 * WHY THE SIMULATION IS NOT IN REACT STATE
 * It runs at frame rate. `lean` lives on a ref and is written straight to the
 * canvas; the pointer only ever adds force to a spring, so the flame always
 * recovers to upright and nothing needs to re-render to make that happen.
 *
 * REDUCED MOTION
 * Honoured: the camera stops moving and the flame is drawn once, still. A
 * meditation site is the last place to ignore that setting.
 */

export type ScenePhase =
  | 'load'
  | 'idle'
  | 'quiet'
  | 'open'
  | 'sitting'
  | 'returning'
  | 'finished';

/**
 * Camera per phase. `s` is zoom, `dim` the vignette that lets text sit on the
 * photograph, `ms` how long the move takes.
 *
 * `stop` is the camera stopping down: a flat dim across the whole frame,
 * middle included. The vignette cannot do this — it is transparent at the
 * centre by construction, which is the point of a vignette — so the one thing
 * it can never darken is the flame, and the flame is exactly what a question
 * asked in the middle of the frame gets read against. Measured there, `How
 * should it end?` came out at 1.08:1.
 *
 * Only `open` uses it, and only for as long as a question is open. It is a
 * property of the camera rather than a layer under the copy: the room dims,
 * loses focus, and comes back the moment the question is answered. A scrim
 * that lived under the text permanently would be the thing this room is
 * specifically not.
 *
 * `flame` turns the candle itself down, and it is what lets `stop` stay
 * gentle. The flame is drawn separately from the photograph and screen-blended
 * over it, so no amount of dimming the picture touches it — it stays a hard
 * white core in the middle of the frame, and the middle of the frame is where
 * a question gets asked. Measured with the flame at full and the frame stopped
 * down 0.58, `Gong` came out at 2.53:1; the stop needed to reach 0.75 to fix
 * it, which is dark enough to throw the room away. Bringing the flame down
 * instead fixes the same pixel and leaves the room visible.
 *
 * It multiplies the sprite's brightness and the glow's opacity together, so
 * the candle recedes as one object rather than losing its halo and keeping its
 * core.
 */
const CAM: Record<
  ScenePhase,
  {
    s: number;
    y: number;
    blur: number;
    br: number;
    dim: number;
    stop: number;
    flame: number;
    ms: number;
  }
> = {
  load: { s: 1.32, y: 0, blur: 3.0, br: 0.58, dim: 0.6, stop: 0, flame: 0.5, ms: 5600 },
  idle: { s: 1.06, y: 0, blur: 0.6, br: 0.92, dim: 0.32, stop: 0, flame: 1, ms: 2800 },
  quiet: { s: 1.11, y: -1, blur: 1.1, br: 0.86, dim: 0.4, stop: 0, flame: 1, ms: 2400 },
  // The room settles back, it does not disappear. `blur` was 4.8, which threw
  // the photograph away entirely and left the questions floating on a brown
  // field — you could no longer tell you were still in the room. 2.0 is a lens
  // pulling focus off the candle and onto the near distance, which is the
  // effect this was always after.
  open: { s: 1.14, y: 2, blur: 2.0, br: 0.8, dim: 0.44, stop: 0.65, flame: 0.3, ms: 1500 },
  sitting: { s: 1.82, y: 0, blur: 3.6, br: 0.74, dim: 0.52, stop: 0, flame: 1, ms: 3600 },
  // The half minute after the bell. Identical in every value to `finished` —
  // only `ms` differs, and that is the entire point: the room takes thirty
  // seconds to come back rather than four, so the return is something you sit
  // through with your eyes still closed while the bowl is still going, not a
  // transition that has finished before you have. Because the targets match,
  // the changeover to `finished` at the end moves nothing.
  returning: { s: 1.02, y: 0, blur: 0.0, br: 1.14, dim: 0.04, stop: 0, flame: 1, ms: 30000 },
  finished: { s: 1.02, y: 0, blur: 0.0, br: 1.14, dim: 0.04, stop: 0, flame: 1, ms: 4400 },
};

/** Where the flame sits in room-base.png, measured off the photograph.
 *  If the photograph is ever re-cropped, these four numbers are the only thing
 *  that has to change. PAD is the room the sprite needs to lean past itself. */
const PHOTO_W = 1536;
const PHOTO_H = 1024;
const PHOTO_FOCUS_Y = 0.46; // matches background-position: 50% 46%
const F = { x: 720, y: 400, w: 98, h: 138 };
const PAD = { l: 52, r: 52, t: 36, b: 6 };

export default function CandleScene({
  phase,
  wind = 1,
  flicker = 1,
  intensity = 1,
  breath = true,
  burn = 0,
  basePath = '/room-base.png',
  flamePath = '/flame.png',
}: {
  phase: ScenePhase;
  /** How hard the pointer pushes the flame. 0 turns the interaction off. */
  wind?: number;
  /** How restless the flame is on its own. 0 is a still flame. */
  flicker?: number;
  /** Multiplies every camera move. Below 1 for a calmer page. */
  intensity?: number;
  /** The slow continuous drift. */
  breath?: boolean;
  /**
   * How far through the shared hour we are: 0 when the candle is lit at the
   * top of it, approaching 1 just before the next one replaces it.
   *
   * The CSS candle spent this on the height of the wax. A photograph cannot
   * shorten, so it is spent on the flame instead — see the note in `step()`.
   */
  burn?: number;
  basePath?: string;
  flamePath?: string;
}) {
  const stage = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const glow = useRef<HTMLDivElement | null>(null);

  const sim = useRef({ lean: 0, vel: 0, gust: 0, t: 0, last: 0 });
  const pointer = useRef({ x: -9999, y: -9999, vx: 0, seen: 0 });
  const geo = useRef({ s: 1, dpr: 1 });
  const opts = useRef({ wind, flicker, phase, burn });
  opts.current = { wind, flicker, phase, burn };

  useEffect(() => {
    const el = stage.current;
    const cv = canvas.current;
    if (!el || !cv) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const sprite = new Image();
    let ready = false;
    let measured = false;
    sprite.onload = () => {
      ready = true;
      layout();
    };
    sprite.src = flamePath;

    /** background-size: cover, by hand — CSS gives no way to ask where a
     *  covered background actually landed, and the canvas has to sit exactly
     *  where the flame used to be. */
    function layout() {
      if (!el || !cv) return;
      const W = el.clientWidth;
      const H = el.clientHeight;
      if (!W || !H) return;

      const s = Math.max(W / PHOTO_W, H / PHOTO_H);
      const offX = (W - PHOTO_W * s) / 2;
      const offY = (H - PHOTO_H * s) * PHOTO_FOCUS_Y;

      const boxW = (F.w + PAD.l + PAD.r) * s;
      const boxH = (F.h + PAD.t + PAD.b) * s;
      const dpr = Math.min(2, window.devicePixelRatio || 1);

      cv.width = Math.round(boxW * dpr);
      cv.height = Math.round(boxH * dpr);
      cv.style.left = `${offX + (F.x - PAD.l) * s}px`;
      cv.style.top = `${offY + (F.y - PAD.t) * s}px`;
      cv.style.width = `${boxW}px`;
      cv.style.height = `${boxH}px`;
      geo.current = { s, dpr };
      measured = true;

      const g = glow.current;
      if (g) {
        const size = 300 * s;
        g.style.left = `${offX + (F.x + F.w / 2) * s - size / 2}px`;
        g.style.top = `${offY + (F.y + F.h * 0.55) * s - size / 2}px`;
        g.style.width = `${size}px`;
        g.style.height = `${size}px`;
      }

      /* THE BAND, PUBLISHED
         The copy sits in the dark band of photograph above the flame, and that
         band's height comes from cover-fitting a 3:2 image — a scale unrelated
         to the viewport height type is sized against. On a short wide window
         the flame rises faster than any `vh` clamp can follow, which is why
         this is measured and handed out rather than guessed at in CSS.

         Deliberately the UNTRANSFORMED position. The camera scales and pans
         across six phases over seconds at a time; laying the column out
         against a moving number would make the type reflow every time the
         room breathes. This is where the flame sits at rest, and the camera
         plays over the top of it. */
      document.documentElement.style.setProperty(
        '--flame-top',
        `${Math.round(offY + F.y * s)}px`,
      );
      document.documentElement.style.setProperty(
        '--flame-bottom',
        `${Math.round(offY + (F.y + F.h) * s)}px`,
      );
    }

    /* WHY THERE IS AN OFFSCREEN BUFFER
       Slices have to overlap or bilinear sampling leaves a hairline between
       them. Overlapping semi-transparent slices directly onto the visible
       canvas composited the flame's own alpha twice along every seam, and
       those double-lit rows read as fixed horizontal lines across the light —
       fixed because the slice grid does not move with the flame. So the warp
       is assembled at full alpha in a buffer, where an overlap is just an
       overlap, and the buffer is drawn once at the frame's brightness. One
       pixel per slice on top of that leaves nothing periodic to see. */
    const buf = document.createElement('canvas');
    const bctx = buf.getContext('2d');

    function paint(lean: number, stretch: number, bright: number) {
      if (!ctx || !bctx || !cv) return;
      const { s, dpr } = geo.current;
      const k = s * dpr;
      const BW = F.w + PAD.l + PAD.r;
      const BH = F.h + PAD.t + PAD.b;

      const bw = Math.max(1, Math.round(BW * k));
      const bh = Math.max(1, Math.round(BH * k));
      if (buf.width !== bw || buf.height !== bh) {
        buf.width = bw;
        buf.height = bh;
      }
      bctx.setTransform(k, 0, 0, k, 0, 0);
      bctx.clearRect(0, 0, BW, BH);
      bctx.globalCompositeOperation = 'source-over';
      bctx.imageSmoothingQuality = 'high';

      const life = reduced ? 0 : Math.max(0, opts.current.flicker);
      const t = sim.current.t;
      // Enough to close the gap the stretch opens, and no more.
      const bleed = Math.max(stretch, 1) + 0.5;

      for (let sy = 0; sy < F.h; sy++) {
        // 0 at the wick, 1 at the tip: the further from the wick, the freer.
        const free = Math.pow(1 - sy / F.h, 1.7);
        const wob =
          (3.4 * Math.sin(t * 2.9 - sy * 0.085) +
            1.9 * Math.sin(t * 4.7 - sy * 0.135 + 1.7) +
            1.1 * Math.sin(t * 7.9 - sy * 0.21 + 0.4)) *
          free *
          life;
        const dx = PAD.l + wob + lean * 78 * Math.pow(1 - sy / F.h, 1.9);
        const dy = PAD.t + F.h - (F.h - sy) * stretch;
        const wS =
          1 + 0.035 * Math.sin(t * 3.3 + sy * 0.05) * life - 0.06 * Math.abs(lean);

        bctx.drawImage(sprite, 0, sy, F.w, 1, dx + (F.w * (1 - wS)) / 2, dy, F.w * wS, bleed);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      // source-over, not lighter: the canvas is already screen-blended over
      // the photograph, so adding the flame to itself blows the base out.
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.max(0, Math.min(1, bright));
      ctx.drawImage(buf, 0, 0);
      ctx.globalAlpha = 1;
    }

    /* WHY THE LOOP DOES NOT TRUST requestAnimationFrame
       A frame callback is only owed to a page the browser intends to paint. In
       a hidden, offscreen or throttled frame, rAF can be deferred
       indefinitely, and everything hung off it goes with it: the flame, the
       deferred first measurement, and ResizeObserver callbacks, which are
       delivered on the same loop. That is how a candle ends up unlit with
       nothing thrown.

       So rAF is the preferred clock, not the only one. A 33ms interval runs
       alongside it, steps only when rAF has gone quiet, and is also the retry
       for the first measurement. */
    let raf = 0;
    let lastFrameAt = 0;

    const step = (now: number) => {
      lastFrameAt = performance.now();
      if (!ready) return;
      if (!measured) {
        layout();
        if (!measured) return;
      }

      const sm = sim.current;
      const dt = Math.min(0.05, sm.last ? (now - sm.last) / 1000 : 0.016);
      sm.last = now;

      /* THE HOUR, SPENT ON THE FLAME
         `burn` used to shorten the wax, and a photograph cannot shorten. The
         same number is spent here instead: a late arrival finds a smaller,
         dimmer flame rather than a shorter candle. What the hour means is
         unchanged — it is still one candle, lit at the top of the hour, at the
         same state for everybody watching — only the thing that carries it is.

         Both falloffs are gentle on purpose. A guttering stub still lights a
         room, and the page should not get gloomy towards :59. */
      const b = Math.max(0, Math.min(1, opts.current.burn));
      const burnScale = 1 - b * 0.22;
      const burnGlow = 1 - b * 0.3;

      // Applies to a still flame too. Reduced motion asks for less movement,
      // not for a different hour.
      if (reduced) {
        paint(0, burnScale, 1);
        return;
      }
      sm.t += dt;

      const w = Math.max(0, opts.current.wind);
      const life = Math.max(0, opts.current.flicker);

      /* The pointer's contribution: a push away from where the cursor is, plus
         a drag in the direction it is travelling. Both fall off with distance,
         so moving fast past the flame reads as a draught, not a collision. */
      let force = 0;
      const p = pointer.current;
      if (w > 0 && p.seen && cv) {
        const r = cv.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.55;
        const dx = cx - p.x;
        const dy = (cy - p.y) * 0.7;
        const sigma = r.width * 1.05;
        const infl = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
        const push =
          Math.sign(dx) * Math.min(1, Math.abs(dx) / (sigma * 0.5)) * 2.6;
        const drag = Math.max(-3.2, Math.min(3.2, -p.vx * 0.0042));
        force = (push + drag) * infl * w;
        p.vx *= 0.86; // a parked cursor stops dragging the flame
      }

      // Its own restlessness: rare small gusts over the continuous wobble.
      if (Math.random() < 0.012 * life) sm.gust = (Math.random() - 0.5) * 2.4 * life;
      sm.gust *= 0.94;

      const K = 30;
      const DAMP = 6.4;
      sm.vel += (force + sm.gust - K * sm.lean - DAMP * sm.vel) * dt;
      sm.lean = Math.max(-0.62, Math.min(0.62, sm.lean + sm.vel * dt));

      const t = sm.t;
      const stretch =
        (1 +
          0.045 * Math.sin(t * 2.3) * life +
          0.022 * Math.sin(t * 5.7 + 1.1) * life -
          0.26 * Math.abs(sm.lean)) *
        burnScale;
      const bright =
        1 -
        0.09 * Math.abs(sm.lean) +
        0.05 * Math.sin(t * 4.1) * life +
        0.03 * Math.sin(t * 9.3 + 2.2) * life;

      paint(sm.lean, stretch, bright);

      const g = glow.current;
      if (g) {
        g.style.transform = `translate(${(sm.lean * 26).toFixed(2)}px, 0) scale(${(
          1 +
          (bright - 1) * 1.6
        ).toFixed(3)})`;
        g.style.opacity = (
          0.62 * bright * burnGlow * (CAM[opts.current.phase] ?? CAM.idle).flame
        ).toFixed(3);
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      step(now);
    };

    const onMove = (e: PointerEvent) => {
      const p = pointer.current;
      const now = performance.now();
      const dt = Math.max(8, now - (p.seen || now));
      if (p.seen) p.vx = ((e.clientX - p.x) / dt) * 1000;
      p.x = e.clientX;
      p.y = e.clientY;
      p.seen = now;
    };

    // A timer, not a frame: the stage is routinely unmeasurable on the mount
    // tick, and this is the retry that always arrives.
    layout();
    const first = window.setTimeout(layout, 0);
    raf = requestAnimationFrame(frame);
    const keepAlive = window.setInterval(() => {
      if (!measured) layout();
      if (lastFrameAt && performance.now() - lastFrameAt < 120) return;
      step(performance.now());
    }, 33);
    window.addEventListener('pointermove', onMove, { passive: true });
    const ro = new ResizeObserver(layout);
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(first);
      window.clearInterval(keepAlive);
      window.removeEventListener('pointermove', onMove);
      ro.disconnect();
    };
  }, [flamePath]);

  const c = CAM[phase] ?? CAM.idle;
  const I = Math.max(0.3, intensity);

  return (
    <div ref={stage} aria-hidden className="absolute inset-0 overflow-hidden bg-[#17130f]">
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transformOrigin: '50% 42%',
          transform: `translate(0%, ${(c.y * I).toFixed(2)}%) scale(${(1 + (c.s - 1) * I).toFixed(4)})`,
          transition: `transform ${c.ms}ms cubic-bezier(0.22, 0.61, 0.24, 1)`,
        }}
      >
        <div
          className="room-drift absolute inset-0"
          style={{
            animation: breath ? 'room-drift 23s ease-in-out infinite' : undefined,
          }}
        >
          <div
            className="absolute inset-0 bg-cover"
            style={{
              backgroundImage: `url(${basePath})`,
              backgroundPosition: '50% 46%',
              filter: `blur(${(c.blur * I).toFixed(2)}px) brightness(${c.br}) saturate(1.04)`,
              transition: `filter ${c.ms}ms ease-out`,
            }}
          />
          <div
            ref={glow}
            className="pointer-events-none absolute mix-blend-screen will-change-[opacity,transform]"
            style={{
              background:
                'radial-gradient(circle, rgba(240,186,116,0.5) 0%, rgba(214,141,66,0.22) 34%, transparent 68%)',
            }}
          />
          <canvas
            ref={canvas}
            className="pointer-events-none absolute mix-blend-screen"
            style={{
              filter: `blur(${(c.blur * I * 0.45).toFixed(2)}px) brightness(${((c.br + 0.14) * c.flame).toFixed(2)})`,
              transition: `filter ${c.ms}ms ease-out`,
            }}
          />
        </div>
      </div>

      {/* The vignette is what makes cream type readable on a lit photograph.
          It is deliberately outside the camera so it never scales. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 58% at 50% 42%, rgba(12,9,7,0) 0%, rgba(12,9,7,0.94) 100%)',
          opacity: c.dim,
          transition: `opacity ${c.ms}ms ease-out`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(12,9,7,0.5) 0%, rgba(12,9,7,0.12) 26%, transparent 40%)',
        }}
      />

      {/* The stop. Flat, so it reaches the middle of the frame the vignette
          leaves alone — which is where the flame is. See `stop` in CAM. */}
      <div
        className="pointer-events-none absolute inset-0 bg-[#0c0907]"
        style={{
          opacity: c.stop,
          transition: `opacity ${c.ms}ms ease-out`,
        }}
      />
    </div>
  );
}
