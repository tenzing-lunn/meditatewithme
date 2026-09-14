'use client';

import { useEffect, useState } from 'react';
import type { Cell } from '@/lib/geo';

export interface OriginReading {
  /** "Lisbon, Portugal", or null when the edge could not say. */
  suggestion: string | null;
  /** The one-degree cell the request came from, for marking your own light. */
  cell: Cell | null;
  loaded: boolean;
}

const NONE: OriginReading = { suggestion: null, cell: null, loaded: false };

/** One fetch per page. Every screen that asks gets the same answer. */
let pending: Promise<OriginReading> | null = null;

function regionName(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

async function load(): Promise<OriginReading> {
  try {
    const res = await fetch('/api/origin', { cache: 'no-store' });
    if (!res.ok) return { ...NONE, loaded: true };
    const body = (await res.json()) as {
      city?: unknown;
      country?: unknown;
      cell?: unknown;
    };
    const city = typeof body.city === 'string' ? body.city : null;
    const country = regionName(
      typeof body.country === 'string' ? body.country : null,
    );
    const cell =
      body.cell &&
      typeof body.cell === 'object' &&
      typeof (body.cell as Cell).lat === 'number' &&
      typeof (body.cell as Cell).lon === 'number'
        ? (body.cell as Cell)
        : null;
    const suggestion = [city, country].filter(Boolean).join(', ') || null;
    return { suggestion, cell, loaded: true };
  } catch {
    return { ...NONE, loaded: true };
  }
}

/**
 * Roughly where the connection is from, as a suggestion to confirm.
 *
 * Nothing here is stored: the edge's guess is shown in the field, and only
 * what the person leaves in the field is kept. On localhost and behind some
 * VPNs the answer is simply nothing, and the field is empty.
 */
export function useOrigin(): OriginReading {
  const [reading, setReading] = useState<OriginReading>(NONE);

  useEffect(() => {
    let live = true;
    pending ??= load();
    void pending.then((r) => {
      if (live) setReading(r);
    });
    return () => {
      live = false;
    };
  }, []);

  return reading;
}
