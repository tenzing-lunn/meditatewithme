'use client';

import { useEffect, useId, useState } from 'react';
import { ORIGIN_MAX, composeLabel } from '@/lib/label';
import Screen from './Screen';
import Switch from './Switch';
import { FIELD } from './controls';

/**
 * "Where are you sitting?"
 *
 * Detected and confirmed. The edge's guess is put in the field when it
 * arrives and the person corrects it, keeps it, or leaves it blank. Under
 * the field is the one switch that decides whether anyone else ever sees
 * the answer: off by default, and explained in a line.
 */
export default function OriginScreen({
  current,
  name,
  value,
  suggestion,
  share,
  onChange,
  onBack,
  onNext,
  onSkip,
}: {
  current: boolean;
  name: string | null;
  value: string | null;
  /** "Lisbon, Portugal" from the connection, or null. */
  suggestion: string | null;
  share: boolean;
  onChange: (origin: string, share: boolean) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value ?? '');
  const [touched, setTouched] = useState(value !== null);
  const [shareDraft, setShareDraft] = useState(share);

  // The suggestion arrives after the screen has mounted, from a fetch. It
  // fills the field only while nothing has been typed into it.
  useEffect(() => {
    if (!touched && draft === '' && suggestion) setDraft(suggestion);
  }, [suggestion, touched, draft]);

  const label = composeLabel(name, draft) ?? 'you';

  const commit = () => {
    onChange(draft, shareDraft);
    onNext();
  };

  return (
    <Screen
      current={current}
      title="Where are you sitting?"
      lede={
        suggestion && !touched
          ? 'It looks like this. Change it if not, or leave it out.'
          : 'A town, a country, wherever you are. Or leave it out.'
      }
      onBack={onBack}
      onNext={commit}
      onSkip={() => {
        onChange('', false);
        onSkip();
      }}
      skipLabel="Leave it out"
    >
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}
      >
        <div>
          <label htmlFor={id} className="sr-only">
            Where you are
          </label>
          <input
            id={id}
            type="text"
            autoComplete="off"
            maxLength={ORIGIN_MAX}
            value={draft}
            onChange={(e) => {
              setTouched(true);
              setDraft(e.target.value);
            }}
            placeholder="Lisbon, Portugal"
            className={FIELD}
          />
        </div>
        <Switch
          checked={shareDraft}
          onChange={setShareDraft}
          label={
            <>
              Let others see <em className="not-italic text-ink">{label}</em> while
              you sit with them
            </>
          }
          description="Only while you sit with others, and only while this is on. Nothing is kept on our side until you say yes."
        />
      </form>
    </Screen>
  );
}
