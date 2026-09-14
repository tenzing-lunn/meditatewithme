'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { ORIGIN_MAX, composeLabel } from '@/lib/label';
import { searchPlaces } from '@/lib/places';
import LineField from './LineField';
import Screen from './Screen';
import Switch from './Switch';
import { WORD } from './controls';
import { usePlaces } from './usePlaces';

interface Option {
  key: string;
  /** What is kept when this is chosen. */
  value: string;
  primary: string;
  secondary: string | null;
}

/**
 * "Where are you sitting?"
 *
 * Typed, then chosen. The letters search a list of towns and countries in
 * the browser (`usePlaces`, `lib/places.ts`) and the matches open under the
 * line; the arrows move through them and Enter takes one, so what is kept is
 * a real place spelled one way. A town too small for the list is still an
 * answer: the last choice is always to keep it as typed.
 *
 * Detected and confirmed, as before, but no longer by putting the guess in
 * the field. While the line is empty the guess sits under it as one word to
 * tap — *It looks like Lisbon, Portugal* — so the line stays a place to
 * type, and nobody's answer is a connection's guess they did not look at.
 *
 * Under it all is the one switch that decides whether anyone else ever sees
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
  const listId = `${id}-places`;
  const [draft, setDraft] = useState(value ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [shareDraft, setShareDraft] = useState(share);
  const index = usePlaces(current);

  const typed = draft.trim();
  const options = useMemo<Option[]>(() => {
    if (!typed) return [];
    const found = index ? searchPlaces(index, typed, 5) : [];
    const list: Option[] = found.map((p) => ({
      key: `place:${p.label}`,
      value: p.label,
      primary: p.city ?? p.country,
      secondary: p.city ? p.country : null,
    }));
    const lower = typed.toLowerCase();
    if (!found.some((p) => p.label.toLowerCase() === lower)) {
      list.push({
        key: 'typed',
        value: typed,
        primary: `Keep “${typed}”`,
        secondary: 'as you typed it',
      });
    }
    return list;
  }, [index, typed]);

  const listed = open && options.length > 0;

  const choose = (o: Option) => {
    setDraft(o.value);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (options.length === 0) return;
      e.preventDefault();
      const n = options.length;
      const down = e.key === 'ArrowDown';
      setOpen(true);
      setActive((a) => (a < 0 ? (down ? 0 : n - 1) : (a + (down ? 1 : -1) + n) % n));
    } else if (e.key === 'Enter' && listed && options[active]) {
      // The first Enter takes the choice; the next one is Next.
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === 'Escape' && listed) {
      // Closes the list, and is not Back while there is a list to close:
      // Journey skips an Escape whose default has been prevented.
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  };

  const label = composeLabel(name, draft) ?? 'you';

  const commit = () => {
    onChange(draft, shareDraft);
    onNext();
  };

  return (
    <Screen
      current={current}
      title="Where are you sitting?"
      lede="Type a town or a country, then choose it. Or leave it out."
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
          <div className="relative">
            <LineField
              id={id}
              label="Where you are"
              prompt="Enter your town"
              value={draft}
              onChange={(v) => {
                setDraft(v);
                setOpen(true);
                setActive(v.trim() ? 0 : -1);
              }}
              active={current}
              maxLength={ORIGIN_MAX}
              autoCapitalize="words"
              enterKeyHint="next"
              role="combobox"
              aria-expanded={listed}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={listed && active >= 0 ? `${listId}-${active}` : undefined}
              onKeyDown={onKeyDown}
              onBlur={() => {
                setOpen(false);
                setActive(-1);
              }}
            />
            {listed && (
              <ul
                id={listId}
                role="listbox"
                aria-label="Places"
                className="absolute inset-x-0 top-full z-20 mt-2 flex flex-col overflow-hidden rounded-control border border-rule bg-surface py-1 shadow-[0_12px_32px_-12px_rgb(59_42_29_/_0.35)]"
              >
                {options.map((o, i) => (
                  <li
                    key={o.key}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    // Keep the field focused, or the list closes before the click lands.
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseMove={() => setActive(i)}
                    onClick={() => choose(o)}
                    className={`flex min-h-11 cursor-pointer flex-wrap items-baseline gap-x-2 px-4 py-2.5 text-base ${
                      i === active ? 'bg-ember-soft text-ember' : 'text-ink'
                    }`}
                  >
                    <span className="font-semibold">{o.primary}</span>
                    {o.secondary && (
                      <span className={i === active ? 'text-ember' : 'text-ink-3'}>
                        {o.secondary}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {suggestion && !typed && (
            <p className="mt-2 flex flex-wrap items-center text-[0.9375rem] text-ink-3">
              It looks like
              <button type="button" onClick={() => setDraft(suggestion)} className={WORD}>
                {suggestion}
              </button>
            </p>
          )}
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
