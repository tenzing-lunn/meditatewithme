/**
 * The mark and the name.
 *
 * The mark is the pond in miniature: one stone inside two rings. The name is
 * set in the serif, lower case, because it is a sentence somebody says
 * ("meditate with me") rather than a logo shouting it. While you sit, only
 * the mark is shown, faint, so it does not ask to be looked at.
 */
export function Mark({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      width={(size * 26) / 20}
      height={size}
      viewBox="0 0 26 20"
      fill="none"
      className={className}
    >
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeOpacity=".45" />
      <circle cx="10" cy="10" r="9.5" stroke="currentColor" strokeOpacity=".2" />
      <ellipse cx="10" cy="10" rx="3.2" ry="2.5" fill="currentColor" transform="rotate(-12 10 10)" />
    </svg>
  );
}

export default function Brand({ word = true, className = '' }: { word?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-ink ${word ? '' : 'opacity-55'} ${className}`}>
      <Mark />
      {word ? (
        <span className="font-display text-masthead leading-none tracking-[-0.01em]">meditate with me</span>
      ) : (
        <span className="sr-only">meditate with me</span>
      )}
    </span>
  );
}
