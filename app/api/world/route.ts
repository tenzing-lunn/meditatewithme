import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { hourStart } from '@/lib/session';
import type { WorldPoint } from '@/lib/geo';
import { report } from '../_report';

/**
 * Where this hour's candles are, by grid cell.
 *
 * WHY THIS DOES NOT BREAK §5
 * context/ARCHITECTURE.md §5 argues that the participant count survives a
 * simultaneous global join — which is not an edge case here but the entire
 * design of the product — because the response is IDENTICAL FOR EVERY VIEWER,
 * so a single edge-cache entry serves the world.
 *
 * An aggregate of grid cells is identical for every viewer too. Nothing here is
 * personalised, so this endpoint gets the same `s-maxage` / `stale-while-
 * revalidate` pair and inherits the same argument: a thousand people watching
 * the globe produce roughly one origin query every ten seconds, and the cliff
 * in §11 does not move.
 *
 * The moment somebody wants "highlight my own light", that property is gone and
 * the whole endpoint becomes uncacheable. Do it the way the room does it — the
 * viewer knows their own cell, so let the client mark it. Never the server.
 *
 * WHAT LEAVES THIS ROUTE
 * Cells and counts, and since 14 September 2026 the labels of people who
 * chose to be seen: "Ana from Lisbon", as they typed it and the heartbeat
 * route cleaned it, for cells with somebody live in them, at most a few per
 * cell and a few dozen in all. Still the same for every caller, so still
 * cacheable. No `anon_id`, no timestamps, nothing inferred.
 */

/** Same window as /api/count. A heartbeat older than this is not present. */
const LIVENESS_WINDOW_SECONDS = 90;

/**
 * Enough lights for an inhabited earth, few enough to draw at 60fps.
 *
 * Busiest first, so the cap sheds the quietest cells rather than whichever the
 * database happened to return last. At the counts §11 describes this is never
 * reached; it exists so that the day it is, the globe renders a slightly
 * incomplete earth instead of dropping frames.
 */
const MAX_POINTS = 600;

/** Names per cell, and in all. Enough for a sentence, bounded for the wire. */
const LABELS_PER_CELL = 3;
const MAX_LABELS = 60;

export const dynamic = 'force-dynamic';

interface CellRow {
  cell_lat: number | null;
  cell_lon: number | null;
  last_seen: string;
  label: string | null;
}

export async function GET() {
  const start = hourStart(Date.now());

  try {
    const supabase = await serviceClient();
    const cutoff = Date.now() - LIVENESS_WINDOW_SECONDS * 1000;

    // One read, grouped here rather than in SQL. At the scale §11 describes
    // this is a few hundred narrow rows every ten seconds, and a plain select
    // keeps the aggregation somewhere it can be read and changed without a
    // migration. If it ever stops being a few hundred rows, this becomes an
    // RPC — not a second table.
    const { data, error } = await supabase
      .from('heartbeats')
      .select('cell_lat, cell_lon, last_seen, label')
      .eq('hour_start', start.toISOString())
      .not('cell_lat', 'is', null)
      .limit(5000);

    if (error) throw error;

    const byCell = new Map<string, WorldPoint>();

    for (const row of (data ?? []) as CellRow[]) {
      const { cell_lat: lat, cell_lon: lon } = row;
      if (lat === null || lon === null) continue;

      const key = `${lat},${lon}`;
      const point = byCell.get(key) ?? { lat, lon, lit: 0, live: 0 };
      point.lit += 1;
      // Lit and live are the same distinction the ring draws: somebody who sat
      // the first ten minutes of the hour and closed the tab lit a candle here,
      // and it does not go out because they left. The globe dims it instead.
      const live = Date.parse(row.last_seen) > cutoff;
      if (live) point.live += 1;
      // A name is shown only while its person is here now.
      if (live && row.label) {
        point.labels ??= [];
        if (point.labels.length < LABELS_PER_CELL) point.labels.push(row.label);
      }
      byCell.set(key, point);
    }

    const points = [...byCell.values()]
      .sort((a, b) => b.lit - a.lit)
      .slice(0, MAX_POINTS);

    // Busiest cells keep their names first; past the cap the rest lose theirs.
    let budget = MAX_LABELS;
    for (const p of points) {
      if (!p.labels) continue;
      if (budget <= 0) {
        delete p.labels;
        continue;
      }
      if (p.labels.length > budget) p.labels = p.labels.slice(0, budget);
      budget -= p.labels.length;
    }

    return NextResponse.json(
      {
        points,
        // The totals over every heartbeat that has a cell — which is not the
        // same as /api/count, and deliberately reported separately rather than
        // summed by the client. A globe showing eleven lights next to a caption
        // saying fourteen people has not lied; it has been placed.
        placed: points.reduce((n, p) => n + p.lit, 0),
        hourStart: start.toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=10',
          'CDN-Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20',
        },
      },
    );
  } catch (err) {
    // Degrade silently, like everything else here. An earth with no lights on
    // it is a truthful thing to look at when the count is unavailable; an error
    // banner is not something this product shows anybody.
    report('world', err);
    return NextResponse.json(
      { points: [], placed: null, hourStart: start.toISOString() },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
