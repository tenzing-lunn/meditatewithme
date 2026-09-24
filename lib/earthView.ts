/**
 * Where the earth sits in its frame.
 *
 * Pure, so the part that can quietly be wrong — a phone showing the Pacific to
 * somebody in Lisbon, an empty strip of dusk beside the date line — is tested
 * rather than looked at. `WorldMap` only measures its box and draws.
 *
 * Two fits. `containFit` is the whole earth, never cropped: the sitting is
 * a picture of everyone. `coverFit` is for the doors, where the
 * earth is the whole screen behind the question: across the full width on a
 * wide screen, and on a tall one large enough that the lights are lights, which
 * means cropped — around where you are.
 */

import { X_MAX, Y_MAX, project } from './projection.ts';

/** On a tall screen, the share of the height the earth is given. */
export const COVER_HEIGHT_SHARE = 0.72;
/** Where the top of the earth sits, as a share of the height. */
export const COVER_TOP_SHARE = 0.06;

export interface MapFit {
  /** Pixels per projection unit. */
  scale: number;
  /** The earth's own box, in pixels, and where its top-left corner lands. */
  width: number;
  height: number;
  left: number;
  top: number;
}

/** The whole earth, fitted to whichever dimension runs out first, centred. */
export function containFit(w: number, h: number): MapFit {
  const scale = Math.min(w / (2 * X_MAX), h / (2 * Y_MAX));
  const width = 2 * X_MAX * scale;
  const height = 2 * Y_MAX * scale;
  return { scale, width, height, left: (w - width) / 2, top: (h - height) / 2 };
}

/**
 * The earth filling the frame, cropped around `centre` when it must be.
 *
 * As large as the larger of two needs: the full width, or COVER_HEIGHT_SHARE
 * of the height. A laptop gets the first and so the whole earth; a phone
 * gets the second, an earth several screens wide, slid so `centre` is in the
 * middle — and never so far that dusk shows beside either edge of the map.
 */
export function coverFit(w: number, h: number, centre: { lat: number; lon: number }): MapFit {
  const scale = Math.max(w / (2 * X_MAX), (h * COVER_HEIGHT_SHARE) / (2 * Y_MAX));
  const width = 2 * X_MAX * scale;
  const height = 2 * Y_MAX * scale;
  const ideal = w / 2 - (project(centre.lat, centre.lon).x + X_MAX) * scale;
  const left = width <= w ? (w - width) / 2 : Math.min(0, Math.max(w - width, ideal));
  return { scale, width, height, left, top: h * COVER_TOP_SHARE };
}

/**
 * Roughly the longitude a time zone is kept for: fifteen degrees an hour.
 *
 * `offsetMinutes` is `Date.prototype.getTimezoneOffset()`, which counts the
 * other way from the zone's name — Lisbon in summer, UTC+1, is -60. It is a
 * guess at a region, good to within a country or two, for the moment before
 * the edge has said where a visitor is, or when it cannot; nothing is sent
 * anywhere to make it.
 */
export function longitudeFromOffset(offsetMinutes: number): number {
  if (!Number.isFinite(offsetMinutes)) return 0;
  const lon = (-offsetMinutes / 60) * 15;
  return (((lon + 180) % 360) + 360) % 360 - 180;
}
