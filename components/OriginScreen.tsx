'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { ORIGIN_MAX, composeLabel } from '@/lib/label';
import { searchPlaces } from '@/lib/places';
import LineActions from './LineActions';
import LineField from './LineField';
import Screen from './Screen';
import Switch from './Switch';
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
 * The screen is the line and nothing else until there is an answer; the
 * question is there only for a screen reader. Detected and confirmed, as
 * before, but inside the list: click the empty line and the connection's
 * guess is the one choice offered — *Lisbon, Portugal, near you* — so the
 * line stays a place to type and nobody's answer is a guess they did not
 * look at.
 *
 * Back is at the foot; Next and *Leave it out* are under the line, in the
 * same places as on the name (`LineActions`), and Next appears once
 * something is typed. So does the one switch that decides whether anyone
 * else ever sees it, under them: off by default, explained in a line. Before
 * that there is nothing for it to share.
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
  step,
  steps,
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
  step?: number;
  steps?: number;
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
    if (!typed) {
      return suggestion
        ? [{ key: 'near', value: suggestion, primary: suggestion, secondary: 'near you' }]
        : [];
    }
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
  }, [index, typed, suggestion]);

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
      bare
      title="Where are you sitting?"
      lede="Type a city or a country, then choose it. Or leave it out."
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
        <div>
          <div className="relative">
            <LineField
              id={id}
              label="Where you are"
              prompt="Enter your city"
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
              data-autofocus
              role="combobox"
              aria-expanded={listed}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={listed && active >= 0 ? `${listId}-${active}` : undefined}
              onKeyDown={onKeyDown}
              onFocus={() => setOpen(true)}
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
        </div>
        <LineActions
          typed={Boolean(typed)}
          active={current}
          prompt="Enter your city"
          onSkip={() => {
            onChange('', false);
            onSkip();
          }}
          skipLabel="Leave it out"
        >
          {typed && (
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
          )}
        </LineActions>
      </form>
    </Screen>
  );
}
