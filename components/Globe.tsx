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
 *   * The imagery is photographs of the earth (NASA, public domain), not a
 *     stylisation of it.
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
 * The lights bloom and breathe. Nobody's candle flickers on a schedule. That is
 * the one piece of theatre here and it earns its place: a hard dot at a cell
 * centre would claim a precision the data does not have — the cell is a degree
 * across, about 111km — where a soft bloom reads as "somebody around here",
 * which is exactly what is known.
 *
 * WHY THIS IS ITS OWN ROUTE AND LOADS ITSELF
 * `three` and two NASA textures are about 2MB. The room is one photograph and
 * §1 is a page of reasons to be suspicious of weight. None of this is on the
 * critical path: it is imported by `World` behind `next/dynamic`, so a person
 * who only ever sits never downloads a byte of it.
 */

/** The sphere is one unit. Everything else is expressed against that. */
const EARTH_RADIUS = 1;

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
 * Generated rather than shipped: it is a radial gradient, and a 20KB PNG of one
 * would be 20KB more than the page needs.
 *
 * THE STOPS ARE THE WHOLE DIFFICULTY, AND THEY WERE WRONG FIRST TIME
 * The first version put the bright core inside 12% of the radius and fell away
 * hard after it. On a daylit ocean everything past the core was below the
 * threshold of visible, so a light rendered at sixty pixels across appeared as
 * a seven-pixel dot — and the fix looked like "the points are too small", which
 * led to sizing them thirty times too large. Then a single candle covered North
 * America, and the core was the only part visible even so.
 *
 * So: a broad, bright middle that carries most of the light, and a shorter tail
 * that reads as bloom rather than as an invisible skirt. The sprite is what
 * decides how big a light looks; the size attribute only decides how much of
 * the earth it stands on.
 */
function flameSprite(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    g.addColorStop(0, 'rgba(255,253,247,1)');
    g.addColorStop(0.18, 'rgba(255,238,203,0.98)');
    g.addColorStop(0.36, 'rgba(255,193,116,0.72)');
    g.addColorStop(0.58, 'rgba(232,152,72,0.3)');
    g.addColorStop(0.8, 'rgba(224,160,87,0.09)');
    g.addColorStop(1, 'rgba(224,160,87,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
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
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform vec3 sunDirection;

  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vec3 day = texture2D(dayMap, vUv).rgb;
    vec3 night = texture2D(nightMap, vUv).rgb;

    float lambert = dot(normalize(vWorldNormal), sunDirection);

    // The terminator is soft because the sun is not a point source and the
    // atmosphere scatters light round the edge. A hard step here is the single
    // most obvious tell that a globe is a computer graphic.
    float daylight = smoothstep(-0.14, 0.24, lambert);

    // The night side is the city lights and almost nothing else. Warmed
    // slightly toward the room's ember rather than left sodium-orange, so the
    // inhabited earth and the candles on it belong to one picture.
    vec3 lights = night * vec3(1.0, 0.84, 0.62) * 1.15;
    vec3 unlitGround = day * 0.05;

    vec3 colour = mix(unlitGround + lights, day, daylight);

    gl_FragColor = vec4(colour, 1.0);

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
    float rim = pow(1.0 - abs(dot(vWorldNormal, view)), 3.2);

    // And only where the sun actually is. An atmosphere that glows all the way
    // round the night side is the second most obvious tell.
    float lit = smoothstep(-0.45, 0.35, dot(normalize(vWorldNormal), sunDirection));

    gl_FragColor = vec4(vec3(0.42, 0.62, 0.92) * rim * lit * 1.1, rim * lit);

    #include <colorspace_fragment>
  }
`;

const LIGHT_VERTEX = /* glsl */ `
  attribute float size;
  attribute float glow;

  uniform float breath;

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

    vGlow = glow * smoothstep(-0.02, 0.32, facing);

    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * breath * pointScale / -viewPosition.z;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const LIGHT_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  varying float vGlow;

  void main() {
    vec4 sprite = texture2D(map, gl_PointCoord);

    // ALPHA IS 1.0 AND EVERY BIT OF SHAPING IS IN THE COLOUR. THIS IS THE BUG.
    //
    // Additive blending in three is (srcAlpha, one), so what lands on the
    // framebuffer is rgb * a. Writing the falloff into BOTH — rgb scaled by
    // sprite.a, and sprite.a again as the alpha — multiplies it in twice, so
    // the bloom is squared and the whole light is dimmed by whatever vGlow is,
    // squared, as well. At the dim end of the range (0.42, a candle whose
    // person has left) that is 0.18 of the intended brightness, which over a
    // daylit ocean is nothing at all. The light was being drawn at the right
    // size in the right place and was simply invisible.
    //
    // The 2.2 is there because half of this planet is in daylight and additive
    // blending can only brighten what is already bright. A physically honest
    // candle is invisible over a lit ocean, which is true and useless — this is
    // the one place the page overstates something, and it overstates how bright
    // a light is rather than how many there are or where they are.
    gl_FragColor = vec4(sprite.rgb * sprite.a * vGlow * 2.2, 1.0);
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

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      32,
      host.clientWidth / Math.max(1, host.clientHeight),
      0.1,
      100,
    );

    // ---- The earth ------------------------------------------------------
    const loader = new THREE.TextureLoader();
    const dayMap = loader.load('/earth/day.jpg');
    const nightMap = loader.load('/earth/night.jpg');
    for (const map of [dayMap, nightMap]) {
      // Both are photographs, so both are sRGB. Without this the GPU samples
      // them as linear and the whole planet comes out washed and pale.
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }

    const sunDirection = new THREE.Vector3(1, 0, 0);

    const earthMaterial = new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: dayMap },
        nightMap: { value: nightMap },
        sunDirection: { value: sunDirection },
      },
      vertexShader: EARTH_VERTEX,
      fragmentShader: EARTH_FRAGMENT,
    });

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
    const lightMaterial = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: sprite },
        breath,
        pointScale,
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

      next.forEach((point, i) => {
        const v = latLonToVector3(point.lat, point.lon, LIGHT_RADIUS);
        positions[i * 3] = v.x;
        positions[i * 3 + 1] = v.y;
        positions[i * 3 + 2] = v.z;

        // A world-space diameter, in earth radii — so this is a light about 5%
        // of the planet across, bloom and all, for a cell holding one person.
        //
        // Grows with the room, but as a square root. A cell with forty people
        // in it is not forty times the place a cell with one person in it is,
        // and growing linearly turns a single city into a blot over a
        // continent — which is exactly what the first version of this did.
        sizes[i] = 0.05 + Math.sqrt(point.lit) * 0.022;

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
    let disposed = false;
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
        dayMap.dispose();
        nightMap.dispose();
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
