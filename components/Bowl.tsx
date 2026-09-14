/**
 * The singing bowl.
 *
 * Drawn, not photographed: a body in the warm gradient, a rim in flame, and
 * three rings that leave the rim when it is struck. `struck` is a count;
 * every increment remounts the group, which is what restarts the strike
 * animation from the beginning without a class having to be removed and
 * put back. The keyframes are in `globals.css` beside the rail's.
 *
 * `dim` is the bowl as it stays on the sitting when somebody sits by
 * themselves: the same object, faint, the thing that was struck.
 */
export default function Bowl({
  struck = 0,
  dim = false,
  className = '',
}: {
  struck?: number;
  dim?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 240 200"
      className={className}
      aria-hidden
      style={dim ? { opacity: 0.35 } : undefined}
    >
      <defs>
        <linearGradient id="bowl-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-glow)" />
          <stop offset="1" stopColor="var(--color-ember)" />
        </linearGradient>
        <radialGradient id="bowl-inner" cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor="var(--color-ember-soft)" />
          <stop offset="1" stopColor="var(--color-glow)" />
        </radialGradient>
      </defs>
      <g key={struck} className={struck > 0 ? 'bowl-struck' : undefined}>
        {[0, 1, 2].map((i) => (
          <ellipse
            key={i}
            className="bowl-ripple"
            style={{ animationDelay: `${i * 180}ms` }}
            cx="120"
            cy="78"
            rx="90"
            ry="27"
            fill="none"
            stroke="var(--color-glow)"
            strokeWidth="2"
          />
        ))}
        <g className="bowl-body">
          <ellipse cx="120" cy="178" rx="52" ry="7" fill="var(--color-ink)" opacity="0.12" />
          <path
            d="M32 78 C32 138, 70 174, 120 174 C170 174, 208 138, 208 78 Z"
            fill="url(#bowl-body)"
          />
          <ellipse
            cx="120"
            cy="78"
            rx="88"
            ry="24"
            fill="url(#bowl-inner)"
            stroke="var(--color-flame)"
            strokeWidth="3"
          />
          <ellipse cx="120" cy="80" rx="70" ry="15" fill="var(--color-ember)" opacity="0.35" />
        </g>
      </g>
    </svg>
  );
}
