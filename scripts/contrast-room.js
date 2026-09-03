/**
 * WCAG contrast against a photograph, not against a palette.
 *
 * Run: open the app, then paste this whole file into the devtools console.
 * It reports every readable element currently on screen. Change screen (open a
 * question, start a sitting, go to Home) and run it again — it measures what is
 * rendered at the moment it is called, so each screen is its own run.
 *
 * WHY scripts/contrast.mjs IS NOT ENOUGH, AND WHY THIS IS NOT A REPLACEMENT
 * That script checks palette pairs against flat colours, and it is right about
 * them. The room is not a flat colour. Every pair it knows about passed while
 * `Begin` was being read against lit wax at 1.6:1 — a confident number about a
 * background the page does not have. Both are needed: that one guards the
 * palette, this one guards what the palette lands on.
 *
 * HOW IT WORKS
 * It rebuilds the scene's real layer stack into an offscreen canvas and samples
 * underneath each element's box:
 *
 *   base fill · camera transform · photograph (cover-fit, blurred, dimmed)
 *   · glow (screen) · flame canvas (screen) · vignette · top gradient · stop
 *
 * The layer parameters are READ FROM THE LIVE DOM rather than copied from
 * `CAM` in CandleScene.tsx. Copying them would produce a checker that passes
 * against last month's camera: the numbers here have already moved twice, and a
 * hard-coded 0.65 that silently stops matching is exactly the failure this file
 * exists to catch.
 *
 * TWO TRAPS, BOTH REAL, BOTH HIT DURING THE ROOM-POLISH WORK
 *
 * 1. Tailwind's opacity modifiers compile to `color-mix()`, which
 *    `getComputedStyle` returns as `oklab(...)` or `color(srgb ...)` and never
 *    as `rgba()`. Any regex expecting three integers reads zero and reports
 *    black text on everything. `toRGBA` below hands the string to a canvas and
 *    reads the pixel back, so the browser does the conversion and every colour
 *    syntax works the same way.
 *
 * 2. Anything measured mid-move is a measurement artefact and not a finding.
 *    The camera takes up to 5.6s to settle and every layer is transitioning for
 *    all of it, so a number taken at 2s is about a frame nobody will ever read
 *    text on.
 *
 *    The obvious guard — refuse when the page is hidden — turns out to be the
 *    wrong test in both directions. CSS transitions are driven by time, so they
 *    keep advancing in a hidden tab and reach their target whether or not
 *    anything is painted; and a visible tab is no guarantee the camera has
 *    arrived. So this waits for the scene's own computed values to STOP
 *    CHANGING instead, which is the property actually wanted. It also checks
 *    the flame canvas has been drawn at least once, since that one really does
 *    need rAF to have run.
 *
 * WHAT IT DOES NOT DO
 * It samples the element's whole box, not its glyphs, so a large word with air
 * around it is judged partly on background it does not actually sit on. That is
 * conservative in the right direction — the reported figure is the worst pixel
 * in the box — but it means a near-miss on a big display line is worth looking
 * at by eye before it is worth chasing.
 */

