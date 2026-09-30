'use client';

import { SKIPPING_STONE_SRC } from '@/lib/pebble';

/** The solid, matte skipping stone, shared with the throw on the pond. */
export default function Pebble() {
  return (
    <svg aria-hidden="true" width="28" height="10" viewBox="0 0 28 10" className="block overflow-visible transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:-rotate-6 group-focus-visible:-translate-y-0.5 group-focus-visible:-rotate-6 motion-reduce:transform-none motion-reduce:transition-none">
      <image href={SKIPPING_STONE_SRC} width="28" height="10" preserveAspectRatio="none" />
    </svg>
  );
}
