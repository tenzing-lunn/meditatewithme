'use client';

/**
 * The candle, in CSS.
 *
 * A stand-in. The real thing is a licensed seamless video loop the client is
 * sourcing (candle plus two alternatives), and it slots in behind exactly this
 * interface — a burn fraction in, a glowing thing out.
 *
 * WHOSE CANDLE THIS IS
 * Not yours. It is lit at the top of every hour whether anybody is watching,
 * and everyone worldwide sees it at the same height in the same second. That
 * shared state is what makes the hour mean something without the site ever
 * having to refuse somebody a sitting.
 *
 * So it burns down rather than switching on: `burn` runs 0 at the top of the
 * hour to nearly 1 just before the next one replaces it. Arrive at :50 and you
 * are handed a stub — you can see you came late, which is the honest version of
 * what a countdown was trying to say.
 *
 * Two animations on deliberately mismatched periods (11s and 7s). A single
 * period reads as a pulse; two that never quite line up read as something
 * alive. Both are disabled under prefers-reduced-motion — a meditation site is
 * the last place to ignore that setting.
 */

const FULL_HEIGHT_REM = 7;
const STUB_HEIGHT_REM = 1.75;

export default function Candle({ burn }: { burn: number }) {
  const clamped = Math.min(1, Math.max(0, burn));
  const bodyHeight = FULL_HEIGHT_REM - clamped * (FULL_HEIGHT_REM - STUB_HEIGHT_REM);

  // The glow weakens a little as the candle goes down, but never much — a
  // guttering stub still lights a room, and the page should not get gloomy
  // towards :59.
  const glowStrength = 1 - clamped * 0.3;

  return (
    <div
      aria-hidden
      className="relative flex h-52 w-52 items-end justify-center pb-6 sm:h-64 sm:w-64 sm:pb-8"
    >
      <div
        className="candle-glow absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 58%, var(--color-ember-soft) 0%, transparent 62%)',
          opacity: glowStrength,
        }}
      />

      {/* Anchored to the base, so the candle shortens from the top as it burns
          rather than shrinking towards its middle. */}
      <div className="relative flex flex-col items-center">
        {/*
          Flame. A teardrop: three rounded corners and one square one, turned
          45° so the square corner becomes the point.

          The rotation lives on this wrapper and the flicker animates the child,
          so the two transforms never compose. Doing both on one element was
          what produced an early version's flame floating clear of the wick — a
          rotation about an off-centre origin translates as well as turns.
        */}
        <div
          className="flex items-end justify-center"
          style={{
            width: '2.1rem',
            height: '2.1rem',
            // Rotate first, then stretch in the parent's frame — transforms
            // apply right to left.
            transform: 'scaleY(1.32) rotate(45deg)',
            marginBottom: '0.55rem',
          }}
        >
          <div
            className="candle-flame"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '0 50% 50% 50%',
              background:
                'radial-gradient(circle at 62% 62%, #fff6e2 0%, #f0b25e 34%, var(--color-ember) 72%)',
              boxShadow: '0 0 1.6rem 0.2rem var(--color-ember-soft)',
            }}
          />
        </div>

        <div
          className="bg-ink-3 -mt-1 w-px rounded-full"
          style={{ height: '0.5rem', opacity: 0.75 }}
        />

        {/*
          Body. Deliberately plain — the flame is the subject. Transitions on
          height so the hourly reset reads as a new candle being set down rather
          than the old one snapping back.

          The outline is doing real work, not decoration: the wax is only a
          shade off the paper background, so without an edge the candle's
          silhouette disappears and a full candle reads as a stub. How much wax
          is left is the one thing this component exists to communicate.
        */}
        <div
          className="border-rule mt-0.5 rounded-t-[3px] rounded-b-sm border"
          style={{
            width: '3.25rem',
            height: `${bodyHeight}rem`,
            transition: 'height 1.2s ease-out',
            background:
              'linear-gradient(180deg, var(--color-surface) 0%, var(--color-ember-soft) 100%)',
            boxShadow: '0 1px 2px rgb(0 0 0 / 0.04)',
          }}
        />
      </div>
    </div>
  );
}
