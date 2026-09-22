'use client';

import type { UserPreferences } from '@/lib/types';
import Screen from './Screen';
import Sounds, { type MixPatch } from './Sounds';

/**
 * "Any sound while you sit?"
 *
 * The question, and under it the six tiles and their Volume — the same
 * control as *Underneath* in the settings and the sheet during a sitting,
 * which is `Sounds.tsx` and where all of it is explained. This screen is the
 * asking: the question, the line under it, and the one thing this place adds,
 * which is that the first bed chosen here is what unmutes a graph that was
 * built silent two screens ago.
 */
export default function SoundScreen({
  current,
  prefs,
  onSound,
  onUnmute,
  onBack,
  onNext,
  nextLabel,
  step,
  steps,
}: {
  current: boolean;
  prefs: UserPreferences;
  /** Runs inside the change event, because the graph needs a gesture. */
  onSound: (patch: MixPatch) => void;
  /** The first bed has been chosen. Raise the master. */
  onUnmute: () => void;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  step?: number;
  steps?: number;
}) {
  return (
    <Screen
      current={current}
      title="Any sound while you sit?"
      lede="Silence is the usual answer. Tap a sound to hear it."
      onBack={onBack}
      onNext={onNext}
      nextLabel={nextLabel}
      step={step}
      steps={steps}
      room
      split
      middle
    >
      <Sounds mix={prefs.soundMix} onSound={onSound} onFirst={onUnmute} />
    </Screen>
  );
}
