'use client';

import Bowl from './Bowl';
import Screen from './Screen';
import Switch from './Switch';
import { FOCUS_ROOM, WORD_ROOM } from './controls';

/**
 * The last screen: the bowl, and the strike that begins the sitting.
 *
 * Everything decided on the rail is one line under the bowl, with Change
 * beside it, so what pressing the bowl will do is read before it is
 * pressed. The strike is the gesture that unlocks the audio, builds the
 * graph, restores the stored mix and rings the opening bell, all inside the
 * one click; it is also the click that asks for full screen when that
 * switch is on, because the Fullscreen API answers nothing else.
 */
export default function BowlScreen({
  current,
  line,
  ready,
  struck,
  onStrike,
  onChange,
  onBack,
  fullscreen,
  step,
  steps,
}: {
  current: boolean;
  /** "Until 12:55 · singing bowl · in silence" */
  line: string;
  /** The clock has answered, so a shared bell can be resolved. */
  ready: boolean;
  struck: number;
  onStrike: () => void;
  /** Back to the length question. */
  onChange: () => void;
  onBack: () => void;
  /** Null where the API does not exist, and then the switch is not drawn. */
  fullscreen: { wanted: boolean; setWanted: (v: boolean) => void } | null;
  step?: number;
  steps?: number;
}) {
  return (
    <Screen
      current={current}
      title="When you are ready."
      titleClassName="font-display text-question font-bold leading-[1.15] text-room-ink text-center sm:text-question-sm lg:text-question-lg"
      align="center"
      onBack={onBack}
      step={step}
      steps={steps}
      room
    >
      <div className="flex flex-col items-center gap-6">
        <button
          type="button"
          onClick={onStrike}
          disabled={!ready}
          aria-label="Strike the bowl and begin"
          className={`group w-full max-w-[18rem] rounded-card transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 motion-reduce:transition-none ${FOCUS_ROOM}`}
        >
          <Bowl struck={struck} className="w-full" />
        </button>
        <p className="flex flex-wrap items-center justify-center gap-x-2 text-control text-room-ink-2">
          <span>{line}</span>
          <button type="button" onClick={onChange} className={WORD_ROOM}>
            Change
          </button>
        </p>
        {fullscreen && (
          <Switch
            room
            checked={fullscreen.wanted}
            onChange={fullscreen.setWanted}
            label="Full screen while you sit"
          />
        )}
      </div>
    </Screen>
  );
}
