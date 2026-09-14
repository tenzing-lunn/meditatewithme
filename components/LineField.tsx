'use client';

import type { InputHTMLAttributes } from 'react';
import { LINE } from './controls';
import { useTypedOut } from './useTypedOut';

type InputRest = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'value' | 'onChange' | 'placeholder' | 'className' | 'type'
>;

/**
 * A typed answer on the rail: a line, and a prompt that writes itself on it.
 *
 * The prompt — *Enter your name* — types out when the screen arrives, with
 * a caret after it, so an empty line already looks like the place to type.
 * It is drawn over the input rather than being its `placeholder`, because a
 * placeholder cannot be animated; the input keeps a real label for anyone
 * who cannot see the line, and the drawing is hidden from them. Clicks go
 * straight through it to the field.
 *
 * The prompt is ink-3 at 60%, well lighter than the ink an answer is typed
 * in, so the two are never mistaken for each other. That is below the 4.5:1
 * body text needs, on purpose: it is a hint that vanishes on the first key,
 * the field's name is its label, and `scripts/contrast.mjs` holds it at the
 * lighter floor it was chosen at so it cannot drift lighter still.
 */
export default function LineField({
  id,
  label,
  prompt,
  value,
  onChange,
  active,
  ...rest
}: {
  id: string;
  /** What a screen reader calls the field. */
  label: string;
  prompt: string;
  value: string;
  onChange: (value: string) => void;
  /** The screen is in the frame: type the prompt out. */
  active: boolean;
} & InputRest) {
  const typed = useTypedOut(prompt, active);

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={LINE}
        {...rest}
      />
      {value === '' && (
        <span
          aria-hidden
          className="line-prompt pointer-events-none absolute inset-x-0 top-0 bottom-[2px] flex items-center pt-1 pb-2 text-[1.5rem] leading-normal text-ink-3/60 sm:text-[1.75rem]"
        >
          {typed}
          <span className="type-caret ml-0.5 inline-block h-[1.1em] w-0.5 rounded-full bg-ember" />
        </span>
      )}
    </div>
  );
}
