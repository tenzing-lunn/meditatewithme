'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { Screen } from '@/lib/journey';

/**
 * The screens, stacked in one frame, and the switch between them.
 *
 * Every screen of the journey is mounted in the same place; only the current
 * one is shown. Moving on, the screen you answered lifts a little and fades
 * as the next rises into its place from just below; going back runs the same
 * move downward. It is a short move, not a page sliding away: the frame, the
 * margin and the menu in the corner stay where they are, and only what is
 * asked changes. It is quick because a question answered should not be made
 * to wait for its own exit.
 *
 * Only the current screen is in the tab order or read out. The others are
 * `inert` and hidden from assistive technology the moment they leave, and
 * `visibility: hidden` once the leaving screen has faded, so nothing can be
 * focused into from behind. Focus goes to the new screen's heading, so a
 * keyboard walks the rail from the top of each question — or, on a screen
 * whose answer is simply typed, to the element it marks `data-autofocus`,
 * so the typing can start without a click. The field's label is then what
 * a screen reader is handed.
 *
 * Under reduced motion `--rail-ms` is zero and the screens swap.
 */
export default function Rail({
  screens,
  at,
  dir,
  render,
}: {
  screens: readonly Screen[];
  at: Screen;
  /** 1 moving on, -1 going back: which way the switch runs. */
  dir: 1 | -1;
  render: (screen: Screen, current: boolean) => ReactNode;
}) {
  const index = Math.max(0, screens.indexOf(at));

  // The screen that was current when the switch began, kept visible while it
  // fades. Derived during render, so the leaving screen never has a frame in
  // which it has already vanished.
  const [shown, setShown] = useState(index);
  const [leaving, setLeaving] = useState<number | null>(null);
  /**
   * Whether a question has been answered yet.
   *
   * `rail-enter` is a *switch*, and it waits out the leaving screen's fade
   * before it starts — 120ms of held nothing, then 300ms of rising. On the
   * first screen there is no leaving screen to wait for, so that was 420ms
   * of the site arriving after it had already loaded, on top of the bundle
   * and the three hooks the entry waits on. The first screen is not an
   * arrival; it is simply where you are. It animates from the second onward.
   */
  const [switched, setSwitched] = useState(false);
  if (shown !== index) {
    setShown(index);
    setLeaving(shown);
    setSwitched(true);
  }

  useEffect(() => {
    // A fallback for the case where `animationend` never fires: a tab that
    // was hidden mid-switch.
    if (leaving === null) return;
    const t = window.setTimeout(() => setLeaving(null), 800);
    return () => window.clearTimeout(t);
  }, [leaving]);

  useEffect(() => {
    const target =
      document.querySelector<HTMLElement>(`[data-screen="${at}"] [data-autofocus]`) ??
      document.querySelector<HTMLElement>(`[data-screen="${at}"] h2`);
    target?.focus({ preventScroll: true });
  }, [at]);

  return (
    <div
      className="relative h-dvh w-full overflow-clip"
      style={{ '--rail-dir': dir } as CSSProperties}
    >
      {screens.map((screen, i) => {
        const current = i === index;
        const out = !current && i === leaving;
        return (
          <div
            key={screen}
            data-screen={screen}
            className={`absolute inset-0 ${
              current ? (switched ? 'rail-enter' : '') : out ? 'rail-leave' : ''
            }`}
            inert={!current}
            aria-hidden={!current}
            style={{ visibility: current || out ? 'visible' : 'hidden' }}
            onAnimationEnd={(e) => {
              if (out && e.target === e.currentTarget) setLeaving(null);
            }}
          >
            {render(screen, current)}
          </div>
        );
      })}
    </div>
  );
}
