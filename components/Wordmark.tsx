/**
 * "Meditate with me", in the rounded face, at one of two sizes.
 *
 * A span, so the caller decides what it is: the welcome screen puts it in
 * the `h2` the rail focuses, the signed-in home puts it in its own heading.
 */
export default function Wordmark({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  return (
    <span
      className={`font-display font-bold tracking-[-0.01em] text-ink ${
        size === 'lg'
          ? 'text-[2.25rem] leading-[1.1] sm:text-[3rem]'
          : 'text-xl leading-none'
      }`}
    >
      Meditate with me
    </span>
  );
}
