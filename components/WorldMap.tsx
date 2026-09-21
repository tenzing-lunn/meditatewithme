'use client';

import { useEffect, useRef } from 'react';

import { subsolarPoint, type Cell, type WorldPoint } from '@/lib/geo';
import { serverNow } from '@/lib/clock';
import { ASPECT, X_MAX, Y_MAX, project, unproject } from '@/lib/projection';
import { containFit, coverFit, longitudeFromOffset } from '@/lib/earthView';
import type { Room } from '@/lib/room';

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
 *
 * Warm since 14 September 2026: the ground under the earth is `dusk`
 * (#2b1a10), the sitting's deep brown, and a blue-grey ocean on it read as a
 * different picture pasted on. These are the same three ranks in the same
 * family as the ground.
 */
const OCEAN = '#34201a';
const LAND: [number, number, number] = [0x4b, 0x33, 0x28];
const COAST = '#6d4e3c';

/** How much of the night the terminator takes out. The shader's `mix(0.42, 1)`. */
const NIGHT_DEPTH = 0.58;

/**
 * The same three ranks in daylight, for the room at dawn: the ocean a shade
 * under the paper, the land a shade under that, the coast the darkest line.
 * Night is a light wash of the page's ink rather than black, and the terrain
 * is only a faint texture, because a light ground has no headroom to brighten
 * into.
 */
interface Palette {
  ocean: string;
  land: [number, number, number];
  coast: string;
  night: [number, number, number];
  nightDepth: number;
  /** The terrain multiplier from `reliefAt`, remapped for this ground. */
  relief: (k: number) => number;
}

const PALETTES: Record<Room, Palette> = {
  dusk: {
    ocean: OCEAN,
    land: LAND,
    coast: COAST,
    night: [0, 0, 0],
    nightDepth: NIGHT_DEPTH,
    relief: (k) => k,
  },
  dawn: {
    ocean: '#ecdcc6',
    land: [0xdc, 0xc6, 0xab],
    coast: '#b9a085',
    night: [0x3b, 0x2a, 0x1d],
    nightDepth: 0.2,
    relief: (k) => 0.93 + (k - 0.7) * 0.11,
  },
};

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
  palette: Palette,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(frame.width * dpr);
  canvas.height = Math.round(frame.height * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = palette.ocean;
  ctx.fill(edgePath(frame));

  if (!land) return canvas;
  const shape = landPath(frame, land);

  // Even-odd, so a hole ring inside an outer ring is punched out rather than
  // filled over — lakes stay water.
  ctx.fillStyle = `rgb(${palette.land[0]} ${palette.land[1]} ${palette.land[2]})`;
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
          const k = palette.relief(reliefAt(relief, place.lat, place.lon));
          image.data[at] = Math.min(255, palette.land[0] * k);
          image.data[at + 1] = Math.min(255, palette.land[1] * k);
          image.data[at + 2] = Math.min(255, palette.land[2] * k);
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
  ctx.strokeStyle = palette.coast;
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
function buildNight(at: number, palette: Palette): HTMLCanvasElement {
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
  const inside = new Uint8Array(w * h);
  for (let j = 0; j < h; j += 1) {
    for (let i = 0; i < w; i += 1) {
      const place = unproject(
        ((i + 0.5) / w) * 2 * X_MAX - X_MAX,
        Y_MAX - ((j + 0.5) / h) * 2 * Y_MAX,
      );
      const at4 = (j * w + i) * 4;
      if (!place) continue;
      inside[j * w + i] = 1;

      // The cosine of the sun's zenith angle: the sphere's own dot product,
      // written in latitude and longitude because that is what we have.
      const lat = place.lat * RAD;
      const lambert =
        Math.sin(sunLat) * Math.sin(lat) +
        Math.cos(sunLat) * Math.cos(lat) * Math.cos(place.lon * RAD - sunLon);

      const daylight = smoothstep(-0.14, 0.24, lambert);
      image.data[at4] = palette.night[0];
      image.data[at4 + 1] = palette.night[1];
      image.data[at4 + 2] = palette.night[2];
      image.data[at4 + 3] = Math.round((1 - daylight) * palette.nightDepth * 255);
    }
  }

  // Bled past the edge of the world, row by row, from the last pixel inside.
  // Scaled up, a pixel here is fifteen on a phone; left transparent, the rim
  // would fade to nothing across one of them and draw the grid as a stepped,
  // blurred ring round the earth. Filled, the scaling has nothing to fade
  // towards, and the draw is clipped to the vector outline instead.
  for (let j = 0; j < h; j += 1) {
    const row = j * w * 4;
    let first = -1;
    let last = -1;
    for (let i = 0; i < w; i += 1) {
      if (inside[j * w + i]) {
        if (first < 0) first = i;
        last = i;
      }
    }
    if (first < 0) continue;
    for (let i = 0; i < first; i += 1) {
      image.data.copyWithin(row + i * 4, row + first * 4, row + first * 4 + 4);
    }
    for (let i = last + 1; i < w; i += 1) {
      image.data.copyWithin(row + i * 4, row + last * 4, row + last * 4 + 4);
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
    A CANDLE, NOT A STAR. Since 14 September 2026 each light is a small
    candle: a teardrop of flame with a paler heart, a short wick under it,
    and the halo the cell's coarseness earns. Drawn about fifteen pixels
    across, the teardrop reads as a light that is slightly taller than it is
    wide, which is what a flame is and a dot is not. The footprint is still
    large and the flame small inside it, for the reason the star had: the
    whole sprite is drawn small, and a flame that filled it would be a blob.

    Anything that changes the flame's height has to change `sizes[i]` in
    `setPoints`, which is the footprint.
  */
  const halo = ctx.createRadialGradient(c, c, 0, c, c, c * 0.62);
  halo.addColorStop(0, f(255, 206, 140, 0.18));
  halo.addColorStop(0.5, f(232, 160, 86, 0.06));
  halo.addColorStop(1, f(224, 160, 87, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  // The wick: a short dim stem below the flame, so the light has a foot.
  ctx.fillStyle = f(210, 150, 100, 0.4);
  const wickW = c * 0.05;
  ctx.fillRect(c - wickW / 2, c + c * 0.16, wickW, c * 0.2);

  // The flame: a teardrop, tip up, widest below its middle.
  const tip = c - c * 0.36;
  const foot = c + c * 0.2;
  const wide = c * 0.17;
  const flame = new Path2D();
  flame.moveTo(c, tip);
  flame.bezierCurveTo(c + wide * 0.4, c - c * 0.1, c + wide, c + c * 0.02, c + wide * 0.85, c + c * 0.12);
  flame.bezierCurveTo(c + wide * 0.6, foot, c - wide * 0.6, foot, c - wide * 0.85, c + c * 0.12);
  flame.bezierCurveTo(c - wide, c + c * 0.02, c - wide * 0.4, c - c * 0.1, c, tip);

  const body = ctx.createRadialGradient(c, c + c * 0.06, 0, c, c + c * 0.04, c * 0.34);
  body.addColorStop(0, f(255, 246, 214, 1));
  body.addColorStop(0.35, f(255, 214, 140, 0.95));
  body.addColorStop(0.75, f(240, 160, 80, 0.55));
  body.addColorStop(1, f(220, 130, 60, 0));
  ctx.fillStyle = body;
  ctx.fill(flame);

  // The heart: a paler, smaller flame inside the first, slightly low.
  const heart = ctx.createRadialGradient(c, c + c * 0.08, 0, c, c + c * 0.08, c * 0.16);
  heart.addColorStop(0, f(255, 255, 240, 0.9));
  heart.addColorStop(1, f(255, 230, 180, 0));
  ctx.fillStyle = heart;
  ctx.fill(flame);

  /**
   * A glint: a soft streak out from the centre. What turns a mark into a
   * light. Two now, on the axes, fainter than the star had: enough to say
   * "emitting", not enough to turn the flame back into a spark.
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

  glint(0, c * 0.7, c * 0.02, 0.4);
  glint(Math.PI / 2, c * 0.5, c * 0.018, 0.3);

  return canvas;
}

/* ---------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------- */

export default function WorldMap({
  points,
  you = null,
  fit = 'contain',
  waiting = false,
  room = 'dusk',
  paused = false,
  className,
}: {
  points: WorldPoint[];
  /**
   * Your own cell, marked client-side: a slightly larger candle with a soft
   * ring. The server never says which light is whose (`/api/world` is the
   * same for every caller), so this is the one thing the browser adds.
   */
  you?: Cell | null;
  /**
   * `contain`, the whole earth fitted, for the sitting and `/world`. `cover`
   * fills the frame for the doors: the whole width on a wide screen, and on a
   * tall one cropped to the longitudes around `you` — or, before the edge has
   * said where that is, around the device's time zone. See `lib/earthView.ts`.
   */
  fit?: 'contain' | 'cover';
  /**
   * Not sitting yet: your place is an unlit dashed ring marked *You* rather
   * than a candle, because nothing of yours has been lit.
   */
  waiting?: boolean;
  /** Dawn or dusk: which palette the ground, the night and the lights are drawn in. */
  room?: Room;
  /**
   * Hold the last frame and stop the loop: something covers the earth, and
   * a full-screen canvas repainting sixty times a second under it is what
   * makes that thing stutter.
   */
  paused?: boolean;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  // Read by the scene, which is built once; a render only updates them.
  const fitRef = useRef(fit);
  fitRef.current = fit;
  const waitingRef = useRef(waiting);
  waitingRef.current = waiting;
  const roomRef = useRef(room);
  roomRef.current = room;

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
    setYou: (you: Cell | null) => void;
    setRoom: (room: Room) => void;
    setPaused: (paused: boolean) => void;
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
    // The page's own body face, for the one word drawn on the earth.
    const youFont = `700 12px ${getComputedStyle(host).fontFamily}`;

    let disposed = false;
    let land: LandData | null = null;
    let relief: ImageData | null = null;

    let frame: Frame = { width: 0, height: 0, scale: 0 };
    let left = 0;
    let top = 0;
    let ground: HTMLCanvasElement | null = null;
    // The ground with the night laid over it, at device resolution: what the
    // frame loop draws, in one copy with no scaling. Clipping and upscaling
    // the night every frame instead cost more than every light on the earth.
    const base = document.createElement('canvas');
    let edge: Path2D | null = null;
    let nightAt = 0;
    // The room the ground was last built for, so a render that did not change
    // it does not rebuild the most expensive thing in this file.
    let builtRoom: Room = room;

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
    let mine: Cell | null = you;
    let mineX = 0;
    let mineY = 0;
    let mineSize = 0;

    const place = () => {
      const next = latest;
      if (mine) {
        const p = project(mine.lat, mine.lon);
        mineX = left + px(frame, p.x);
        mineY = top + py(frame, p.y);
        mineSize = Math.max(13, frame.width * 0.0135) * 1.5;
      }
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

    const bake = () => {
      nightAt = serverNow();
      const b = ground && base.getContext('2d');
      if (!ground || !b) return;
      base.width = ground.width;
      base.height = ground.height;
      b.drawImage(ground, 0, 0);
      // Clipped to the world's outline, so the rim is a vector edge at
      // device resolution like the coast, not the night layer's grid.
      b.setTransform(base.width / frame.width, 0, 0, base.height / frame.height, 0, 0);
      if (edge) b.clip(edge);
      b.imageSmoothingQuality = 'high';
      b.drawImage(buildNight(nightAt, PALETTES[builtRoom]), 0, 0, frame.width, frame.height);
    };

    // Repaints once after a layout while the loop is paused, since resizing
    // the canvas clears it. Set once the frame loop exists.
    let redraw = () => {};

    const layout = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      // Fitted to whichever dimension runs out first, never cropped, for the
      // sitting and `/world`: a world map that does not show the whole world
      // is answering a different question from the one those pages ask. The
      // doors ask another — where am I, among these people — and cover the
      // frame instead.
      const fitted =
        fitRef.current === 'cover'
          ? coverFit(
              w,
              h,
              mine ?? { lat: 20, lon: longitudeFromOffset(new Date().getTimezoneOffset()) },
            )
          : containFit(w, h);
      frame = { width: fitted.width, height: fitted.height, scale: fitted.scale };
      left = fitted.left;
      top = fitted.top;
      edge = edgePath(frame);

      builtRoom = roomRef.current;
      ground = buildGround(frame, dpr, land, relief, PALETTES[builtRoom]);
      bake();
      place();
      redraw();
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
      raf = 0;
      if (disposed) return;
      // Paused, this frame is drawn and it is the last until play resumes.
      if (!pausedRef.current) raf = requestAnimationFrame(render);

      const elapsed = reducedMotion ? 0 : (performance.now() - startedAt) / 1000;

      // The sun moves a quarter of a degree a minute, which is under a pixel
      // here, so the night is rebuilt on the minute rather than on the frame.
      if (serverNow() - nightAt > 60_000) bake();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      if (ground) ctx.drawImage(base, left, top, frame.width, frame.height);

      // One breath for the whole earth: about five and a half seconds in and
      // out, which is roughly a resting breath and slower than anybody watches
      // for. Every light does it together, which is the point of the page.
      const breath = 1 + Math.sin(elapsed * 1.15) * 0.075;

      // Light adds on dusk. At dawn there is nothing to add to, so the flames
      // darken the ground instead (multiply), and each gets a small ember
      // heart so the lights can still be counted.
      const dawn = builtRoom === 'dawn';
      ctx.globalCompositeOperation = dawn ? 'multiply' : 'lighter';
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
        if (dawn) {
          ctx.fillStyle = 'rgba(156, 61, 18, 0.85)';
          ctx.beginPath();
          ctx.arc(xs[i]!, ys[i]! + s * 0.04, Math.max(1.4, s * 0.06), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Your own light: the same candle, half again as big, with a soft
      // ring that breathes with the rest.
      if (mine && waitingRef.current) {
        // Before the strike: the place, unlit, and the word. Breathes with
        // the rest so it belongs to the same earth.
        const r = mineSize * 0.42 * breath;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.setLineDash([3, 3.5]);
        ctx.strokeStyle = dawn ? 'rgba(106, 83, 66, 0.85)' : 'rgba(215, 191, 166, 0.85)';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(mineX, mineY, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = youFont;
        ctx.fillStyle = dawn ? 'rgba(59, 42, 29, 0.92)' : 'rgba(246, 233, 216, 0.92)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('You', mineX - r - 7, mineY);
        ctx.textAlign = 'start';
      } else if (mine) {
        const s = mineSize * breath;
        ctx.globalAlpha = 1;
        ctx.drawImage(sprites[0]!, mineX - s / 2, mineY - s / 2, s, s);
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = dawn ? 'rgba(156, 61, 18, 0.5)' : 'rgba(224, 160, 87, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mineX, mineY, s * 0.42, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    render();
    redraw = () => {
      if (!raf) render();
    };

    const observer = new ResizeObserver(layout);
    observer.observe(host);

    sceneRef.current = {
      setPoints: (next) => {
        latest = next;
        place();
      },
      setYou: (next) => {
        mine = next;
        // A covered earth is cropped around you, so knowing where you are
        // moves the whole map, not just your mark.
        if (fitRef.current === 'cover') layout();
        else place();
      },
      setRoom: (next) => {
        // Another palette is another ground and another night.
        if (next !== builtRoom) layout();
      },
      setPaused: (next) => {
        if (!next && !raf && !disposed) raf = requestAnimationFrame(render);
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

  useEffect(() => {
    sceneRef.current?.setYou(you);
  }, [you]);

  useEffect(() => {
    sceneRef.current?.setRoom(room);
  }, [room]);

  useEffect(() => {
    sceneRef.current?.setPaused(paused);
  }, [paused]);

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
