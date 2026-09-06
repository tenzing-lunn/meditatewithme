'use client';

import { useEffect, useRef } from 'react';

import { subsolarPoint, type WorldPoint } from '@/lib/geo';
import { serverNow } from '@/lib/clock';
import { ASPECT, X_MAX, Y_MAX, project, unproject } from '@/lib/projection';

/**
 * The earth laid flat, with a light where somebody is sitting.
 *
 * This was a three.js globe until 6 September 2026. Jonny asked for a flat map
 * and the trade is a real one both ways, so it is written down here rather than
 * argued for: a sphere shows half a planet and has to be turned to show the
 * rest, and *turning it* was the only thing on this page you touched. A map
 * shows everybody at once. On a page whose entire subject is how many people
 * there are and where, seeing all of them without moving anything is the better
 * answer — and it costs the drag, the coasting, and the slow drift under the
 * sun, all of which are gone.
 *
 * WHAT IS REAL HERE, AND WHY IT MATTERS THAT IT IS
 * The whole product rests on one claim — that the moment is shared — and §6.2
 * spends a page on clock drift because a candle lit three minutes early
 * silently isn't shared. A map is the same claim drawn as a picture, so it has
 * to survive the same scrutiny:
 *
 *   * The geography is two real layers. Natural Earth's coastlines at 1:110m
 *     draw the shape; a desaturated Blue Marble supplies the terrain within it.
 *     Every coast is where the coast is, and the Sahara is pale because the
 *     Sahara is pale.
 *   * The terminator is computed from `subsolarPoint(serverNow())`, so the lit
 *     half of the earth is the lit half of the earth, to well under a degree.
 *     It uses the corrected clock for exactly the reason §6.2 gives: a device
 *     three minutes fast must not draw a different world.
 *   * A light is a grid cell with a heartbeat in it. Nothing is invented, and
 *     when the count is unavailable the earth is simply dark — see the catch in
 *     `/api/world`. A meditation site does not invent company, and it does not
 *     invent it at planetary scale either.
 *
 * WHY EQUAL EARTH AND NOT A PLAIN RECTANGLE
 * The argument is in `lib/projection.ts`, next to the maths and the test that
 * keeps it honest. The short of it: an equal-area map does not hand the
 * northern hemisphere more room per person than the southern, on a page whose
 * only job is to say where people actually are.
 *
 * WHAT IS NOT REAL, DELIBERATELY
 * The lights breathe together and each one pings on its own. Nobody's candle
 * flickers on a schedule. That is the one piece of theatre here and it earns
 * its place twice over: the shared breath is the claim the product is built on
 * drawn as motion, and the halo around each ping keeps a light from being a
 * hard dot at a cell centre — which would claim a precision the data does not
 * have, the cell being a degree across.
 *
 * The tuning is a balance between those two and a third thing: **the lights
 * have to stay countable.** Small and sharp reads as twenty places; soft and
 * broad merges into one glow, and on a page whose subject is how many people
 * there are, that is a picture of a mood instead of a number.
 *
 * WHY THIS IS ITS OWN ROUTE AND LOADS ITSELF
 * Less of a reason than it used to be — `three` is gone with the sphere, and
 * what is left is this file and 273KB of earth. It is still imported by `World`
 * behind `next/dynamic`, because it touches `document` while building its
 * sprites and because none of the geography belongs on the path to meditating.
 */

/** Radians per degree; the sun maths below is the only user left. */
const RAD = Math.PI / 180;

/* ---------------------------------------------------------------------------
 * The ground
 * ------------------------------------------------------------------------- */

/** What `public/earth/land.json` holds. */
interface LandData {
  /** Coordinates are integers; divide by this to get degrees. */
  scale: number;
  /** Each polygon is an outer ring followed by its holes; each ring is flat. */
  polygons: number[][][];
}

/**
 * The palette, and it is three values rather than three colours.
 *
 * Ocean sits barely above the page's own ground so the earth reads as an object
 * rather than a hole, land sits a hair above the ocean, and the coast is the
 * brightest thing here — which is still far below the dimmest candle. Nothing
 * is pure black or pure white. The ranking is not negotiable: candles first,
 * coastlines second, the edge of the world last.
 */
