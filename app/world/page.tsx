import type { Metadata } from 'next';
import World from '@/components/World';

/**
 * The globe.
 *
 * Its own route, unlike the room and Home, which share `/` and switch on state.
 * The difference is real rather than arbitrary: sitting is something you do
 * inside the same frame you were already looking at — and §16's opening move
 * depends on `CandleScene` staying mounted while the camera travels — whereas
 * this is somewhere else, with its own subject, that somebody should be able to
 * link to and come back from.
 *
 * Nothing in the room imports anything from here, and this route's weight (about
 * 600KB of `three`, plus 273KB of earth) is loaded by `World` behind
 * `next/dynamic`,
 * so it is not on any path that leads to meditating.
 */
export const metadata: Metadata = {
  title: 'This hour, on the earth — Meditate With Me',
  description:
    'Where in the world a candle is lit this hour. Each light is one place somebody is sitting.',
};

export default function WorldPage() {
  return <World />;
}
