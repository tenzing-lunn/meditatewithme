'use client';

/**
 * The candle, in CSS.
 *
 * A stand-in. The real thing is a licensed seamless video loop the client is
 * sourcing, and it slots in behind exactly this interface — a burn fraction in,
 * a glowing thing out.
 *
 * WHOSE CANDLE THIS IS
 * Not yours. It is lit at the top of every hour whether anybody is watching,
 * and everyone worldwide sees it at the same height in the same second. That
 * shared state is what makes the hour mean something without the site ever
 * having to refuse somebody a sitting. So it burns down rather than switching
 * on: `burn` runs 0 at the top of the hour to nearly 1 just before the next one
 * replaces it. Arrive at :50 and you are handed a stub.
 *
 * WHAT MAKES IT READ AS A CANDLE
 * Four things, and the first version had none of them, which is why it looked
 * like a battery with a flame hovering over it:
 *
 *   1. The melted pool. A candle seen from the front is not a rectangle — the
 *      top is an ellipse of liquid wax, lit from directly above, with a rim
 *      where it has not melted. It is the single most identifying feature and
 *      it is what a flat top edge throws away.
 *   2. Cylinder shading. The barrel curves away at both sides, so the fill runs
 *      dark → lit → dark across its width. A flat fill is a rectangle no matter
 *      what colour it is.
 *   3. The flame sits IN the wick, not above it. A gap between them reads as
 *      two stickers rather than one object, which is exactly what it was.
 *   4. Light goes somewhere. It falls down the top of the wax and pools on the
 *      surface underneath. The earlier version had a stray blurred ellipse
 *      floating free of the candle, which read as a smudge on the screen.
 *
 * Two animations on deliberately mismatched periods (11s and 7s). A single
 * period reads as a pulse; two that never quite line up read as something
 * alive. Both are disabled under prefers-reduced-motion — a meditation site is
 * the last place to ignore that setting.
 */

const FULL_HEIGHT_REM = 9.5;
const STUB_HEIGHT_REM = 2.25;
const BODY_WIDTH_REM = 3.6;

/** Height of the melted cup at the top. Half of it sits above the barrel. */
const POOL_HEIGHT_REM = 0.9;

export default function Candle({
  burn,
  firstHere = false,
}: {
  burn: number;
  /** A quiet acknowledgement, not a state change in the shared hour candle. */
  firstHere?: boolean;
}) {
  const clamped = Math.min(1, Math.max(0, burn));
  const bodyHeight =
    FULL_HEIGHT_REM - clamped * (FULL_HEIGHT_REM - STUB_HEIGHT_REM);

  // The glow weakens a little as the candle goes down, but never much — a
  // guttering stub still lights a room, and the page should not get gloomy
  // towards :59.
  const glowStrength = 1 - clamped * 0.3;

  return (
    <div
      aria-hidden
      className={`relative flex h-64 w-72 items-end justify-center pb-6 sm:h-[19rem] sm:w-[22rem] sm:pb-8 ${
        firstHere ? 'candle-first-here' : ''
      }`}
    >
      {/* Two layers. One radial gradient reads as a disc sitting behind the
          candle; the wide one is the room, the tight one the halo around the
          flame itself. */}
      <div
        className="candle-glow absolute -inset-12"
        style={{
          background:
            'radial-gradient(ellipse 58% 42% at 50% 40%, var(--color-ember-soft) 0%, transparent 72%)',
          opacity: glowStrength * 0.85,
        }}
      />

      {/* Anchored to the base, so the candle shortens from the top as it burns
          rather than shrinking towards its middle. */}
      <div className="relative flex flex-col items-center">
        <div
          className="relative"
          style={{
            width: `${BODY_WIDTH_REM}rem`,
            height: `${bodyHeight}rem`,
            transition: 'height 1.2s ease-out',
            borderRadius: '2px 2px 4px 4px',
            // Two stacked backgrounds, drawn front to back. The first is the
            // flame's light falling down the wax; the second is the barrel,
            // dark at both edges where the cylinder turns away from us.
            background: [
              'linear-gradient(180deg, rgb(255 213 150 / 0.34) 0%, rgb(255 213 150 / 0.08) 20%, transparent 46%)',
              'linear-gradient(90deg, var(--color-wax-dark) 0%, var(--color-wax-mid) 15%, var(--color-wax-lit) 43%, var(--color-wax-mid) 76%, var(--color-wax-dark) 100%)',
            ].join(','),
            boxShadow:
              'inset 0 -1px 0 0 rgb(255 255 255 / 0.07), 0 6px 18px -6px rgb(0 0 0 / 0.35)',
          }}
        >
          {/* The melted pool. Sits half above the barrel so the top edge of the
              candle is an ellipse rather than a straight line. */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `-${POOL_HEIGHT_REM / 2}rem`,
              height: `${POOL_HEIGHT_REM}rem`,
              borderRadius: '50%',
              background:
                'radial-gradient(ellipse 55% 70% at 50% 42%, var(--color-wax-pool) 0%, var(--color-wax-lit) 55%, var(--color-wax-rim) 100%)',
              boxShadow: 'inset 0 -1px 2px rgb(0 0 0 / 0.22)',
            }}
          />

          {/* Wick. Its base is inside the pool, which is what stops the flame
              looking like it is hovering. */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: `-${POOL_HEIGHT_REM / 2 + 0.4}rem`,
              width: '2px',
              height: '0.62rem',
              borderRadius: '1px',
              background:
                'linear-gradient(180deg, #4a3524 0%, #6b4a2c 60%, var(--color-wax-rim) 100%)',
            }}
          />

          {/* Flame. The wrapper positions and the child animates, so the
              rotation and the flicker never compose — doing both on one element
              is what floated an early version clear of the wick, because a
              rotation about an off-centre origin translates as well as turns. */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ bottom: '100%', marginBottom: '-0.3rem' }}
          >
            <div
              className="flex items-end justify-center"
              style={{
                width: '2.3rem',
                height: '2.3rem',
                transform: 'scaleY(1.36) rotate(45deg)',
              }}
            >
              <div
                className="candle-flame relative"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '0 50% 50% 50%',
                  // The last stop fades to transparent rather than stopping on
                  // a colour. A gradient still carrying opacity where the
                  // border radius cuts it gives the flame a hard edge, and
                  // nothing with a hard edge looks like fire.
                  background:
                    'radial-gradient(circle at 62% 62%, #fffef8 0%, #ffe6b4 18%, #ffc871 40%, #ef9f43 62%, rgb(167 99 30 / 0.5) 82%, transparent 100%)',
                  // Equal x and y for the same reason: a shadow offset off the
                  // anti-diagonal would drift sideways once rotated.
                  boxShadow:
                    '0 0 2.4rem 0.6rem var(--color-ember-soft), 0 0 1rem 0.1rem rgb(240 169 78 / 0.4)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Where the light lands. Anchored to the base of the candle rather
            than floating in the container, which is the difference between a
            lit surface and a smudge. */}
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: '-0.7rem',
            width: `${BODY_WIDTH_REM * 3}rem`,
            height: '1.5rem',
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse at center, var(--color-ember-soft) 0%, transparent 70%)',
            opacity: glowStrength * 0.75,
          }}
        />
      </div>
    </div>
  );
}
