import type { Metadata } from 'next';
import World from '@/components/World';

/**
 * The map.
 *
 * Its own route, unlike the questions, the sitting and Home, which share `/`
 * and switch on state. The difference is real rather than arbitrary: sitting
 * is something you do inside the frame you were already looking at — the
 * camera lifts from the bowl to the earth without a navigation — whereas this
 * is somewhere else, with its own subject, that somebody should be able to
 * link to and come back from.
 *
 * Nothing on the way to a sitting imports anything from here, and this route's weight —
 * 273KB of earth, since the sphere and its 600KB of `three` went on 6 September
 * 2026 — is loaded by `World` behind `next/dynamic`, so it is not on any path
 * that leads to meditating.
 */
export const metadata: Metadata = {
  title: 'This hour, on the earth — Meditate With Me',
  description:
    'Where in the world a candle is lit this hour. Each light is one place somebody is sitting.',
};

export default function WorldPage() {
  return <World />;
}
