'use client';

import { useId, type ReactNode } from 'react';
import { FOCUS, FOCUS_DUSK, FOCUS_ROOM } from './controls';

/**
 * A switch, for the questions with two answers and no middle.
 *
 * The pill says which answer is showing without a word being read; the
 * label beside it says what the answer means. The whole row is the
 * control, so the target is as wide as the sentence and never a 32px pill
 * on its own.
 */
export default function Switch({
  checked,
  onChange,
  label,
  description,
  dusk = false,
  room = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  /** On the sitting's dark ground. */
  dusk?: boolean;
  /** In the room, dawn or dusk: the `room-*` tokens. */
  room?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? id : undefined}
        onClick={() => onChange(!checked)}
        className={`group flex min-h-11 items-center gap-3 rounded-control text-left ${
          room ? FOCUS_ROOM : dusk ? FOCUS_DUSK : FOCUS
        }`}
      >
        <span
          aria-hidden
          className={`flex h-8 w-14 shrink-0 items-center rounded-full border p-1 transition-colors duration-200 motion-reduce:transition-none ${
            checked
              ? room
                ? 'border-room-action bg-room-action/20'
                : dusk
                  ? 'border-flame bg-flame/20'
                  : 'border-ember bg-ember-soft'
              : room
                ? 'border-room-edge group-hover:border-room-action'
                : dusk
                  ? 'border-dusk-ink-2/55 group-hover:border-flame'
                  : 'border-rule bg-surface group-hover:border-ember'
          }`}
        >
          <span
            className={`size-5 rounded-full transition-[transform,background-color] duration-200 ease-out motion-reduce:transition-none ${
              checked
                ? `translate-x-6 ${room ? 'bg-room-action' : dusk ? 'bg-flame' : 'bg-ember'}`
                : `translate-x-0 ${room ? 'bg-room-ink-2' : dusk ? 'bg-dusk-ink-2' : 'bg-ink-3 group-hover:bg-ink-2'}`
            }`}
          />
        </span>
        <span
          className={`text-control font-semibold ${
            room ? 'text-room-ink' : dusk ? 'text-dusk-ink' : checked ? 'text-ember' : 'text-ink-2'
          }`}
        >
          {label}
        </span>
      </button>
      {description && (
        <p
          id={id}
          className={`pl-[4.25rem] text-caption leading-relaxed ${
            room ? 'text-room-ink-2' : dusk ? 'text-dusk-ink-2' : 'text-ink-3'
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
