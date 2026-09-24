/**
 * "Meditate with me", in the rounded face, at one of two sizes.
 *
 * `lg` is the front page's, and it grows with the window: on a phone it is the
 * largest thing that fits the column, on a laptop it is the size of a title
 * on a page rather than a heading in an app. `sm` is the same words as a
 * mark in a corner, where the page is about something else.
 *
 * A span, so the caller decides what it is: a guest's doors put it in
 * the `h2` the rail focuses, the signed-in home puts it in its own heading.
 */
export default function Wordmark({
  size = 'lg',
  room = false,
}: {
  size?: 'lg' | 'sm';
  /** In the room, dawn or dusk, over the earth on Home. */
  room?: boolean;
}) {
  return (
    <span
      className={`font-display font-bold tracking-[-0.01em] ${room ? 'text-room-ink' : 'text-ink'} ${
        size === 'lg'
          ? 'block text-wordmark leading-[1.06] sm:text-wordmark-sm md:text-wordmark-md lg:text-wordmark-lg xl:text-wordmark-xl'
          : 'text-masthead leading-none'
      }`}
    >
      Meditate with me
    </span>
  );
}
