/**
 * "Meditate with me", in the rounded face, at one of two sizes.
 *
 * `lg` is the welcome's, and it grows with the window: on a phone it is the
 * largest thing that fits the column, on a laptop it is the size of a title
 * on a page rather than a heading in an app. `sm` is the same words as a
 * mark in a corner, where the page is about something else.
 *
 * A span, so the caller decides what it is: the welcome screen puts it in
 * the `h2` the rail focuses, the signed-in home puts it in its own heading.
 */
export default function Wordmark({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  return (
    <span
      className={`font-display font-bold tracking-[-0.01em] text-ink ${
        size === 'lg'
          ? 'block text-[2.25rem] leading-[1.06] sm:text-[3.25rem] md:text-[4rem] lg:text-[4.5rem] xl:text-[5rem]'
          : 'text-xl leading-none'
      }`}
    >
      Meditate with me
    </span>
  );
}
