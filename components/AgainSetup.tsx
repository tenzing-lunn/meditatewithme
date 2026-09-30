'use client';

import { useEffect, useRef, useState } from 'react';
import { SITTING_OPTIONS } from '@/lib/journey';
import { localTime } from '@/lib/format';
import type { Point } from '@/lib/pond';
import { nextSharedBellAt, TIMER_STOPS } from '@/lib/timer';
import { BELL_KINDS, type UserPreferences } from '@/lib/types';
import { BELLS, previewBell, stopPreviewBell } from './audio';
import { POND_ACTION, POND_CHOICE, POND_CHOICE_ON } from './controls';
import Pebble from './Pebble';
import { DEFAULT_MASTER, MASTER_KEY, TRACKS, type TrackSlug } from './mix';
import { settingsLine } from './settingsLine';
import Sounds, { type MixPatch } from './Sounds';

const QUESTIONS = ['How will you sit?', 'How long?', 'Which bell?', 'Any sound while you sit?', 'Ready to begin?'];

function Choices({ label, options, value, onPick }: {
  label: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onPick: (value: string) => void;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap justify-center gap-x-6 gap-y-2">
      {options.map((option, i) => (
        <button
          key={option.value}
          ref={(el) => { buttons.current[i] = el; }}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          className={`${POND_CHOICE} ${value === option.value ? POND_CHOICE_ON : ''}`}
          onClick={() => onPick(option.value)}
          onKeyDown={(e) => {
            const dir = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 0;
            if (!dir) return;
            e.preventDefault();
            const next = (i + dir + options.length) % options.length;
            onPick(options[next]!.value);
            buttons.current[next]?.focus();
          }}
        >{option.label}</button>
      ))}
    </div>
  );
}

export default function AgainSetup({ prefs, update, guided, onGuided, now, onTaste, onHush, onBegin, onCancel }: {
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  guided: boolean;
  onGuided: (guided: boolean) => void;
  now: number | null;
  onTaste: (slug: TrackSlug, gain?: number) => void;
  onHush: () => void;
  onBegin: (at: Point) => void;
  onCancel: () => void;
}) {
  // The first question is separate from the five settings steps.
  const [step, setStep] = useState(-1);
  const heading = useRef<HTMLHeadingElement | null>(null);
  const started = useRef(false);
  useEffect(() => {
    heading.current?.focus();
    return () => {
      stopPreviewBell();
      if (!started.current) onHush();
    };
  }, [step, onHush]);

  const move = (next: number) => {
    stopPreviewBell();
    onHush();
    setStep(next);
  };
  const start = (button: HTMLButtonElement) => {
    stopPreviewBell();
    onHush();
    started.current = true;
    const rect = (button.querySelector('[data-stone]') ?? button).getBoundingClientRect();
    onBegin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };
  const summary = `${guided ? 'With a guide' : 'By yourself'} · ${settingsLine(guided ? { ...prefs, untilBell: true } : prefs, now)}`;
  const sound = (patch: MixPatch) => {
    const soundMix = { ...prefs.soundMix, ...patch };
    update({ soundMix });
    const chosen = TRACKS.find((track) => (soundMix[track.slug] ?? 0) > 0);
    onHush();
    if (chosen) onTaste(chosen.slug, soundMix[MASTER_KEY] ?? DEFAULT_MASTER);
  };

  return (
    <section onKeyDown={(e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      if (step < 0) onCancel();
      else move(step - 1);
    }} className="relative flex h-full flex-col overflow-y-auto bg-paper/95 px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-14">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <button type="button" className={`${POND_CHOICE} !font-sans !text-control`}  onClick={() => step < 0 ? onCancel() : move(step - 1)}>Back</button>
        {step >= 0 && <p className="text-caption text-ink-3">Step {step + 1} of {QUESTIONS.length}</p>}
      </div>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-8 text-center">
        <h2 ref={heading} tabIndex={-1} className="font-display text-question leading-tight text-ink outline-none sm:text-question-sm">
          {step < 0 ? 'Same setup?' : QUESTIONS[step]}
        </h2>
        {step < 0 ? (
          <>
            <p className="mt-5 text-body text-ink-2">{summary}</p>
            <div className="mt-8 flex justify-center gap-6">
              <button type="button" className={POND_ACTION} disabled={now === null} onClick={(e) => start(e.currentTarget)}><span data-stone><Pebble /></span>Yes</button>
              <button type="button" className={POND_CHOICE} onClick={() => move(0)}>No</button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-7">
              {step === 0 && <Choices label="How you sit" value={guided ? 'guided' : 'alone'} options={SITTING_OPTIONS} onPick={(value) => onGuided(value === 'guided')} />}
              {step === 1 && (guided ? (
                <p className="text-body text-ink-2">Guided sittings finish together at {now === null ? 'the next shared bell' : localTime(nextSharedBellAt(now))}.</p>
              ) : <Choices label="How long to sit" value={prefs.untilBell ? 'bell' : String(prefs.timerMinutes)} options={[
                ...TIMER_STOPS.map((minutes) => ({ value: String(minutes), label: `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` })),
                { value: 'bell', label: `Until ${now === null ? 'the shared bell' : localTime(nextSharedBellAt(now))}` },
              ]} onPick={(value) => update(value === 'bell' ? { untilBell: true, showCount: true } : { timerMinutes: Number(value), untilBell: false })} />)}
              {step === 2 && <>
                <p className="mb-5 text-body text-ink-2">A bell marks both ends. Tap one to hear it.</p>
                <Choices label="The bell" value={prefs.endBell} options={BELL_KINDS.map((kind) => ({ value: kind, label: BELLS[kind].label }))} onPick={(value) => {
                  const kind = BELL_KINDS.find((kind) => kind === value)!;
                  update({ endBell: kind });
                  previewBell(kind);
                }} />
              </>}
              {step === 3 && <Sounds mix={prefs.soundMix} onSound={sound} />}
              {step === 4 && <p className="text-body text-ink-2">{summary}</p>}
            </div>
            <div className="mt-8 flex justify-center">
              {step < 4 ? <button type="button" className={POND_ACTION} onClick={() => move(step + 1)}>Next<span aria-hidden>→</span></button> : (
                <button type="button" className={POND_ACTION} disabled={now === null} onClick={(e) => start(e.currentTarget)}><span data-stone><Pebble /></span>Begin</button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
