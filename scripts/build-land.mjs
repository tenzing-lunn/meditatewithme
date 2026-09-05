// Natural Earth 110m land -> public/earth/land.json, the compact ring format
// `landTexture()` in components/Globe.tsx rasterises.
//
// Not run by the build; kept so the asset is reproducible rather than a binary
// that appeared one day. To regenerate:
//
//   curl -sL -o land.geojson \
//     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson
//   node scripts/build-land.mjs
//
// The sibling asset, public/earth/relief.jpg, comes from public/earth/day.jpg
// (NASA Blue Marble, public domain) via macOS `sips`:
//
//   sips -Z 2048 day.jpg --out relief.jpg
//   sips -s format jpeg -s formatOptions 45 \
//     --matchTo '/System/Library/ColorSync/Profiles/Generic Gray Gamma 2.2 Profile.icc' \
//     relief.jpg --out relief.jpg
//
// KEEP day.jpg. It is no longer referenced by any code, but it is the only
// source relief.jpg can be regenerated from, and it is 1.3MB that never
// reaches a browser because nothing links it.
import { readFileSync, writeFileSync } from 'node:fs';

const SCALE = 50; // 1/50 degree ~= 2.2km. Far finer than a 600px globe resolves.
const src = JSON.parse(readFileSync(new URL('../land.geojson', import.meta.url)));

/** [lon, lat] pairs -> flat integer array, consecutive duplicates dropped. */
function ring(coords) {
  const out = [];
  let px = null;
  let py = null;
  for (const [lon, lat] of coords) {
    const x = Math.round(lon * SCALE);
    const y = Math.round(lat * SCALE);
    if (x === px && y === py) continue;
    out.push(x, y);
    px = x;
    py = y;
  }
  return out;
}

const polygons = [];
for (const f of src.features) {
  const g = f.geometry;
  if (!g) continue;
  const parts = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const poly of parts) {
    // poly[0] is the outer ring; the rest are holes. Both are kept and the
    // rasteriser fills them with the even-odd rule, so lakes stay ocean.
    const rings = poly.map(ring).filter((r) => r.length >= 6);
    if (rings.length) polygons.push(rings);
  }
}

const out = { scale: SCALE, polygons };
const json = JSON.stringify(out);
writeFileSync(
  new URL('../public/earth/land.json', import.meta.url),
  json,
);

const pts = polygons.reduce(
  (n, p) => n + p.reduce((m, r) => m + r.length / 2, 0),
  0,
);
console.log(
  `${polygons.length} polygons, ${pts} points, ${(json.length / 1024).toFixed(1)}KB`,
);
