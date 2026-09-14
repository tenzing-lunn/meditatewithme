'use client';

import { useEffect, useState } from 'react';
import Afterwards from './Afterwards';
import Sitting from './Sitting';
import { DEMO_POINTS } from './worldDemo';

/**
 * The sitting and the ending, for looking at while building them.
 *
 * `/?demo=sitting` and `/?demo=finished`, in `next dev` only. A real sitting
 * rings a bell out of the speakers and writes to the practice log; this
 * mounts the two screens with an invented earth, a frozen clock, no
 * presence, no audio graph and no log, so they can be seen without any of
 * that happening. It is reached only through a dynamic import inside
 * `Entry`'s `NODE_ENV === 'development'` branch, which is dead in a
 * production build, so this module and the fixture it imports are never
 * bundled. See `worldDemo.ts` for why that protection matters here.
 */
export default function Demo({ which }: { which: string }) {
  const [mono, setMono] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setMono(performance.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  const params = new URLSearchParams(window.location.search);
  const alone = params.has('alone');

  if (which === 'finished') {
    return (
      <Afterwards
        minutes={10}
        withOthers={alone ? null : 3}
        endedAt={-20_000}
        mono={mono}
        entries={[]}
        now={Date.now()}
        onAgain={() => {}}
        onFinish={() => {}}
      />
    );
  }

  return (
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
      points={DEMO_POINTS}
      you={{ lat: 51.5, lon: -0.5 }}
      labels={['Ana from Lisbon', 'Bo from Oslo']}
      ownLabel={null}
      soundMix={{}}
      onSound={() => {}}
      onSoundOpen={() => {}}
      onEnd={() => {}}
    />
  );
}