(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /**
   * The scene's layers, by position rather than by class name.
   *
   * `closest('div[aria-hidden]')` from the flame canvas IS the stage — the
   * canvas sits three levels inside it and nothing between them carries the
   * attribute. Walking up any further lands on the fixed wrapper or on `main`,
   * whose children are the page's copy; the composite then reads a paragraph
   * as if it were the photograph and reports numbers about nothing. Getting
   * this wrong is silent, which is why the shape is asserted below.
   *
   *   stage  [0] camera → [0] drift → [0] photo · [1] glow · [2] flame canvas
   *          [1] vignette   [2] top gradient   [3] stop
   */
  function findScene() {
    const flame = document.querySelector('canvas');
    const stage = flame?.closest('div[aria-hidden]');
    if (!stage || stage.children.length !== 4) return null;

    const camera = stage.children[0];
    const drift = camera.children[0];
    if (!drift || drift.children.length !== 3) return null;

    return {
      stage,
      camera,
      drift,
      photo: drift.children[0],
      glow: drift.children[1],
      flame,
      vignette: stage.children[1],
      top: stage.children[2],
      stop: stage.children[3],
    };
  }

  /**
   * Wait for the scene to stop moving.
   *
   * Fingerprints every value the composite depends on, then waits for two
   * consecutive readings to match. Nothing here is measured until they do —
   * see trap 2. Gives up after 12s and says so rather than reporting numbers
   * about a frame that was still travelling.
   */
  async function settle() {
    const scene = findScene();
    // Home and /world have no camera and nothing to wait for.
    if (!scene) return true;

    /*
      FOUR NODES, NAMED, AND NOT A SWEEP OF THE SUBTREE.

      A blanket fingerprint of everything under the scene never matches twice,
      for two separate reasons that both look like "it is still moving":

        · `room-drift` is a 23s INFINITE animation — the room breathing. It is
          not going to finish, and waiting for it is waiting forever.
        · the glow's opacity and the flame canvas's box are rewritten by rAF on
          every frame, because the candle flickers. Also never twice the same.

      Neither has anything to do with the question being asked, which is only
      ever "has the camera arrived". These four carry that and nothing else:
      the camera's transform, the photograph's filter, and the two flat
      darkeners' opacities. All four are CSS transitions, so all four settle.
    */
    const nodes = [scene.camera, scene.photo, scene.vignette, scene.stop];
    const fingerprint = () =>
      nodes
        .map((el) => {
          const s = getComputedStyle(el);
          return `${s.transform}|${s.filter}|${s.opacity}`;
        })
        .join('~');

    let previous = fingerprint();
    for (let i = 0; i < 40; i++) {
      await sleep(300);
      const next = fingerprint();
      if (next === previous) return true;
      previous = next;
    }
    return false;
  }

  if (!(await settle())) {
    console.warn(
      'contrast-room: the scene never stopped moving. Something is animating ' +
        'indefinitely, or a transition is longer than 12s. Numbers below would ' +
        'be about a frame in transit — not reported.',
    );
    return;
  }

  const W = window.innerWidth;
  const H = window.innerHeight;

  // A zero-size viewport is a devtools pane with no room in it, or a headless
  // window that never got a size. Refuse rather than crash three hundred lines
  // later inside getImageData, where the error says nothing about the cause.
  if (!W || !H) {
    console.warn(
      `contrast-room: the viewport is ${W}x${H}. Nothing has been laid out, so ` +
        'there is nothing to measure. Give the window a size and run it again.',
    );
    return;
  }

  // ---- colour helpers -----------------------------------------------------

  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const probeCtx = probe.getContext('2d', { willReadFrequently: true });

  /**
   * Any CSS colour to [r, g, b, a].
   *
   * Via the canvas rather than a regex, because of trap 1 above: `oklab()` and
   * `color(srgb ...)` are what Tailwind's `/70` modifiers actually compute to.
   */
  function toRGBA(css) {
    probeCtx.clearRect(0, 0, 1, 1);
    probeCtx.fillStyle = '#000';
    probeCtx.fillStyle = css;
    probeCtx.fillRect(0, 0, 1, 1);
    const d = probeCtx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  }

  const channel = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = ([r, g, b]) =>
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const ratio = (a, b) => {
    const [x, y] = [luminance(a), luminance(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const over = (fg, bg) =>
    fg[3] >= 1
      ? fg
      : [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));

  // ---- find the scene -----------------------------------------------------

  const scene = findScene();
  const flameCanvas = scene?.flame;

  // Home and /world have no photograph. Their background is the flat page
  // colour plus, on Home, one soft ember wash — both of which composite
  // exactly, so the same sampler works with a much simpler stack.
  const hasScene = Boolean(scene);

  /**
   * One complete composite, and one reading off it.
   *
   * Called several times because the room never actually holds still: the drift
   * keeps moving the photograph under the type for 23 seconds at a time, so a
   * single reading is a reading of one phase of it. The caller keeps the worst
   * of several, which is the number that has to clear the threshold.
   */
  async function measure() {
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const ctx = out.getContext('2d', { willReadFrequently: true });

  const style = (el) => (el ? getComputedStyle(el) : null);

  ctx.fillStyle = toCss(toRGBA(getComputedStyle(document.body).backgroundColor));
  ctx.fillRect(0, 0, W, H);

  function toCss([r, g, b, a = 1]) {
    return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
  }

  if (hasScene) {
    const {
      stage,
      camera: cameraEl,
      drift: driftEl,
      photo: photoEl,
      glow: glowEl,
      // The vignette, the top gradient and the stop are deliberately outside
      // the camera so they never scale. See CandleScene.
      vignette: vignetteEl,
      top: topEl,
      stop: stopEl,
    } = scene;

    ctx.fillStyle = toCss(toRGBA(style(stage).backgroundColor));
    ctx.fillRect(0, 0, W, H);

    // The camera, and the slow drift under it. Both are read as matrices and
    // both need their own transform-origin applied — a DOMMatrix from
    // getComputedStyle is expressed about the element's origin, not the corner.
    const withOrigin = (el) => {
      const s = style(el);
      const m = new DOMMatrix(s.transform === 'none' ? '' : s.transform);
      const [ox, oy] = s.transformOrigin
        .split(' ')
        .map((v) => parseFloat(v) || 0);
      return new DOMMatrix()
        .translate(ox, oy)
        .multiply(m)
        .translate(-ox, -oy);
    };

    ctx.save();
    const cam = withOrigin(cameraEl).multiply(withOrigin(driftEl));
    ctx.setTransform(cam.a, cam.b, cam.c, cam.d, cam.e, cam.f);

    // The photograph, cover-fitted the way `background-size: cover` with
    // `background-position: 50% 46%` fits it.
    const url = style(photoEl)
      .backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
    if (url) {
      const img = new Image();
      img.src = url;
      await img.decode();
      const fit = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const dw = img.naturalWidth * fit;
      const dh = img.naturalHeight * fit;
      const posY =
        parseFloat(style(photoEl).backgroundPosition.split(' ')[1]) || 46;
      ctx.filter = style(photoEl).filter === 'none' ? 'none' : style(photoEl).filter;
      ctx.drawImage(img, (W - dw) * 0.5, (H - dh) * (posY / 100), dw, dh);
      ctx.filter = 'none';
    }

    // The glow and the flame are both screen-blended over the wall — adding
    // them any other way blows the base out, which is the note in CandleScene.
    const screenLayer = (el, draw) => {
      const s = style(el);
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = parseFloat(s.opacity) || 0;
      ctx.filter = s.filter === 'none' ? 'none' : s.filter;
      draw(r);
      ctx.restore();
    };

    screenLayer(glowEl, (r) => {
      const g = ctx.createRadialGradient(
        r.left + r.width / 2,
        r.top + r.height / 2,
        0,
        r.left + r.width / 2,
        r.top + r.height / 2,
        Math.max(r.width, r.height) / 2,
      );
      g.addColorStop(0, 'rgba(240,186,116,0.5)');
      g.addColorStop(0.34, 'rgba(214,141,66,0.22)');
      g.addColorStop(0.68, 'rgba(214,141,66,0)');
      ctx.fillStyle = g;
      ctx.fillRect(r.left, r.top, r.width, r.height);
    });

    // The one layer that genuinely needs rAF to have run. A blank flame canvas
    // means the composite is missing the brightest thing in the frame, and the
    // band would be reported as darker — and therefore safer — than it is.
    const flameProbe = document
      .createElement('canvas')
      .getContext('2d', { willReadFrequently: true });
    flameProbe.canvas.width = flameProbe.canvas.height = 32;
    flameProbe.drawImage(flameCanvas, 0, 0, 32, 32);
    const flameDrawn = flameProbe
      .getImageData(0, 0, 32, 32)
      .data.some((v, i) => i % 4 === 3 && v > 0);
    if (!flameDrawn) {
      console.warn(
        'contrast-room: the flame canvas is blank — rAF has not run. Band ' +
          'figures below will read darker than the page actually is.',
      );
    }

    screenLayer(flameCanvas, (r) => {
      ctx.drawImage(flameCanvas, r.left, r.top, r.width, r.height);
    });

    ctx.restore();

    // Deliberately after restore(): these three are outside the camera.
    const flat = (el, paint) => {
      const s = style(el);
      const alpha = parseFloat(s.opacity);
      if (!alpha) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      paint();
      ctx.restore();
    };

    flat(vignetteEl, () => {
      // radial-gradient(ellipse 70% 58% at 50% 42%, transparent -> rgba(12,9,7,.94))
      ctx.save();
      ctx.translate(W * 0.5, H * 0.42);
      ctx.scale(W * 0.7, H * 0.58);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, 'rgba(12,9,7,0)');
      g.addColorStop(1, 'rgba(12,9,7,0.94)');
      ctx.fillStyle = g;
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    });

    flat(topEl, () => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(12,9,7,0.5)');
      g.addColorStop(0.26, 'rgba(12,9,7,0.12)');
      g.addColorStop(0.4, 'rgba(12,9,7,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });

    flat(stopEl, () => {
      ctx.fillStyle = toCss(toRGBA(style(stopEl).backgroundColor));
      ctx.fillRect(0, 0, W, H);
    });
  } else {
    // Home: the flat page colour with one fixed radial ember wash over the top
    // third. Painted from the live element so a change to it is picked up.
    for (const el of document.querySelectorAll('[aria-hidden]')) {
      const s = style(el);
      if (!s.backgroundImage.includes('radial-gradient')) continue;
      const r = el.getBoundingClientRect();
      if (!r.height) continue;
      const g = ctx.createRadialGradient(
        r.left + r.width / 2,
        r.top,
        0,
        r.left + r.width / 2,
        r.top,
        Math.max(r.width * 0.6, r.height),
      );
      g.addColorStop(0, 'rgba(224,160,87,0.13)');
      g.addColorStop(0.7, 'rgba(19,21,24,0)');
      ctx.fillStyle = g;
      ctx.fillRect(r.left, r.top, r.width, r.height);
    }
  }

  const pixels = ctx.getImageData(0, 0, W, H).data;
  const at = (x, y) => {
    const i = (y * W + x) * 4;
    return [pixels[i], pixels[i + 1], pixels[i + 2]];
  };

  // ---- the elements -------------------------------------------------------

  /** Own opacity times every ancestor's, because a fade is inherited visually. */
  function effectiveOpacity(el) {
    let o = 1;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      o *= parseFloat(getComputedStyle(n).opacity);
    }
    return o;
  }

  const candidates = [
    ...document.querySelectorAll(
      'p,h1,h2,h3,span,button,a,label,dt,dd,li,input,summary',
    ),
  ].filter((el) => {
    if (el.closest('[aria-hidden="true"]')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) return false;
    // Leaf-ish only: a wrapper reports its children's text and its own box.
    const text = (el.textContent || '').trim();
    const own = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim(),
    );
    return (own && text) || el.tagName === 'INPUT';
  });

  const rows = [];

  for (const el of candidates) {
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none') continue;

    const alpha = effectiveOpacity(el);
    if (alpha < 0.05) continue;

    const colour = toRGBA(s.color);
    colour[3] *= alpha;

    const r = el.getBoundingClientRect();
    const x0 = Math.max(0, Math.floor(r.left));
    const x1 = Math.min(W - 1, Math.ceil(r.right));
    const y0 = Math.max(0, Math.floor(r.top));
    const y1 = Math.min(H - 1, Math.ceil(r.bottom));

    let worst = Infinity;
    let worstBg = null;
    const stepX = Math.max(1, Math.floor((x1 - x0) / 24));
    const stepY = Math.max(1, Math.floor((y1 - y0) / 12));

    for (let y = y0; y <= y1; y += stepY) {
      for (let x = x0; x <= x1; x += stepX) {
        const bg = at(x, y);
        const fg = over(colour, bg);
        const cr = ratio(fg, bg);
        if (cr < worst) {
          worst = cr;
          worstBg = bg;
        }
      }
    }

    // 18.66px bold or 24px counts as large text under WCAG 2.1.
    const px = parseFloat(s.fontSize);
    const bold = parseInt(s.fontWeight, 10) >= 700;
    const large = px >= 24 || (bold && px >= 18.66);
    const need = large ? 3 : 4.5;

    rows.push({
      text: (el.getAttribute('aria-label') ||
        el.getAttribute('placeholder') ||
        el.textContent ||
        '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 34),
      px: Math.round(px),
      ratio: Number(worst.toFixed(2)),
      need,
      pass: worst >= need,
      bg: worstBg && `#${worstBg.map((v) => v.toString(16).padStart(2, '0')).join('')}`,
    });
  }

  // Left on window so the composite can be eyeballed against the real screen —
  // if it does not look like the page, the numbers are about something else.
  window.__contrastComposite = out;
  return rows;
  }

  // Six readings about four seconds apart covers most of one drift cycle. On a
  // flat background one is enough — nothing under the type is moving.
  const passes = hasScene ? 6 : 1;
  const worstByKey = new Map();

  for (let i = 0; i < passes; i++) {
    if (i > 0) await sleep(3800);
    for (const row of await measure()) {
      const key = `${row.text}|${row.px}`;
      const seen = worstByKey.get(key);
      if (!seen || row.ratio < seen.ratio) worstByKey.set(key, row);
    }
  }

  const rows = [...worstByKey.values()].sort((a, b) => a.ratio - b.ratio);
  console.table(rows);
  const failing = rows.filter((r) => !r.pass);
  console.log(
    failing.length
      ? `contrast-room: ${failing.length} of ${rows.length} below threshold ` +
          `(${hasScene ? 'photographic' : 'flat'} stack, worst of ${passes})`
      : `contrast-room: all ${rows.length} clear ` +
          `(${hasScene ? 'photographic' : 'flat'} stack, worst of ${passes})`,
  );

  return rows;
})();
