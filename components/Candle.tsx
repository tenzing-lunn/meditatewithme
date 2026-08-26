'use client';

/**
 * The focus point, in CSS.
 *
 * A stand-in. The real thing is a licensed seamless video loop the client is
 * sourcing (candle plus two alternatives), and it slots in behind exactly this
 * interface — `lit` in, a glowing thing out. Building it in CSS now means step
 * 03 doesn't wait on an asset that may take weeks, and it costs nothing to
 * throw away.
 *
 * Two animations rather than one, on deliberately mismatched periods (11s and
 * 7s). A single period reads as a pulse; two that never quite line up read as
 * something alive. Both are disabled under prefers-reduced-motion — a
 * meditation site is the last place to ignore that setting.
 */

export default function Candle({ lit }: { lit: boolean }) {
  return (
    <div
      aria-hidden
      className="relative flex h-64 w-64 items-center justify-center sm:h-80 sm:w-80"
    >
      {/* Ambient glow. Present but very faint when unlit, so the space the
          candle will occupy is already visible and nothing jumps on Begin. */}
      <div
        className={lit ? 'candle-glow absolute inset-0' : 'absolute inset-0'}
        style={{
          background:
            'radial-gradient(circle at 50% 46%, var(--color-ember-soft) 0%, transparent 62%)',
          opacity: lit ? undefined : 0.28,
        }}
      />

      <div className="relative flex flex-col items-center">
        {/*
          Flame. A teardrop: three rounded corners and one square one, turned
          45° so the square corner becomes the point at the top.

          The rotation sits on this wrapper and the flicker animates the child,
          so the two transforms never have to compose. Doing both on one element
          is what produced the first version's floating flame — a rotation about
          an off-centre origin translates as well as turns.
        */}
        <div
          className="flex items-end justify-center"
          style={{
            width: '2.1rem',
            height: '2.1rem',
            // Rotate first, then stretch in the parent's frame — transforms
            // apply right to left. Rotating a square 45° gives a symmetric
            // teardrop; the scale is what makes it read as a flame.
            transform: 'scaleY(1.32) rotate(45deg)',
            marginBottom: '0.55rem',
          }}
        >
          <div
            className={lit ? 'candle-flame' : ''}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '0 50% 50% 50%',
              background: lit
                ? 'radial-gradient(circle at 62% 62%, #fff6e2 0%, #f0b25e 34%, var(--color-ember) 72%)'
                : 'transparent',
              opacity: lit ? 1 : 0,
              transition: 'opacity 1.6s ease-in-out',
              boxShadow: lit
                ? '0 0 1.6rem 0.2rem var(--color-ember-soft)'
                : 'none',
            }}
          />
        </div>

        {/* Wick. The one part that stays put whether lit or not — it is what
            makes the unlit state read as "not yet" rather than "empty". */}
        <div
          className="bg-ink-3 -mt-1 w-px rounded-full"
          style={{ height: '0.5rem', opacity: 0.75 }}
        />

        {/* Body. Deliberately plain: the flame is the subject. */}
        <div
          className="mt-0.5 rounded-t-[3px] rounded-b-sm"
          style={{
            width: '3.25rem',
            height: '6.5rem',
            background:
              'linear-gradient(180deg, var(--color-surface) 0%, var(--color-ember-soft) 100%)',
            boxShadow: 'inset 0 1px 0 var(--color-rule)',
          }}
        />
      </div>
    </div>
  );
}
