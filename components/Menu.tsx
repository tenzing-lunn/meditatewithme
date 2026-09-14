'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ICON } from './controls';

export interface MenuItem {
  label: string;
  onSelect: () => void;
}

const ITEM =
  'min-h-11 px-5 text-left text-[0.9375rem] font-semibold text-ink-2 transition-colors hover:bg-ember-soft hover:text-ember focus-visible:bg-ember-soft focus-visible:text-ember focus-visible:outline-none';

/**
 * The three lines in the top corner, and what they open.
 *
 * `role="menu"` is a promise about the keyboard, kept: Up and Down wrap,
 * Home and End go to the ends, Escape closes and puts focus back on the
 * lines, and a press anywhere else closes it. The account's own menu for
 * guests (`Account.tsx`) does the same; this one is for somebody signed in,
 * whose items are their own pages rather than two doors into an account.
 */
export default function Menu({ items, label = 'Menu' }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative inline-block">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={id}
        aria-label={label}
        className={ICON}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 z-20 mt-2">
          <div
            id={id}
            role="menu"
            aria-label={label}
            onKeyDown={(e) => {
              const els = Array.from(
                e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
              );
              if (els.length === 0) return;
              const at = els.indexOf(document.activeElement as HTMLButtonElement);
              const go = (i: number) => {
                e.preventDefault();
                els[(i + els.length) % els.length]?.focus();
              };
              if (e.key === 'ArrowDown') go(at + 1);
              else if (e.key === 'ArrowUp') go(at - 1);
              else if (e.key === 'Home') go(0);
              else if (e.key === 'End') go(els.length - 1);
            }}
            className={`flex min-w-48 flex-col overflow-hidden rounded-control border border-rule bg-surface py-1 shadow-[0_12px_32px_-12px_rgb(59_42_29_/_0.35)] transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${
              entered ? 'translate-y-0 opacity-100' : '-translate-y-1.5 opacity-0'
            }`}
          >
            {items.map((item, i) => (
              <button
                key={item.label}
                ref={i === 0 ? first : undefined}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={ITEM}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