const OCEAN = '#1b2026';
const LAND: [number, number, number] = [0x2b, 0x31, 0x38];
const COAST = '#3f4854';

/** How much of the night the terminator takes out. The shader's `mix(0.42, 1)`. */
const NIGHT_DEPTH = 0.58;

/** Where the map sits inside the canvas, and how big projection units are. */
interface Frame {
  width: number;
  height: number;
  scale: number;
}

/** Projection units to pixels within the map's own rectangle. */
function px(frame: Frame, x: number): number {
  return (x + X_MAX) * frame.scale;
}
function py(frame: Frame, y: number): number {
  return (Y_MAX - y) * frame.scale;
}

/**
 * The outline of the whole earth: the two edge meridians, top to bottom.
 *
 * Equal Earth's boundary is a curve, so it has to be walked rather than
 * assumed. This is what the ocean is filled inside of, and what keeps the
 * corners of the frame empty.
 */
function edgePath(frame: Frame): Path2D {
  const path = new Path2D();
  for (let i = 0; i <= 180; i += 1) {
    const p = project(90 - i, 180);
    if (i === 0) path.moveTo(px(frame, p.x), py(frame, p.y));
    else path.lineTo(px(frame, p.x), py(frame, p.y));
  }
  for (let i = 0; i <= 180; i += 1) {
    const p = project(-90 + i, -180);
    path.lineTo(px(frame, p.x), py(frame, p.y));
  }
  path.closePath();
  return path;
}

/**
 * The coastlines, projected.
 *
 * Drawn as a path at the size it will be seen rather than rasterised into a
 * texture and stretched over something — which is the one clear win the flat
 * map gets for free. Every coast is a vector edge at device resolution.
 */
function landPath(frame: Frame, data: LandData): Path2D {
  const path = new Path2D();
  const s = data.scale;
  for (const polygon of data.polygons) {
    for (const ring of polygon) {
      for (let i = 0; i < ring.length; i += 2) {
        const p = project(ring[i + 1]! / s, ring[i]! / s);
        if (i === 0) path.moveTo(px(frame, p.x), py(frame, p.y));
        else path.lineTo(px(frame, p.x), py(frame, p.y));
      }
      path.closePath();
    }
  }
  return path;
}

/**
 * The terrain, as a control map rather than a picture.
 *
 * `relief.jpg` is the Blue Marble desaturated and cut to 220KB. It is never
 * displayed: it only ever *modulates* what the coastline vector already
 * decided, which is why the land can be a flat fill if the file never arrives
 * and still be correct.
 *
 * REMAPPED AGAINST THE MAP'S ACTUAL DISTRIBUTION, NOT AN ASSUMED ONE.
 * Measured over the shipped file: mean 0.29 but median 0.149, because most of
 * the earth is ocean sitting near 0.03 while ice and desert run to 0.94.
 * Centring the modulation on the mean — the obvious first guess, and the one
 * tried — puts almost all land *below* centre, so the effect darkened the
 * continents instead of texturing them and spent its whole range on the ice
 * caps. The useful band is taken explicitly: 0.06 to 0.61 covers ocean floor up
 * to bright desert, clamped at both ends, stretched across a multiplier from
 * 0.70 to 1.75.
 *
 * The slope shading the globe had is gone with the sphere. It lit the gradient
 * of this map from the real sun, which picked out the Andes as the terminator
 * crossed them — and it was the one thing on that page that was not a fact,
 * since albedo is not elevation. A flat map is read, not orbited; it does not
 * miss the drama, and the file is one honest layer lighter for it.
 */
function reliefAt(relief: ImageData, lat: number, lon: number): number {
  const u = Math.min(relief.width - 1, Math.max(0, Math.round(((lon + 180) / 360) * relief.width)));
  const v = Math.min(relief.height - 1, Math.max(0, Math.round(((90 - lat) / 180) * relief.height)));
  const h = relief.data[(v * relief.width + u) * 4]! / 255;
  const t = Math.min(1, Math.max(0, (h - 0.06) / 0.55));
  return 0.7 + t * 1.05;
}

