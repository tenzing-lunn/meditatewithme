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
 * mounts the screens with an invented earth, a frozen clock, no presence,
 * no audio graph and no log, so they can be seen without any of that
 * happening. `finished` is the held beat — the sitting, ended, with *Come
 * back.* over the earth — and stays there rather than moving on after ten
 * seconds; `finished&settled` is what comes after it, the minutes and the
 * ways on. `&alone` on either is the by-yourself sitting.
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

  const params = new URLSearchParams(window.location.search);
  const alone = params.has('alone');
  // `&dawn` for the room in daylight.
  const room = params.has('dawn') ? 'dawn' : 'dusk';

  if (which === 'finished' && params.has('settled')) {
    return (
      <div data-room={room} className="contents">
      <Afterwards
        minutes={10}
        withOthers={alone ? null : 3}
        onAgain={() => {}}
        onFinish={() => {}}
      />
      </div>
    );
  }

  return (
    <div data-room={room} className="contents">
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
      soundMix={soundMix}
      onSound={(patch) => setSoundMix((current) => ({ ...current, ...patch }))}
      onSoundOpen={() => {}}
      onEnd={() => {}}
      room={room}
      toggle={null}
      ended={which === 'finished'}
    />
    </div>
  );
}
