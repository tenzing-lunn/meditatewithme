'use client';

import { useId, useState } from 'react';
import { NAME_MAX } from '@/lib/label';
import LineActions from './LineActions';
import LineField from './LineField';
import Screen from './Screen';

/**
 * "What should we call you?"
 *
 * Optional. A first name is what other people would see beside your light
 * if you later choose to be seen; nothing here is sent anywhere until then.
 * The screen is the line and nothing else: it draws itself out as *Enter
 * your name* types on it, and the question is there only for a screen
 * reader. *Back* is at the foot, where every question has it; *Skip* is
 * under the line from the start, and *Next*
 * appears right under it once something is typed, because until then there
 * is nothing to go on with. The field has focus the moment the screen
 * arrives, so a name can be typed without clicking the line. Enter is Next,
 * and Escape is still Back.
 *
 * The line always arrives empty, so the prompt is what is seen first. A name
 * typed and then walked back to is still there; a name stored from an
 * earlier visit is not put back on the line.
 */
export default function NameScreen({
  current,
  onChange,
  onBack,
  onNext,
  onSkip,
  step,
  steps,
}: {
  current: boolean;
  onChange: (name: string) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  step?: number;
  steps?: number;
}) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const typed = draft.trim() !== '';

  const commit = () => {
    onChange(draft);
    onNext();
  };

  return (
    <Screen
      current={current}
      bare
      title="What should we call you?"
      lede="A first name is plenty. It is how you would be known if you sit with others and choose to be seen."
      onBack={onBack}
      step={step}
      steps={steps}
    >
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          if (typed) commit();
        }}
      >
        <LineField
          id={id}
          label="Your name"
          prompt="Enter your name"
          value={draft}
          onChange={setDraft}
          active={current}
          maxLength={NAME_MAX}
          autoCapitalize="words"
          enterKeyHint="next"
          data-autofocus
        />
        <LineActions
          typed={typed}
          active={current}
          prompt="Enter your name"
          onSkip={() => {
            onChange('');
            onSkip();
          }}
        />
      </form>
    </Screen>
  );
}
