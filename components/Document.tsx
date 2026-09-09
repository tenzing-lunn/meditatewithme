import Link from 'next/link';
import type { ReactNode } from 'react';

import { QUIET } from './controls';

/**
 * A document, on a site that otherwise has none.
 *
 * Every other surface is a photograph in a frame that does not scroll. The
 * privacy notice and the terms are text, and text that clips is text somebody
 * cannot finish reading — the one register in which that is a legal problem
 * and not a design one. So this scrolls, measures 62 characters across, and
 * has one control: the way back.
 *
 * Written when the second document arrived, so the two do not each carry
 * their own copy of the header, the measure and the placeholder chip.
 */
export function Document({
  title,
  changed,
  children,
}: {
  title: string;
  /** "8 September 2026". The one date a reader of a document looks for. */
  changed: string;
  children: ReactNode;
}) {
  return (
    <main className="text-ink-2 min-h-dvh px-5 pt-5 pb-16 sm:px-8">
      <header className="mx-auto flex max-w-[62ch] items-center justify-between gap-4">
        <Link href="/" className={QUIET}>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
            <path
              d="M15 5 8 12l7 7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </Link>
      </header>

      <article className="mx-auto mt-12 max-w-[62ch] text-base leading-relaxed">
        <h1 className="font-display text-ink text-4xl leading-tight">{title}</h1>
        {children}
        <p className="text-ink-3 mt-12 text-sm">Last changed {changed}.</p>
      </article>
    </main>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10 space-y-4">
      <h2 className="font-display text-ink text-2xl leading-tight">{title}</h2>
      {children}
    </section>
  );
}

/**
 * A fact the document needs and does not have. Visibly so: a dashed ember
 * chip, so nobody mistakes a page with one of these on it for a finished one.
 * Every instance is a question for Jonny — see `plans/launch-readiness.md`.
 */
export function Unfilled({ children }: { children: string }) {
  return (
    <span className="border-ember text-ember rounded-control border border-dashed px-1.5 py-0.5 text-sm">
      {children}
    </span>
  );
}
