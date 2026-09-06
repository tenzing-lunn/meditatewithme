'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { subsolarPoint, type WorldPoint } from '@/lib/geo';
import { serverNow } from '@/lib/clock';

/**
 * The earth, with a light where somebody is sitting.
 *
 * WHAT IS REAL HERE, AND WHY IT MATTERS THAT IT IS
 * The whole product rests on one claim — that the moment is shared — and §6.2
 * spends a page on clock drift because a candle lit three minutes early
 * silently isn't shared. A globe is the same claim drawn as a picture, so it
 * has to survive the same scrutiny:
 *
 *   * The geography is two real layers. Natural Earth's coastlines at 1:110m
 *     draw the shape; a desaturated Blue Marble supplies the terrain within
 *     it. It used to be the photograph alone; the change is stylisation of the
 *     *rendering*, not of the facts — every coast is where the coast is, and
 *     the Sahara is pale because the Sahara is pale.
 *   * The terminator is computed from `subsolarPoint(serverNow())`, so the lit
 *     half of the earth is the lit half of the earth, to well under a degree.
 *     It uses the corrected clock for exactly the reason §6.2 gives: a device
 *     three minutes fast must not draw a different world.
 *   * A light is a grid cell with a heartbeat in it. Nothing is invented, and
 *     when the count is unavailable the earth is simply dark — see the catch in
 *     `/api/world`. A meditation site does not invent company, and it does not
 *     invent it at planetary scale either.
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
 * `three` is the weight now — the geography is 273KB, coastline and terrain.
 * The room is
 * one photograph and §1 is a page of reasons to be suspicious of weight. None
 * of this is on the critical path: it is imported by `World` behind
 * `next/dynamic`, so a person who only ever sits never downloads a byte of it.
 */

/** The sphere is one unit. Everything else is expressed against that. */
const EARTH_RADIUS = 1;

/**
 * Where a cell sits in the ping cycle, from the cell itself.
 *
 * Deterministic, and that is the requirement rather than a nicety: the point
 * geometry is rebuilt from scratch every time `/api/world` returns, and a
 * `Math.random()` phase would hand every light a new one every fifteen
 * seconds. The visible result is not "random twinkling" but the entire earth
 * jumping at once on the poll, which is worse than no twinkle at all.
 *
 * The usual hash-a-float trick. It does not need to be uniform or unbiased; it
 * needs neighbouring cells not to share a phase, which sin() at this frequency
 * comfortably manages.
 */
function pingPhase(lat: number, lon: number): number {
  return hash(lat, lon, 12.9898, 78.233) * Math.PI * 2;
}

/**
 * The other half of a light's identity: how fast it pings and what colour it
 * is, as one 0–1 number the shader unpacks.
 *
 * WHY EACH LIGHT NEEDS TO DIFFER AND NOT JUST BE OFFSET
 * Giving every light the same rhythm at a different phase produces a field
 * that shimmers evenly, and evenness is the tell — it reads as an effect
 * applied to a dataset. Real crowds are not evenly anything. Varying the rate
 * as well means the pattern never repeats and no two neighbours stay in step,
 * which is the difference between "these are points with an animation on them"
 * and "these are people".
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

/** Just clear of the surface, so a light is never z-fought with the ground. */
const LIGHT_RADIUS = EARTH_RADIUS * 1.008;

/**
 * Geographic position to a point on the sphere.
 *
 * This has to agree with how `THREE.SphereGeometry` lays out its UVs, or the
 * lights sit in the sea. The mapping below is the one that matches an
 * equirectangular texture with u=0 at 180°W: the negated x is not a typo, it is
 * what makes longitude run the right way round.
 *
 * Verified by eye against the coastline rather than trusted — see the test
 * points in the note at the foot of this file.
 */
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/**
 * The sprite every light is drawn with.
 *
 * Generated rather than shipped: it is a radial gradient, and a PNG of one
 * would be bytes the page does not need.
 *
 * A PINPRICK WITH A SHORT HALO, NOT A BLOOM
 * The broad version of this was written against a photographic earth, where a
 * light had to survive being drawn over a sunlit ocean; it needed a wide bright
 * middle and its brightness overstated to be visible at all. The ground is dark
 * everywhere now, so all of that is gone. What is left is a hard core inside a
 * tenth of the radius, most of the falloff spent by 40%, and a faint skirt that
 * exists only to keep the edge from aliasing.
 *
 * The change is not only aesthetic. Something small and sharp can be *counted*
 * — twenty of them read as twenty places — where the same twenty soft blooms
 * merge into a smear that reads as one glow. On a globe whose whole subject is
 * how many people there are, that is the difference between a picture of a
 * number and a mood.
 */
