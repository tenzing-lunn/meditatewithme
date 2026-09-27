import { ICON } from './controls';

/**
 * Back to the two ways in, from the corner: a chevron in the menu's own
 * square, so it reads as a sibling of the three lines on the other side.
 * Tenzing, 27 September 2026: once a door was chosen there was no way back
 * to the other one.
 */
export default function BackChevron({ onBack, label = 'Back to the two ways in' }: { onBack: () => void; label?: string }) {
  return (
    <button type="button" onClick={onBack} aria-label={label} title={label} className={ICON}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M11 3.5 5.5 9l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
