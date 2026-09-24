'use client';

import { useEffect, useState } from 'react';
import Afterwards from './Afterwards';
import Pond from './Pond';
import Sitting from './Sitting';
import { useReducedMotion } from './useReducedMotion';
import { DEMO_POINTS } from './worldDemo';

/**
 * The sitting and the ending, for looking at while building them.
 *
 * `/?demo=sitting` and `/?demo=finished`, in `next dev` only. A real sitting
 * rings a bell out of the speakers and writes to the practice log; this
 * mounts the screens on a pond of invented stones, a frozen clock, no
 * presence, no audio graph and no log, so they can be seen without any of
 * that happening. `finished` is the held beat — the sitting, ended, with
 * *Come back.* over the water — and stays there rather than moving on after
 * ten seconds; `finished&settled` is what comes after it, the minutes and
 * the ways on. `&alone` on either is the by-yourself sitting, and `&throw`
 * on `sitting` throws the stone in from the bottom left first.
 * It is reached only through a dynamic import inside
 * `Entry`'s `NODE_ENV === 'development'` branch, which is dead in a
 * production build, so this module and the fixture it imports are never
 * bundled. See `worldDemo.ts` for why that protection matters here.
 */
export default function Demo({ which }: { which: string }) {
  const [mono, setMono] = useState(0);
  // Its own mix, going nowhere: the sound sheet is a real control and a dead
  // `onSound` made it a picture of one — no tile would light and the Volume
  // would never appear, which is most of what there is to look at.
  const [soundMix, setSoundMix] = useState<Record<string, number>>({});
  useEffect(() => {
    const t = window.setInterval(() => setMono(performance.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  const reduced = useReducedMotion();
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const [thrown] = useState(() =>
    params.has('throw') ? { at: { x: 96, y: window.innerHeight - 110 }, t: performance.now() } : null,
  );
  const alone = params.has('alone');
  const finished = which === 'finished';
  const [bellAt] = useState(() => (finished ? performance.now() : null));
  const stones = alone
    ? []
    : DEMO_POINTS.flatMap((p) =>
        Array.from({ length: Math.max(1, Math.min(2, p.lit)) }, (_, k) => ({
          key: `${p.lat},${p.lon}#${k}`,
          label: p.labels?.[k],
        })),
      );

  return (
    <main id="main" className="relative h-dvh overflow-clip bg-paper text-ink">
      <div className="absolute inset-0">
        <Pond stones={stones} you throwFrom={thrown} bellAt={bellAt} reduced={reduced} />
      </div>
      <div className="absolute inset-0">
        {finished && params.has('settled') ? (
          <Afterwards minutes={10} onAgain={() => {}} onFinish={() => {}} />
        ) : (
          <Sitting
            sit={{
              id: 'demo',
              startedAt: 0,
              startedAtWall: Date.now(),
              endsAt: 10 * 60_000,
              together: !alone,
              withOthers: !alone,
            }}
            now={Date.now()}
            mono={mono}
            count={9}
            litCount={12}
            labels={['Ana from Lisbon', 'Bo from Oslo']}
            ownLabel={null}
            soundMix={soundMix}
            onSound={(patch) => setSoundMix((current) => ({ ...current, ...patch }))}
            onSoundOpen={() => {}}
            onEnd={() => {}}
            ended={finished}
          />
        )}
      </div>
    </main>
  );
}