function flameSprite(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    const c = size / 2;

    // Additive within the sprite as well as outside it, so the glints lie on
    // top of the core and brighten it rather than painting over it.
    ctx.globalCompositeOperation = 'lighter';

    /*
      THE CORE OCCUPIES A THIRD OF THE SPRITE, NOT ALL OF IT — AND THAT IS WHY
      THE STAR IS VISIBLE AT ALL.

      First attempt filled the sprite with the core and put the glints at 96%
      of its radius. Both were correct in the texture and neither could be seen,
      because the whole sprite is drawn about six pixels across: the spikes were
      comfortably sub-pixel. Making the light bigger would have fixed the star
      and lost the pinprick, which was the point of the exercise.

      So the sprite footprint grew and the core shrank inside it by more. The
      bright point a person actually sees is *smaller* than before; the quad it
      is drawn on is two and a half times larger, and all of that extra room is
      spikes and falloff. Countability is preserved — the core is what the eye
      counts — and the star has somewhere to live.

      Anything that changes one of these two numbers has to change the other:
      `sizes[i]` in `setPoints` is the footprint, and this is the fraction of it
      that is bright.
    */
    const core = ctx.createRadialGradient(c, c, 0, c, c, c * 0.3);
    core.addColorStop(0, 'rgba(255,252,245,1)');
    core.addColorStop(0.28, 'rgba(255,238,203,0.92)');
    core.addColorStop(0.55, 'rgba(255,198,124,0.4)');
    core.addColorStop(1, 'rgba(230,150,70,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, size, size);

    // The bloom the cell's coarseness earns — a degree is 111km, so a light is
    // a region and not a pin. Faint and wide, under the core rather than
    // around it.
    const halo = ctx.createRadialGradient(c, c, 0, c, c, c * 0.62);
    halo.addColorStop(0, 'rgba(255,206,140,0.16)');
    halo.addColorStop(0.5, 'rgba(232,160,86,0.06)');
    halo.addColorStop(1, 'rgba(224,160,87,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);

    /**
     * A glint: a soft streak out from the centre.
     *
     * This is what turns a dot into a light. A disc of any size reads as a
     * painted mark; the moment it has spikes the eye reads it as something
     * *emitting*, because that is what a bright point does to a lens and to a
     * squinted eye. It is the cheapest possible piece of life and it is why
     * these stopped looking like yellow stickers.
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
      g.addColorStop(0, `rgba(255,244,224,${a})`);
      g.addColorStop(0.35, `rgba(255,216,156,${a * 0.3})`);
      g.addColorStop(1, 'rgba(255,200,130,0)');
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
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** What `public/earth/land.json` holds — see the note on `landTexture`. */
interface LandData {
  /** Coordinates are integers; divide by this to get degrees. */
  scale: number;
  /** Each polygon is an outer ring followed by its holes; each ring is flat. */
  polygons: number[][][];
}

/**
 * The ground: coastlines drawn into an equirectangular canvas.
 *
 * WHY THIS REPLACED TWO PHOTOGRAPHS
 * The globe used to be NASA's Blue Marble plus its night-lights companion,
 * about 1.5MB between them, and being photographic cost more than bytes:
 *
 *   * Half the planet was sunlit, and additive blending can only brighten what
 *     is already bright — so a candle over a lit ocean was invisible unless its
 *     brightness was overstated. That fudge is gone with the daylight.
 *   * A photograph of the earth is the only photorealism in the product apart
 *     from the room, and those two are doing opposite jobs. The room is a
 *     picture you sit inside; this is an instrument you read.
 *
 * 53KB of coastline vectors, rasterised here at runtime.
 *
 * THE RISK THIS IS DRAWN AGAINST
 * Hairline outlines on black is the visual language of a dashboard, which is
 * the one thing this page must not become. Three rules keep it an object:
 * **land is filled, not outlined** — a hair above the ocean value, so the eye
 * reads masses rather than wireframe; **no political borders, no graticule, no
 * labels** — the only line on the earth is where water meets land, which is a
 * fact about the planet rather than about people; and **nothing is pure black
 * or pure white**, so it sits in the same dim register as the rest of the site.
 */
function landTexture(data: LandData): THREE.CanvasTexture {
  // 2048×1024 is one texel per ~10km at the equator. The globe is ~600px
  // across and shows half the texture's width, so this is comfortably past
  // what the screen can resolve — and it is 8MB of VRAM against the 33MB a
  // 4096-wide version would cost for no visible gain.
  const width = 2048;
  const height = 1024;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Values, not colours. Ocean sits barely above the page's own ground so
    // the sphere reads as an object rather than a hole, land sits a hair above
    // the ocean, and the coast is the brightest thing on the earth — which is
    // still far below the dimmest candle.
    ctx.fillStyle = '#1b2026';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#2b3138';
    ctx.strokeStyle = '#3f4854';
    ctx.lineWidth = 1.15;
    ctx.lineJoin = 'round';

    const s = data.scale;
    for (const polygon of data.polygons) {
      ctx.beginPath();
      for (const ring of polygon) {
        for (let i = 0; i < ring.length; i += 2) {
          const lon = ring[i]! / s;
          const lat = ring[i + 1]! / s;
          const x = ((lon + 180) / 360) * width;
          const y = ((90 - lat) / 180) * height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      }
      // Even-odd, so a hole ring inside an outer ring is punched out rather
      // than filled over — lakes stay water.
      ctx.fill('evenodd');
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // The seam at ±180° is a real join, not an edge to clamp.
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

const EARTH_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    // World space, because the sun is fixed in world space and the earth does
    // not turn — the camera orbits it. Turning the mesh instead would move the
    // terminator relative to the geography, which is the one thing here that
    // has to stay true.
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EARTH_FRAGMENT = /* glsl */ `
  uniform sampler2D landMap;
  uniform sampler2D reliefMap;
  uniform vec3 sunDirection;
  uniform vec2 reliefTexel;
  uniform float reliefMix;

  varying vec2 vUv;
  varying vec3 vWorldNormal;

  // Read as a raw control value, not as a colour. The relief texture is
  // uploaded with NoColorSpace precisely so this comes back as the number
  // stored in the file rather than sRGB-decoded to linear — a decoded one is
  // crushed into the bottom tenth of the range and useless as a modulator.
  float relief(vec2 uv) {
    return texture2D(reliefMap, uv).r;
  }

  void main() {
    vec3 base = texture2D(landMap, vUv).rgb;
    vec3 n = normalize(vWorldNormal);

    /*
      TWO LAYERS, AND EACH IS DOING A JOB THE OTHER CANNOT.

      landMap is the vector coastline rasterised at runtime: crisp edges, an
      exact land/ocean split, no compression. reliefMap is the Blue Marble
      desaturated and cut to 220KB: real terrain — the Sahara pale, the Congo
      dark, the ice sheets bright — but far too soft at this size to be trusted
      with a coastline.

      So the vector draws the shape and the photograph only ever *modulates*
      what the vector already decided. Centred on 0.30, the map's rough mean,
      so it lightens and darkens around the tuned tone rather than shifting the
      whole planet one way.
    */
    /*
      REMAPPED AGAINST THE MAP'S ACTUAL DISTRIBUTION, NOT AN ASSUMED ONE.

      Measured over the shipped file: mean 0.29 but median 0.149, because most
      of the earth is ocean sitting near 0.03 while ice and desert run to 0.94.
      Centring the modulation on the mean — the obvious first guess, and the
      one tried — puts almost all land *below* centre, so the effect darkened
      the continents instead of texturing them, and spent its whole range on
      the ice caps.

      So the useful band is taken explicitly: 0.06 to 0.61 covers ocean floor
      up to bright desert, clamped at both ends so Antarctica does not blow
      out, and stretched across a multiplier from 0.70 to 1.75.
    */
    float h = relief(vUv);
    float t = clamp((h - 0.06) / 0.55, 0.0, 1.0);
    vec3 ground = base * mix(1.0, 0.70 + t * 1.05, reliefMix);

    float lambert = dot(n, sunDirection);

    // The terminator is soft because the sun is not a point source and the
    // atmosphere scatters light round the edge. A hard step here is the single
    // most obvious tell that a globe is a computer graphic.
    float daylight = smoothstep(-0.14, 0.24, lambert);

    // WHAT SURVIVED DROPPING THE PHOTOGRAPHS.
    //
    // The terminator stays, because it is the only thing on this page carrying
    // "this hour" — you can see that the lights in one place are at dawn and
    // the ones opposite are at midnight, and that is the subject. It is a wash
    // over one monochrome ground now rather than a blend between a lit
    // photograph and a dark one.
    //
    // The night floor is 0.42, not 0. Geography has to stay readable all the
    // way round or half the candles sit on nothing, and an earth whose dark
    // side is genuinely black is a crescent, not a planet.
    //
    // ---- The small shadows ------------------------------------------------
    //
    // Slope shading. Two neighbouring samples give the gradient of the relief
    // map across the surface, and lighting that gradient from the real sun is
    // what puts a shadow on the side of a mountain range away from it — so the
    // Andes and the Himalaya pick out as the terminator crosses them, and the
    // whole planet stops looking like a decal.
    //
    // BE HONEST ABOUT WHAT THIS IS. The relief map is albedo, not elevation:
    // it is how bright the ground is, not how high. Pale desert therefore
    // shades as though it were raised and dark forest as though sunken, which
    // is wrong in detail and convincing at a glance. It is kept deliberately
    // gentle for that reason, and it is the only thing on this globe that is
    // not a fact — everything else here, the coasts, the terminator, the
    // lights, is true. Turning it up until it looks dramatic would be
    // inventing topography, which is a small lie of exactly the kind the rest
    // of this file refuses.
    // 34.0 was found by exaggerating to 70 until the relief was unmistakable,
    // confirming the sign and the wiring were right, and then coming back down
    // to where it reads as ground rather than as embossing. At 16 it was doing
    // nothing visible; past about 45 the earth turns into a relief map of its
    // own albedo, which is the dishonest version.
    float hx = relief(vUv + vec2(reliefTexel.x, 0.0));
    float hy = relief(vUv + vec2(0.0, reliefTexel.y));

    // The surface's own east/north at this point. v grows southward on a
    // sphere's default UVs, hence the negated north for the second term.
    vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), n));
    vec3 north = cross(n, east);
    float slope =
      (hx - h) * dot(east, sunDirection) +
      (hy - h) * dot(-north, sunDirection);

    // Only where the sun is. Nothing casts a shadow on the night side, and a
    // relief that keeps shading in the dark is the giveaway that it is a
    // texture trick rather than light.
    float shaded = 1.0 - clamp(slope * 34.0, -0.6, 0.6) * daylight * reliefMix;

    gl_FragColor = vec4(ground * shaded * mix(0.42, 1.0, daylight), 1.0);

    #include <colorspace_fragment>
  }
`;

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 sunDirection;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 view = normalize(cameraPosition - vWorldPosition);

    // Rim: brightest where the surface turns away from the eye, which is the
    // limb of the planet. Drawn on the inside of a slightly larger sphere, so
    // this is the halo standing off the edge rather than a glow on the ground.
    // Tightened from 3.2 when the ground went dark. A band that read as
    // atmosphere around a bright photograph reads as a machined bezel around a
    // dark disc — it became the brightest thing in the frame and the eye went
    // to the edge instead of to the lights. Higher power, thinner band.
    float rim = pow(1.0 - abs(dot(vWorldNormal, view)), 4.5);

    // Mostly where the sun is — an atmosphere glowing evenly all the way round
    // is the second most obvious tell — but no longer *only* there. The 0.22
    // floor is a deliberate relaxation of that rule: on a photographic globe
    // the night limb was still visibly a lit planet against space, and on this
    // one it is dark grey on near-black, so without a faint rim the earth
    // reads as a disc with a bite out of it. The floor is what says "object".
    float sun = smoothstep(-0.45, 0.35, dot(normalize(vWorldNormal), sunDirection));
    float lit = 0.10 + 0.90 * sun;

    // Neutral, not blue. Blue would be the only hue left on the page now that
    // the ground is monochrome, and the one colour here is the candle.
    //
    // Held well under the lights on purpose. Everything here is competing for
    // the same small amount of brightness the page allows itself, and the
    // ranking is not negotiable: candles first, coastlines second, the edge of
    // the world last.
    gl_FragColor = vec4(vec3(0.52, 0.56, 0.62) * rim * lit * 0.5, rim * lit * 0.62);

    #include <colorspace_fragment>
  }
`;

const LIGHT_VERTEX = /* glsl */ `
  attribute float size;
  attribute float glow;
  attribute float phase;
  attribute float seed;

  uniform float breath;
  uniform float time;

  // canvasHeight / (2 * tan(fov / 2)), recomputed on resize.
  //
  // This is what makes the size attribute a WORLD-SPACE diameter rather than a
  // number of pixels: a light is 5% of the earth's radius across, and stays 5%
  // of it on every screen and at every zoom. Sizing in pixels instead is how
  // the first version of this ended up with single candles covering North
  // America — the constant was tuned by eye at one viewport and means nothing
  // at any other.
  //
  // (No backticks in this file's GLSL. It lives in a template literal, and one
  // of those ends the shader mid-comment and breaks the whole module.)
  uniform float pointScale;

  varying float vGlow;
  varying vec3 vTint;

  void main() {
    vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

    // Is this light on the side of the planet we can see?
    //
    // Depth testing alone does not answer this. A light just behind the limb is
    // occluded where it overlaps the sphere, but the outer half of its bloom
    // falls outside the silhouette against empty space, where there is nothing
    // to occlude it — so the far side of the earth wears a ring of half-haloes.
    // Fading by facing kills that, and it also means a light sets over the
    // horizon rather than vanishing at it.
    vec3 toCamera = normalize(cameraPosition - worldPosition);
    float facing = dot(normalize(worldPosition), toCamera);

    // THE PING.
    //
    // Squared rather than a plain sine, and that is the whole character of it:
    // sin·0.5+0.5 spends as long bright as dim and reads as a pulse, where
    // squaring it makes each light sit low most of the time and flare briefly.
    // That is what separates a field of candles from a row of indicator LEDs.
    //
    // The phase comes from the cell's own coordinates rather than a random
    // number — see pingPhase() in the module. It has to be stable, because the
    // geometry is
    // rebuilt every time the poll returns and re-randomising would make the
    // whole earth twinkle in lockstep once every fifteen seconds.
    //
    // This does NOT replace the shared breath. That is still here, on size, in
    // the line below: every candle on earth swells and settles together at a
    // resting breath, and each one pings on its own inside that. The togetherness
    // was the point of the page and it has not been traded away for the effect.
    // Its own rate, not just its own offset. 1.45 to 2.35 is narrow enough
    // that the field still reads as one rhythm and wide enough that no two
    // neighbours hold step — see pingSeed() in the module.
    float rate = 1.45 + seed * 0.9;

    float pulse = sin(time * rate + phase) * 0.5 + 0.5;

    // THE FLARE. A second, much slower wave at an unrelated frequency, so the
    // two drift in and out of alignment and a light occasionally pings harder
    // than usual before settling back. Nothing schedules it and it never
    // repeats — which is the whole reason it reads as alive rather than as an
    // animation running on a list. Without this the earth shimmers evenly, and
    // evenness is what gives away that these are datapoints.
    float slow = sin(time * rate * 0.31 + phase * 1.7) * 0.5 + 0.5;

    float ping = 0.66 + 0.34 * pulse * pulse * (0.5 + 0.5 * slow);

    // Warm to pale, per light. Kept inside the ember family on purpose — the
    // palette allows exactly one colour and this is a variation within it, not
    // a second hue. What it buys is that no two adjacent candles are the same
    // colour, so a cluster reads as a handful of people rather than as one
    // symbol stamped repeatedly.
    vTint = mix(vec3(1.06, 0.94, 0.80), vec3(0.98, 1.0, 1.04), seed);

    vGlow = glow * ping * smoothstep(-0.02, 0.28, facing);

    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    // The ping is on brightness AND, faintly, on size. A light that only
    // changes brightness reads as a bulb on a dimmer; a real one appears to
    // swell as it brightens, because the dim outer part of it crosses the
    // threshold of visible. 6% either way is under conscious notice and does
    // all the work.
    float swell = 0.97 + 0.06 * pulse;
    gl_PointSize = size * breath * swell * pointScale / -viewPosition.z;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const LIGHT_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  varying float vGlow;
  varying vec3 vTint;

  void main() {
    vec4 sprite = texture2D(map, gl_PointCoord);

    // ALPHA IS 1.0 AND EVERY BIT OF SHAPING IS IN THE COLOUR. THIS IS THE BUG.
    //
    // Additive blending in three is (srcAlpha, one), so what lands on the
    // framebuffer is rgb * a. Writing the falloff into BOTH — rgb scaled by
    // sprite.a, and sprite.a again as the alpha — multiplies it in twice, so
    // the bloom is squared and the whole light is dimmed by whatever vGlow is,
    // squared, as well. The light was being drawn at the right size in the
    // right place and was simply invisible.
    //
    // THE OVERSTATEMENT IS GONE. This was ×2.2 for as long as the earth was a
    // photograph: additive blending can only brighten what is already bright,
    // so an honest candle over a sunlit ocean was nothing at all, and the fix
    // was to lie about brightness. There is no sunlit ocean now — the ground is
    // dark everywhere. The multiplier that remains is not the old fudge in a
    // smaller coat: it is here because the sprite is now a tight pinprick that
    // spends almost all of its area at nearly zero, so the peak has to carry
    // the light the old broad skirt used to. What it buys is a candle that is
    // *bright*, which is the point — small and dim is a dead pixel, small and
    // bright is a light seen from a long way off.
    gl_FragColor = vec4(sprite.rgb * vTint * sprite.a * vGlow * 2.9, 1.0);
  }
`;

export default function Globe({
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
   * points in state would tear the WebGL context down each time the poll
   * returned the same earth it returned fifteen seconds ago.
   */
  const sceneRef = useRef<{
    setPoints: (points: WorldPoint[]) => void;
    dispose: () => void;
  } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // No WebGL — an old browser, a locked-down machine, a headless check.
    // Return quietly and let the page show its caption over an empty frame,
    // rather than throwing where somebody expected a picture.
    const renderer = (() => {
      try {
        return new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        });
      } catch {
        return null;
      }
    })();
    if (!renderer) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    // Declared up here rather than beside the frame loop, because the land
    // fetch below closes over it to know whether the component is still
    // mounted when the file lands.
    let disposed = false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      32,
      host.clientWidth / Math.max(1, host.clientHeight),
      0.1,
      100,
    );

    // ---- The earth ------------------------------------------------------
    //
    // A flat ocean-coloured texture to begin with, replaced by the drawn
    // coastlines when they arrive. The sphere is therefore correct from the
    // first frame and simply gains its geography — which matters because the
    // globe fades up as soon as it is ready, and a sphere that pops from
    // nothing would be the one abrupt thing on the page. If the fetch fails
    // the earth stays a plain dark ball: featureless, but not broken, and the
    // lights still sit in the right places on it.
    const blank = document.createElement('canvas');
    blank.width = 1;
    blank.height = 1;
    const blankCtx = blank.getContext('2d');
    if (blankCtx) {
      blankCtx.fillStyle = '#1b2026';
      blankCtx.fillRect(0, 0, 1, 1);
    }
    const placeholder = new THREE.CanvasTexture(blank);
    placeholder.colorSpace = THREE.SRGBColorSpace;

    let ground: THREE.CanvasTexture = placeholder;
    const sunDirection = new THREE.Vector3(1, 0, 0);

    /*
      THE TERRAIN, AS A CONTROL MAP RATHER THAN A PICTURE.

      `NoColorSpace` is the load-bearing line. This is the Blue Marble
      desaturated to 220KB, and it is never displayed — the shader reads it as
      a number to modulate the drawn ground with and to take a gradient from
      for the slope shading. Marking it sRGB would have the GPU decode it to
      linear on every fetch, which crushes a mid-grey of 0.30 down to about
      0.07 and leaves the whole modulation happening in the bottom tenth of the
      range, where JPEG has the least precision to give.

      `reliefMix` ramps 0 → 1 when it arrives, so the terrain fades in over the
      flat ground instead of snapping on a frame or two after the coastlines.
    */
    const reliefMix = { value: 0 };
    const reliefTexel = new THREE.Vector2(1 / 2048, 1 / 1024);
    const relief = new THREE.TextureLoader().load('/earth/relief.jpg');
    relief.colorSpace = THREE.NoColorSpace;
    relief.anisotropy = renderer.capabilities.getMaxAnisotropy();
    relief.wrapS = THREE.RepeatWrapping;

    const earthMaterial = new THREE.ShaderMaterial({
      uniforms: {
        landMap: { value: placeholder },
        reliefMap: { value: relief },
        reliefTexel: { value: reliefTexel },
        reliefMix,
        sunDirection: { value: sunDirection },
      },
      vertexShader: EARTH_VERTEX,
      fragmentShader: EARTH_FRAGMENT,
    });

    const landAbort = new AbortController();
    void (async () => {
      try {
        const res = await fetch('/earth/land.json', {
          signal: landAbort.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as LandData;
        if (disposed) return;
        const drawn = landTexture(data);
        drawn.anisotropy = renderer.capabilities.getMaxAnisotropy();
        earthMaterial.uniforms.landMap!.value = drawn;
        ground = drawn;
        placeholder.dispose();
      } catch {
        // Aborted on unmount, offline, or a bad file. The plain ball stands.
      }
    })();

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS, 96, 64),
      earthMaterial,
    );
    scene.add(earth);

    // ---- The atmosphere -------------------------------------------------
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.022, 64, 48),
      new THREE.ShaderMaterial({
        uniforms: { sunDirection: { value: sunDirection } },
        vertexShader: ATMOSPHERE_VERTEX,
        fragmentShader: ATMOSPHERE_FRAGMENT,
        // Inside-out, so what is drawn is the far limb standing off the edge of
        // the planet rather than a film over the front of it.
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
    scene.add(atmosphere);

    // ---- The lights -----------------------------------------------------
    const sprite = flameSprite();
    const lightGeometry = new THREE.BufferGeometry();
    // Held by reference rather than reached for through `material.uniforms`
    // every frame: the index signature there is optional, so the frame loop
    // would otherwise be a null check sixty times a second for a value that
    // cannot be missing.
    const breath = { value: 1 };
    const pointScale = { value: 1000 };
    const time = { value: 0 };
    const lightMaterial = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: sprite },
        breath,
        pointScale,
        time,
      },
      vertexShader: LIGHT_VERTEX,
      fragmentShader: LIGHT_FRAGMENT,
      blending: THREE.AdditiveBlending,
      transparent: true,
      // Off, deliberately, and the shader does this job instead — see the note
      // on `facing` in LIGHT_VERTEX. Depth testing hides the part of a far-side
      // bloom that overlaps the planet and leaves the part that overhangs the
      // limb, which draws a ring of half-haloes round the edge of the earth.
      depthTest: false,
      depthWrite: false,
    });
    const lights = new THREE.Points(lightGeometry, lightMaterial);
    // Frustum culling uses a bounding sphere this geometry does not maintain
    // across rebuilds; the whole cloud is one globe-sized object anyway.
    lights.frustumCulled = false;
    scene.add(lights);

    /** Where the camera is looking from, in orbit terms. */
    const orbit = { azimuth: 0, polar: Math.PI / 2 - 0.25, distance: 3.4 };
    const target = { azimuth: 0, polar: Math.PI / 2 - 0.25 };
    let hasAimed = false;

    const setPoints = (next: WorldPoint[]) => {
      const positions = new Float32Array(next.length * 3);
      const sizes = new Float32Array(next.length);
      const glows = new Float32Array(next.length);
      const phases = new Float32Array(next.length);
      const seeds = new Float32Array(next.length);

      next.forEach((point, i) => {
        const v = latLonToVector3(point.lat, point.lon, LIGHT_RADIUS);
        positions[i * 3] = v.x;
        positions[i * 3 + 1] = v.y;
        positions[i * 3 + 2] = v.z;

        // A world-space diameter, in earth radii, against a sphere of radius 1
        // — so a cell holding one person is a light about 1% of the planet
        // across, which is six or seven pixels at the size this is drawn.
        //
        // A QUARTER OF WHAT IT WAS. The old figure was tuned to survive being
        // drawn over a sunlit ocean and made every candle a soft blot; against
        // dark ground a pinprick reads better and, more importantly, twenty of
        // them still read as twenty rather than merging into one glow.
        //
        // Grows with the room, but as a square root. A cell with forty people
        // in it is not forty times the place a cell with one person in it is,
        // and growing linearly turns a single city into a blot over a
        // continent — which is exactly what the first version of this did.
        // The FOOTPRINT of the quad, not the size of the bright point. The
        // core is 30% of this and the rest is spikes and falloff — see the
        // note in `flameSprite`. The visible pinprick is therefore about
        // 0.014 world units for a single sitter, slightly smaller than when
        // the sprite was solid, while the star reaches four times further.
        sizes[i] = 0.046 + Math.sqrt(point.lit) * 0.019;

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

      lightGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3),
      );
      lightGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      lightGeometry.setAttribute('glow', new THREE.BufferAttribute(glows, 1));
      lightGeometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
      lightGeometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
      lightGeometry.setDrawRange(0, next.length);

      // Turn to the busiest place on earth, once, on the first data to arrive.
      // Opening on an ocean and waiting for the drift to find people would be
      // a page that appears to be empty for the first twenty seconds.
      if (!hasAimed && next.length > 0) {
        hasAimed = true;
        const busiest = next.reduce((a, b) => (b.lit > a.lit ? b : a));

        // Inverted from `latLonToVector3`, and it has to be derived rather than
        // guessed: the camera sits at (sinP·sin(az), cosP, sinP·cos(az)), and
        // for that to point at a place, az = theta - PI/2 where theta is the
        // same azimuth the position function uses. The sign was wrong first
        // time and the globe swung confidently to the wrong ocean.
        const theta = ((busiest.lon + 180) * Math.PI) / 180;
        const wanted = theta - Math.PI / 2;

        // Take the short way round. Without this, aiming at somewhere just west
        // of the current view can spin the planet through five sixths of a turn
        // to get somewhere it was almost already looking.
        const turn = Math.atan2(
          Math.sin(wanted - orbit.azimuth),
          Math.cos(wanted - orbit.azimuth),
        );
        target.azimuth = orbit.azimuth + turn;
        target.polar = ((90 - busiest.lat) * Math.PI) / 180;
      }
    };

    setPoints(points);

    // ---- Turning it by hand ---------------------------------------------
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    // Carried after a drag ends, so letting go coasts rather than stopping
    // dead. The globe is the one thing in this product that is touched rather
    // than read, and a planet that halts under your finger feels like a UI.
    let momentum = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      momentum = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      target.azimuth -= dx * 0.005;
      momentum = -dx * 0.005;
      // Stopped short of the poles: at exactly vertical the up-vector is
      // undefined and the view snaps through itself.
      target.polar = Math.min(
        Math.PI - 0.12,
        Math.max(0.12, target.polar - dy * 0.005),
      );
    };

    const onPointerUp = (e: PointerEvent) => {
      dragging = false;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        // Capture was already lost — the pointer left the window.
      }
    };

    const canvas = renderer.domElement;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    // ---- The frame ------------------------------------------------------
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let frame = 0;
    const startedAt = performance.now();

    const render = () => {
      if (disposed) return;
      frame = requestAnimationFrame(render);

      const elapsed = (performance.now() - startedAt) / 1000;

      // The earth keeps turning under the sun even while nobody touches it.
      // Slow: a full turn takes about four minutes, which is a drift rather
      // than a spin and does not compete with anything on the page.
      if (!dragging && !reducedMotion) {
        target.azimuth += 0.00045 + momentum;
        momentum *= 0.94;
      }

      // Eased rather than assigned, which is what makes the aim at the busiest
      // cell a move the eye can follow instead of a cut.
      orbit.azimuth += (target.azimuth - orbit.azimuth) * 0.06;
      orbit.polar += (target.polar - orbit.polar) * 0.06;

      const sinPolar = Math.sin(orbit.polar);
      camera.position.set(
        orbit.distance * sinPolar * Math.sin(orbit.azimuth),
        orbit.distance * Math.cos(orbit.polar),
        orbit.distance * sinPolar * Math.cos(orbit.azimuth),
      );
      camera.lookAt(0, 0, 0);

      // The sun, from the same corrected clock the candle uses.
      const sun = subsolarPoint(serverNow());
      sunDirection.copy(latLonToVector3(sun.lat, sun.lon, 1)).normalize();

      // One breath for the whole earth: about five and a half seconds in and
      // out, which is roughly a resting breath and slower than anybody watches
      // for. Every light does it together, which is the point of the page.
      breath.value = 1 + Math.sin(elapsed * 1.15) * 0.075;

      // The terrain fading in behind the coastlines, once decoded.
      if (relief.image && reliefMix.value < 1) {
        reliefMix.value = Math.min(1, reliefMix.value + 0.02);
      }

      // And the individual ping on top of it, in the vertex shader. Reduced
      // motion stops the clock rather than the render: the lights hold at
      // whatever they were instead of flickering, and the earth still turns
      // under the check above.
      if (!reducedMotion) time.value = elapsed;

      renderer.render(scene, camera);
    };

    render();

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);

      /*
        PULL BACK UNTIL THE PLANET FITS THE NARROWER DIMENSION.

        A perspective camera's field of view is VERTICAL, so a fixed distance
        frames the earth by height and lets the width fall where it may. On a
        phone the globe's area is roughly 375 wide and 1200 tall, and the result
        is a planet sized for the height and cropped at both sides — most of the
        earth off-screen, and no way to tell it is a globe.

        So the distance is derived rather than chosen: take whichever half-angle
        is smaller, and stand far enough back that the sphere's angular radius
        fits inside it. On a wide window that is the vertical, and this comes out
        near where the hand-picked 3.4 was; on a portrait one it is the
        horizontal, and it pulls back until the whole earth is on screen.
      */
      const vHalf = (camera.fov * Math.PI) / 360;
      const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
      // 0.94 leaves the limb clear of the edge. The atmosphere stands about 2%
      // proud of the surface and wants somewhere to be.
      const limit = Math.min(vHalf, hHalf) * 0.94;
      orbit.distance = EARTH_RADIUS / Math.sin(limit);

      // Recomputed here and nowhere else, because both terms can change: the
      // drawing buffer with the window, and the field of view never — but a
      // future zoom would move it, and a stale value silently rescales every
      // light on the planet.
      pointScale.value =
        (h * pixelRatio) /
        (2 * Math.tan((camera.fov * Math.PI) / 360));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    sceneRef.current = {
      setPoints,
      dispose: () => {
        disposed = true;
        cancelAnimationFrame(frame);
        observer.disconnect();
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);

        // Explicit, all of it. A WebGL context is not garbage collected on
        // unmount, and browsers cap how many a page may hold — leaking one per
        // visit to this route means the globe silently stops working after
        // about the sixteenth time somebody looks at it.
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
            object.geometry.dispose();
            const material = object.material;
            if (Array.isArray(material)) material.forEach((m) => m.dispose());
            else material.dispose();
          }
        });
        // Whichever the material ended up holding. `ground` is the placeholder
        // until the coastlines land and the drawn texture after, and disposing
        // the placeholder twice would be a no-op but a confusing one.
        landAbort.abort();
        ground.dispose();
        relief.dispose();
        sprite.dispose();
        renderer.dispose();
        canvas.remove();
      },
    };

    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // Built once. New points arrive through the effect below, which writes
    // into the buffers rather than rebuilding the context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneRef.current?.setPoints(points);
  }, [points]);

  return <div ref={hostRef} className={className} aria-hidden />;
}

/*
 * VERIFYING THE MAPPING
 *
 * `latLonToVector3` has to agree with SphereGeometry's UVs or every light sits
 * in the sea, and it fails in a way that looks plausible — a globe with lights
 * on it, all in the wrong places. It was checked by rendering these four and
 * looking at the coastline, which is the only test that actually catches it:
 *
 *   London      51.5,   -0.1
 *   Sydney     -33.9,  151.2
 *   Rio        -22.9,  -43.2
 *   Anchorage   61.2, -149.9
 *
 * One in each quadrant, because the two failure modes — a flipped longitude
 * and a flipped latitude — each look correct from one hemisphere.
 */
