'use client';

import { useId, useState } from 'react';
import { NAME_MAX } from '@/lib/label';
import LineField from './LineField';
import Screen from './Screen';

/**
 * "What should we call you?"
 *
 * Optional. A first name is what other people would see beside your light
 * if you later choose to be seen; nothing here is sent anywhere until then.
 * The answer goes on a line with *Enter your name* typing itself out on it.
 * Enter is Next, because a name is typed and then you move on.
 */
export default function NameScreen({
  current,
  value,
  onChange,
  onBack,
  onNext,
  onSkip,
}: {
  current: boolean;
  value: string | null;
  onChange: (name: string) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value ?? '');

  const commit = () => {
    onChange(draft);
    onNext();
  };

  return (
    <Screen
      current={current}
      title="What should we call you?"
      lede="A first name is plenty. It is how you would be known if you sit with others and choose to be seen."
      onBack={onBack}
      onNext={commit}
      nextDisabled={draft.trim() === ''}
      onSkip={() => {
        onChange('');
        onSkip();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) commit();
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
        />
      </form>
    </Screen>
  );
}
