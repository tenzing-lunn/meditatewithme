'use client';

import { useRef, useState } from 'react';
import type { UserPreferences } from '@/lib/types';
import Screen from './Screen';
import Switch from './Switch';
import { QUIET } from './controls';
import { TRACKS, type MASTER_KEY, type TrackSlug } from './mix';
import SoundMixer, { BedToggles } from './SoundMixer';

/**
 * "Anything underneath?"
 *
 * A switch first, because silence is the usual answer and nobody should
 * have to understand a mixer to decline one. Yes reveals the five beds as
 * chips, and the faders one tap further behind Adjust levels.
 *
 * WHAT THIS SCREEN IS ALLOWED TO HEAR
 * The audio graph was built silent on the first Next of the journey. It is
 * unmuted here, inside the click that turns the switch on, and nowhere
 * else: that is the moment somebody has agreed to hear rain. Turning it off
 * writes real zeros to the beds, so a declined mix is silent and not merely
 * hidden, and turning it back on restores what was there.
 */
export default function SoundScreen({
  current,
  prefs,
  update,
  onSound,
  onUnmute,
  onBack,
  onNext,
  nextLabel,
}: {
  current: boolean;
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  /** Runs inside the change event, because the graph needs a gesture. */
  onSound: (slug: TrackSlug | typeof MASTER_KEY, gain: number) => void;
  /** The switch has gone on. Raise the master. */
  onUnmute: () => void;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  // Its own state rather than derived live, so pulling every fader down by
  // hand does not flip the switch and pull the mixer out from under the
  // fingers doing it. Right for the initial value, wrong as an identity.
  const [noise, setNoise] = useState(() =>
    TRACKS.some((t) => (prefs.soundMix[t.slug] ?? 0) > 0),
  );
  const beforeSilence = useRef<Record<string, number>>({});
  const [levelsOpen, setLevelsOpen] = useState(false);

  const toggle = (next: boolean) => {
    if (!next) {
      const kept: Record<string, number> = {};
      const silent: Record<string, number> = { ...prefs.soundMix };
      for (const track of TRACKS) {
        const level = prefs.soundMix[track.slug] ?? 0;
        if (level > 0) kept[track.slug] = level;
        silent[track.slug] = 0;
      }
      beforeSilence.current = kept;
      update({ soundMix: silent });
    } else {
      onUnmute();
      update({ soundMix: { ...prefs.soundMix, ...beforeSilence.current } });
    }
    setNoise(next);
  };

  return (
    <Screen
      current={current}
      title="Anything underneath?"
      lede="Silence is the usual answer. Rain, wind and the rest are here if you want them."
      onBack={onBack}
      onNext={onNext}
      nextLabel={nextLabel}
    >
      <div className="flex flex-col gap-6">
        <Switch checked={noise} onChange={toggle} label={noise ? 'Sound on' : 'In silence'} />

        {noise && (
          <div className="flex flex-col gap-4">
            <BedToggles soundMix={prefs.soundMix} onChange={onSound} />
            <button
              type="button"
              onClick={() => setLevelsOpen((v) => !v)}
              aria-expanded={levelsOpen}
              className={`${QUIET} self-start`}
            >
              {levelsOpen ? 'Done adjusting' : 'Adjust levels'}
            </button>
            {levelsOpen && <SoundMixer soundMix={prefs.soundMix} onChange={onSound} />}
          </div>
        )}
      </div>
    </Screen>
  );
}
