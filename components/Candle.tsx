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

const FULL_HEIGHT_REM = 9.5;
const STUB_HEIGHT_REM = 2.25;

export default function Candle({
  burn,
  firstHere = false,
}: {
  burn: number;
  /** A quiet acknowledgement, not a state change in the shared hour candle. */
  firstHere?: boolean;
}) {
  const clamped = Math.min(1, Math.max(0, burn));
  const bodyHeight = FULL_HEIGHT_REM - clamped * (FULL_HEIGHT_REM - STUB_HEIGHT_REM);

  // The glow weakens a little as the candle goes down, but never much — a
  // guttering stub still lights a room, and the page should not get gloomy
  // towards :59.
  const glowStrength = 1 - clamped * 0.3;

  return (
    <div
      aria-hidden
      className={`relative flex h-72 w-72 items-end justify-center pb-4 sm:h-[22rem] sm:w-[22rem] sm:pb-6 ${
        firstHere ? 'candle-first-here' : ''
      }`}
    >
      {/* Two layers, because one radial gradient reads as a disc sitting
          behind the candle rather than as light in a room. The wide one is the
          room; the tight one is the halo immediately around the flame. */}
      <div
        className="candle-glow absolute -inset-16"
        style={{
          background:
            'radial-gradient(ellipse 60% 45% at 50% 46%, var(--color-ember-soft) 0%, transparent 70%)',
          opacity: glowStrength * 0.9,
        }}
      />
      <div
        className="candle-glow pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle 22% at 50% 34%, var(--color-ember-soft) 0%, transparent 100%)',
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
            width: '2.6rem',
            height: '2.6rem',
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
              // The last stop fades to transparent rather than stopping on a
              // colour. A gradient that still has opacity where the border
              // radius cuts it gives the flame a hard edge, and nothing with a
              // hard edge looks like fire.
              background:
                'radial-gradient(circle at 62% 62%, #fffdf4 0%, #ffd89a 26%, #f0a94e 52%, rgb(167 99 30 / 0.55) 78%, transparent 100%)',
              boxShadow:
                '0 0 2.2rem 0.5rem var(--color-ember-soft), 0 0 0.9rem 0.1rem rgb(240 169 78 / 0.35)',
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
          className="mt-0.5 rounded-t-[4px] rounded-b-sm"
          style={{
            width: '3.4rem',
            height: `${bodyHeight}rem`,
            transition: 'height 1.2s ease-out',
            // Lit from the flame: brightest along the top two centimetres and
            // falling away below. The old version ran surface -> ember-soft,
            // which in dark mode is one near-black into another and left the
            // silhouette invisible — and how much wax is left is the one thing
            // this component exists to say.
            background:
              'linear-gradient(180deg, var(--color-wax-top) 0%, var(--color-wax-bottom) 62%, var(--color-wax-bottom) 100%)',
            // A rim rather than a border: the light lands on the top edge and
            // the sides catch a little of it, so the shape is described by
            // where the light falls instead of by an outline drawn around it.
            boxShadow:
              'inset 0 1px 0 0 var(--color-wax-edge), inset 1px 0 0 0 rgb(255 255 255 / 0.06), inset -1px 0 0 0 rgb(0 0 0 / 0.18), 0 2px 10px rgb(0 0 0 / 0.25)',
          }}
        />
      </div>
    </div>
  );
}
