'use client';

import type { CSSProperties, ReactNode } from 'react';
import { PRIMARY, QUIET, WORD } from './controls';

/**
 * One question, and the way on.
 *
 * Every screen on the rail is this shape: a heading in the rounded face, a
 * line under it, the one control that answers it, and at the foot Back on
 * the left and Next on the right, with Skip as a quiet word beside Next
 * when the question is optional. The foot sits on the safe-area inset so
 * it clears a phone's home indicator; the middle takes the rest of the
 * height and centres what it holds, and scrolls on its own if a question
 * is taller than a short window. The page never scrolls.
 *
 * The heading and the control settle upward as the screen arrives (the
 * `screen-settle` keyframes in `globals.css`), sixty milliseconds apart, so
 * a screen reads as arriving rather than switching on.
 */
export default function Screen({
  title,
  titleClassName = 'font-display text-[1.75rem] font-bold leading-[1.15] text-ink sm:text-[2.25rem]',
  lede,
  children,
  current,
  menu,
  onBack,
  backLabel = 'Back',
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
  onSkip,
  skipLabel = 'Skip',
}: {
  title: ReactNode;
  titleClassName?: string;
  lede?: ReactNode;
  children?: ReactNode;
  /** In the frame now. Drives the settle and nothing else. */
  current: boolean;
  /** Something for the top corner: the menu. */
  menu?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
}) {
  // Only the arrival is animated. A screen sliding out keeps its content, or
  // it would vanish mid-slide.
  const settle = current ? 'screen-settle' : '';
  return (
    <section className="relative flex h-full w-full flex-col overflow-y-auto px-6 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
      {menu && (
        <div className="absolute top-[calc(0.875rem+env(safe-area-inset-top))] right-4 z-10">
          {menu}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        <div className={settle} style={{ '--i': 0 } as CSSProperties}>
          <h2 tabIndex={-1} className={`outline-none ${titleClassName}`}>
            {title}
          </h2>
          {lede && (
            <p className="mt-3 text-base leading-relaxed text-ink-2">{lede}</p>
          )}
        </div>
        {children && (
          <div className={`mt-8 ${settle}`} style={{ '--i': 1 } as CSSProperties}>
            {children}
          </div>
        )}
      </div>

      {(onBack || onNext || onSkip) && (
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          {onBack ? (
            <button type="button" onClick={onBack} className={QUIET}>
              {backLabel}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {onSkip && (
              <button type="button" onClick={onSkip} className={WORD}>
                {skipLabel}
              </button>
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                disabled={nextDisabled}
                className={PRIMARY}
              >
                {nextLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
