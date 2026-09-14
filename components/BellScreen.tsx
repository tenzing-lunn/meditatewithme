'use client';

import type { BellKind } from '@/lib/types';
import Screen from './Screen';
import { BELLS, previewBell } from './audio';
import { CHIP, CHIP_ON } from './controls';

/**
 * "How will it end?"
 *
 * Three bells. Choosing one plays it, at a third of its real tail, because
 * picking a sound you cannot hear is guesswork. That strike goes straight
 * to the audio context, never through the mix, so this is the one screen
 * before the bowl that makes a sound, and only when a chip is pressed.
 */
export default function BellScreen({
  current,
  endBell,
  onPick,
  onBack,
  onNext,
  nextLabel,
}: {
  current: boolean;
  endBell: BellKind;
  onPick: (kind: BellKind) => void;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <Screen
      current={current}
      title="How will it end?"
      lede="A bell marks both ends of a sitting. Choose one, and hear it."
      onBack={onBack}
      onNext={onNext}
      nextLabel={nextLabel}
    >
      <div className="flex flex-col gap-3" role="group" aria-label="The bell">
        {(Object.keys(BELLS) as BellKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => {
              onPick(kind);
              previewBell(kind);
            }}
            aria-pressed={endBell === kind}
            className={`${CHIP} min-h-14 w-full ${endBell === kind ? CHIP_ON : ''}`}
          >
            {BELLS[kind].label}
          </button>
        ))}
      </div>
    </Screen>
  );
}