/**
 * Ocean, land, terrain, coast — in that order, once, at the size on screen.
 *
 * The terrain pass is per-pixel and therefore the expensive thing in this file,
 * so it runs on resize and never again: nothing about it changes with the
 * clock. The terminator, which does, is a separate and much smaller layer.
 */
function buildGround(
  frame: Frame,
  dpr: number,
  land: LandData | null,
  relief: ImageData | null,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(frame.width * dpr);
  canvas.height = Math.round(frame.height * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = OCEAN;
  ctx.fill(edgePath(frame));

  if (!land) return canvas;
  const shape = landPath(frame, land);

  // Even-odd, so a hole ring inside an outer ring is punched out rather than
  // filled over — lakes stay water.
  ctx.fillStyle = `rgb(${LAND[0]} ${LAND[1]} ${LAND[2]})`;
  ctx.fill(shape, 'evenodd');

  if (relief) {
    // Half resolution. The terrain is a soft modulation with no edges of its
    // own — every edge on the earth belongs to the coastline, which is drawn
    // over the top of this at full resolution — so the halving is invisible and
    // it is four times less pixel arithmetic.
    const w = Math.max(1, Math.round(frame.width / 2));
    const h = Math.max(1, Math.round(frame.height / 2));
    const layer = document.createElement('canvas');
    layer.width = w;
    layer.height = h;
    const lctx = layer.getContext('2d');
    if (lctx) {
      const image = lctx.createImageData(w, h);
      for (let j = 0; j < h; j += 1) {
        for (let i = 0; i < w; i += 1) {
          const place = unproject(
            ((i + 0.5) / w) * 2 * X_MAX - X_MAX,
            Y_MAX - ((j + 0.5) / h) * 2 * Y_MAX,
          );
          const at = (j * w + i) * 4;
          if (!place) continue;
          const k = reliefAt(relief, place.lat, place.lon);
          image.data[at] = Math.min(255, LAND[0] * k);
          image.data[at + 1] = Math.min(255, LAND[1] * k);
          image.data[at + 2] = Math.min(255, LAND[2] * k);
          image.data[at + 3] = 255;
        }
      }
      lctx.putImageData(image, 0, 0);

      // Clipped to the land, so the ocean keeps its single flat value and the
      // terrain never leaks into the sea.
      ctx.save();
      ctx.clip(shape, 'evenodd');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(layer, 0, 0, frame.width, frame.height);
      ctx.restore();
    }
  }

  // Last, and at full resolution: the only line on this earth is where water
  // meets land. No political borders, no graticule, no labels — the moment
  // there are, this is a dashboard.
  ctx.strokeStyle = COAST;
  ctx.lineWidth = 0.75;
  ctx.lineJoin = 'round';
  ctx.stroke(shape);

  return canvas;
}

/**
 * Night, as a layer of dark with a soft edge.
 *
 * Deliberately coarse — a sixth of the map's width — and then scaled up by the
 * browser. The terminator is the softest gradient on the page (it is spread
 * over about twenty degrees of longitude, because the sun is not a point source
 * and the atmosphere carries light round the edge), so there is nothing here
 * for the resolution to lose, and at this size the whole pass is a few
 * thousand pixels.
 *
 * The night floor is 0.42 of the day, not zero. Geography has to stay readable
 * all the way round or half the candles sit on nothing, and an earth whose dark
 * side is genuinely black is a crescent rather than a planet.
 */
function buildNight(at: number): HTMLCanvasElement {
  const w = 200;
  const h = Math.max(1, Math.round(w / ASPECT));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const sun = subsolarPoint(at);
  const sunLat = sun.lat * RAD;
  const sunLon = sun.lon * RAD;

  const image = ctx.createImageData(w, h);
  for (let j = 0; j < h; j += 1) {
    for (let i = 0; i < w; i += 1) {
      const place = unproject(
        ((i + 0.5) / w) * 2 * X_MAX - X_MAX,
        Y_MAX - ((j + 0.5) / h) * 2 * Y_MAX,
      );
      const at4 = (j * w + i) * 4;
      if (!place) continue;

      // The cosine of the sun's zenith angle: the sphere's own dot product,
      // written in latitude and longitude because that is what we have.
      const lat = place.lat * RAD;
      const lambert =
        Math.sin(sunLat) * Math.sin(lat) +
        Math.cos(sunLat) * Math.cos(lat) * Math.cos(place.lon * RAD - sunLon);

      const daylight = smoothstep(-0.14, 0.24, lambert);
      image.data[at4 + 3] = Math.round((1 - daylight) * NIGHT_DEPTH * 255);
    }
  }
  ctx.putImageData(image, 0, 0);

  return canvas;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/* ---------------------------------------------------------------------------
 * The lights
 * ------------------------------------------------------------------------- */

/**
 * Where a cell sits in the ping cycle, from the cell itself.
 *
 * Deterministic, and that is the requirement rather than a nicety: the points
 * are rebuilt from scratch every time `/api/world` returns, and a
 * `Math.random()` phase would hand every light a new one every fifteen seconds.
 * The visible result is not "random twinkling" but the entire earth jumping at
 * once on the poll, which is worse than no twinkle at all.
 */
function pingPhase(lat: number, lon: number): number {
  return hash(lat, lon, 12.9898, 78.233) * Math.PI * 2;
}

/**
 * The other half of a light's identity: how fast it pings and what colour it
 * is.
 *
 * Giving every light the same rhythm at a different phase produces a field that
 * shimmers evenly, and evenness is the tell — it reads as an effect applied to
 * a dataset. Varying the rate as well means the pattern never repeats and no
 * two neighbours stay in step, which is the difference between "these are
 * points with an animation on them" and "these are people".
 *
 * A different hash from the phase, or the two would correlate and the fastest
 * lights would all be at the same point in their cycle.
 */
function pingSeed(lat: number, lon: number): number {
  return hash(lat, lon, 39.3467, 11.135);
}

/** The usual hash-a-float trick. Stability is the requirement, not quality. */
function hash(lat: number, lon: number, a: number, b: number): number {
  const n = Math.sin(lat * a + lon * b) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Warm to pale, per light. Kept inside the ember family on purpose — the
 * palette allows exactly one colour and this is a variation within it, not a
 * second hue. What it buys is that no two adjacent candles are the same colour,
 * so a cluster reads as a handful of people rather than as one symbol stamped
 * repeatedly.
 *
 * Five sprites rather than a tint per light: this is a canvas, so a colour is
 * baked into a bitmap rather than handed to a shader, and five is comfortably
 * past the point where a cluster stops looking stamped.
 */
const TINTS = 5;

/**
 * The sprite every light is drawn with.
 *
 * Generated rather than shipped: it is a radial gradient, and a PNG of one
 * would be bytes the page does not need.
 *
 * A PINPRICK WITH A SHORT HALO, NOT A BLOOM. The ground is dark everywhere, so
 * a light does not have to shout over a sunlit ocean the way it did when the
 * earth was a photograph. What is left is a hard core inside a third of the
 * radius, most of the falloff spent by 40%, and a faint skirt that exists only
 * to keep the edge from aliasing.
 *
 * The change is not only aesthetic. Something small and sharp can be *counted*
 * — twenty of them read as twenty places — where the same twenty soft blooms
 * merge into a smear that reads as one glow. On a map whose whole subject is
 * how many people there are, that is the difference between a picture of a
 * number and a mood.
 */
function flameSprite(warmth: number): HTMLCanvasElement {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const c = size / 2;

  // Warm at 0, pale at 1, as a multiplier on every stop below.
  const f = (r: number, g: number, b: number, a: number) =>
    `rgba(${Math.min(255, Math.round(r * (1.06 + (0.98 - 1.06) * warmth)))},` +
    `${Math.min(255, Math.round(g * (0.94 + (1.0 - 0.94) * warmth)))},` +
    `${Math.min(255, Math.round(b * (0.8 + (1.04 - 0.8) * warmth)))},${a})`;

  // Additive within the sprite as well as outside it, so the glints lie on top
  // of the core and brighten it rather than painting over it.
  ctx.globalCompositeOperation = 'lighter';

  /*
    THE CORE OCCUPIES A THIRD OF THE SPRITE, NOT ALL OF IT — AND THAT IS WHY
    THE STAR IS VISIBLE AT ALL.

    Filling the sprite with the core and putting the glints at 96% of its radius
    is correct in the texture and invisible on screen, because the whole sprite
    is drawn about twenty pixels across and the spikes land sub-pixel. Making
    the light bigger would fix the star and lose the pinprick, which was the
    point. So the footprint is large and the core is small inside it.

    Anything that changes one of these two numbers has to change the other:
    `sizes[i]` in `setPoints` is the footprint, and this is the fraction of it
    that is bright.
  */
  const core = ctx.createRadialGradient(c, c, 0, c, c, c * 0.3);
  core.addColorStop(0, f(255, 252, 245, 1));
  core.addColorStop(0.28, f(255, 238, 203, 0.92));
  core.addColorStop(0.55, f(255, 198, 124, 0.4));
  core.addColorStop(1, f(230, 150, 70, 0));
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  // The bloom the cell's coarseness earns — a degree is 111km, so a light is a
  // region and not a pin. Faint and wide, under the core rather than around it.
  const halo = ctx.createRadialGradient(c, c, 0, c, c, c * 0.62);
  halo.addColorStop(0, f(255, 206, 140, 0.16));
  halo.addColorStop(0.5, f(232, 160, 86, 0.06));
  halo.addColorStop(1, f(224, 160, 87, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  /**
   * A glint: a soft streak out from the centre.
   *
   * This is what turns a dot into a light. A disc of any size reads as a
   * painted mark; the moment it has spikes the eye reads it as something
   * *emitting*, because that is what a bright point does to a lens and to a
   * squinted eye. It is the cheapest possible piece of life and it is why these
   * stopped looking like yellow stickers.
   *
   * The gradient is built after the transform on purpose — canvas gradients
   * live in user space, so creating it inside the scale is what stretches a
   * circle into a streak. Building it first and scaling after would move the
   * streak instead of shaping it.
   */
  const glint = (angle: number, reach: number, width: number, a: number) => {
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(angle);
    ctx.scale(reach, width);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, f(255, 244, 224, a));
    g.addColorStop(0.35, f(255, 216, 156, a * 0.3));
    g.addColorStop(1, f(255, 200, 130, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  };

  // Four spikes, the diagonals shorter and fainter than the axes. Kept well
  // under the core's brightness: this should read as a twinkle at the size
  // these are drawn, never as a lens flare on a photograph.
  glint(0, c * 0.98, c * 0.022, 0.62);
  glint(Math.PI / 2, c * 0.98, c * 0.022, 0.62);
  glint(Math.PI / 4, c * 0.46, c * 0.016, 0.26);
  glint(-Math.PI / 4, c * 0.46, c * 0.016, 0.26);

  return canvas;
}

/* ---------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------- */

export default function WorldMap({
  points,
  className,
}: {
  points: WorldPoint[];
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  /**
   * The live scene, kept out of React state on purpose.
   *
   * Everything in here changes up to sixty times a second. Putting any of it in
   * state would re-render the tree on every frame to no effect, and putting the
   * points in state would rebuild the ground each time the poll returned the
   * same earth it returned fifteen seconds ago.
   */
  const sceneRef = useRef<{
    setPoints: (points: WorldPoint[]) => void;
    dispose: () => void;
  } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    const ctx = canvas.getContext('2d');
    // No 2D context is a locked-down browser or a headless check. Return
    // quietly and let the page show its caption over an empty frame, rather
    // than throwing where somebody expected a picture.
    if (!ctx) return;
    host.appendChild(canvas);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let disposed = false;
    let land: LandData | null = null;
    let relief: ImageData | null = null;

    let frame: Frame = { width: 0, height: 0, scale: 0 };
    let left = 0;
    let top = 0;
    let ground: HTMLCanvasElement | null = null;
    let night: HTMLCanvasElement | null = null;
    let nightAt = 0;

    const sprites = Array.from({ length: TINTS }, (_, i) =>
      flameSprite(i / (TINTS - 1)),
    );

    /** Everything the frame loop needs about a light, in flat arrays. */
    let count = 0;
    let xs = new Float32Array(0);
    let ys = new Float32Array(0);
    let sizes = new Float32Array(0);
    let glows = new Float32Array(0);
    let phases = new Float32Array(0);
    let seeds = new Float32Array(0);

    let latest: WorldPoint[] = points;

    const place = () => {
      const next = latest;
      count = next.length;
      xs = new Float32Array(count);
      ys = new Float32Array(count);
      sizes = new Float32Array(count);
      glows = new Float32Array(count);
      phases = new Float32Array(count);
      seeds = new Float32Array(count);

      next.forEach((point, i) => {
        const p = project(point.lat, point.lon);
        xs[i] = left + px(frame, p.x);
        ys[i] = top + py(frame, p.y);

        // The FOOTPRINT of the sprite, as a fraction of the map's width — so a
        // light is the same size relative to the earth on every screen. The
        // core is 30% of this and the rest is spikes and falloff, so the
        // visible pinprick for a single sitter is about five pixels on a map a
        // thousand across.
        //
        // Grows with the room, but as a square root. A cell with forty people
        // in it is not forty times the place a cell with one person in it is,
        // and growing linearly turns a single city into a blot over a
        // continent — which is exactly what the first version of this did.
        //
        // The floor is for the phone, where the whole earth is 375px wide and
        // the fraction alone comes out at four pixels — a sub-pixel core, which
        // is to say a dead grey dot. A light there is oversized against the
        // geography on purpose: this page is a count of people before it is a
        // map, and a candle nobody can see is the one failure it cannot have.
        sizes[i] = Math.max(
          13,
          frame.width * (0.0135 + Math.sqrt(point.lit) * 0.0055),
        );

        phases[i] = pingPhase(point.lat, point.lon);
        seeds[i] = pingSeed(point.lat, point.lon);

        // Lit, not live — the same distinction the room's ring draws. Somebody
        // who sat the first ten minutes of the hour and closed the tab lit a
        // candle here, and it does not go out because they left.
        const stillHere = point.lit > 0 ? point.live / point.lit : 0;
        // The floor is high on purpose. A cell where everybody has since closed
        // the tab is the ordinary state of most of the map for most of an hour
        // — it is what "lit this hour" means — so it has to be comfortably
        // visible, not a hint. The range says "here, and still here"; it is not
        // there to hide anybody.
        glows[i] = 0.55 + stillHere * 0.45;
      });
    };

    const layout = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      // Fitted to whichever dimension runs out first, never cropped. A world
      // map that does not show the whole world is answering a different
      // question from the one this page asks.
      const scale = Math.min(w / (2 * X_MAX), h / (2 * Y_MAX));
      frame = { width: 2 * X_MAX * scale, height: 2 * Y_MAX * scale, scale };
      left = (w - frame.width) / 2;
      top = (h - frame.height) / 2;

      ground = buildGround(frame, dpr, land, relief);
      night = buildNight(serverNow());
      nightAt = serverNow();
      place();
    };

    /*
      The geography, both files, then one layout when either lands.

      The ground is correct from the first frame and simply gains detail: a
      plain dark ocean, then the coastlines, then the terrain within them. If a
      fetch fails the earth keeps whatever it has — featureless, but not broken,
      and the lights still sit in the right places on it.
    */
    const abort = new AbortController();

    void (async () => {
      try {
        const res = await fetch('/earth/land.json', { signal: abort.signal });
        if (!res.ok || disposed) return;
        land = (await res.json()) as LandData;
        if (!disposed) layout();
      } catch {
        // Aborted on unmount, offline, or a bad file. The plain sea stands.
      }
    })();

    const image = new Image();
    image.src = '/earth/relief.jpg';
    image.onload = () => {
      if (disposed) return;
      // Read once, at a size the half-resolution terrain pass cannot out-sample.
      const off = document.createElement('canvas');
      off.width = 1024;
      off.height = 512;
      const octx = off.getContext('2d', { willReadFrequently: true });
      if (!octx) return;
      octx.drawImage(image, 0, 0, off.width, off.height);
      try {
        relief = octx.getImageData(0, 0, off.width, off.height);
      } catch {
        // A tainted canvas should be impossible for a same-origin file, but a
        // flat earth is a better outcome here than a thrown error.
        return;
      }
      layout();
    };

    layout();

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let raf = 0;
    const startedAt = performance.now();

    const render = () => {
      if (disposed) return;
      raf = requestAnimationFrame(render);

      const elapsed = reducedMotion ? 0 : (performance.now() - startedAt) / 1000;

      // The sun moves a quarter of a degree a minute, which is under a pixel
      // here, so the night is rebuilt on the minute rather than on the frame.
      const now = serverNow();
      if (now - nightAt > 60_000) {
        night = buildNight(now);
        nightAt = now;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      if (ground) ctx.drawImage(ground, left, top, frame.width, frame.height);
      if (night) {
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(night, left, top, frame.width, frame.height);
      }

      // One breath for the whole earth: about five and a half seconds in and
      // out, which is roughly a resting breath and slower than anybody watches
      // for. Every light does it together, which is the point of the page.
      const breath = 1 + Math.sin(elapsed * 1.15) * 0.075;

      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < count; i += 1) {
        const seed = seeds[i]!;

        // THE PING. Squared rather than a plain sine, and that is the whole
        // character of it: sin·0.5+0.5 spends as long bright as dim and reads
        // as a pulse, where squaring it makes each light sit low most of the
        // time and flare briefly. That is what separates a field of candles
        // from a row of indicator LEDs.
        //
        // Its own rate, not just its own offset. 1.45 to 2.35 is narrow enough
        // that the field still reads as one rhythm and wide enough that no two
        // neighbours hold step.
        const rate = 1.45 + seed * 0.9;
        const pulse = Math.sin(elapsed * rate + phases[i]!) * 0.5 + 0.5;

        // THE FLARE. A second, much slower wave at an unrelated frequency, so
        // the two drift in and out of alignment and a light occasionally pings
        // harder than usual before settling back. Nothing schedules it and it
        // never repeats — which is the whole reason it reads as alive rather
        // than as an animation running on a list.
        const slow = Math.sin(elapsed * rate * 0.31 + phases[i]! * 1.7) * 0.5 + 0.5;
        const ping = 0.66 + 0.34 * pulse * pulse * (0.5 + 0.5 * slow);

        // The ping is on brightness AND, faintly, on size. A light that only
        // changes brightness reads as a bulb on a dimmer; a real one appears to
        // swell as it brightens, because the dim outer part of it crosses the
        // threshold of visible. 6% either way is under conscious notice and
        // does all the work.
        const s = sizes[i]! * breath * (0.97 + 0.06 * pulse);

        ctx.globalAlpha = Math.min(1, glows[i]! * ping);
        ctx.drawImage(
          sprites[Math.min(TINTS - 1, Math.floor(seed * TINTS))]!,
          xs[i]! - s / 2,
          ys[i]! - s / 2,
          s,
          s,
        );
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    render();

    const observer = new ResizeObserver(layout);
    observer.observe(host);

    sceneRef.current = {
      setPoints: (next) => {
        latest = next;
        place();
      },
      dispose: () => {
        disposed = true;
        cancelAnimationFrame(raf);
        observer.disconnect();
        abort.abort();
        image.onload = null;
        canvas.remove();
      },
    };

    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // Built once. New points arrive through the effect below, which reprojects
    // them into the arrays the frame loop reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneRef.current?.setPoints(points);
  }, [points]);

  return <div ref={hostRef} className={className} aria-hidden />;
}

/*
 * VERIFYING THE PROJECTION
 *
 * `project` has to agree with the coastlines it draws or every light sits in
 * the sea, and it fails in a way that looks plausible — a map with lights on
 * it, all in the wrong places. `tests/projection.test.ts` round-trips one city
 * per quadrant, because the two failure modes (a flipped longitude and a
 * flipped latitude) each look correct from one hemisphere. The last check is
 * still the eye: render it and see whether London is on London.
 */
