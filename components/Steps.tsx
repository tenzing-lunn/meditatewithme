/**
 * Where you are on the rail.
 *
 * One short mark per question, the one you are on lit and a little longer.
 * The rail is six questions at most and the bowl at the end of them, but
 * until now it gave no sign of that: every screen looked like it might be
 * the first of any number, which is the difference between answering a few
 * things and filling in a form of unknown length. It counts the screens the
 * visitor will actually see, so a returning guest whose name and place are
 * already known is told the truth about their own shorter rail.
 *
 * Decorative in the page and spoken in words to anyone who is not looking at
 * it, which is the one thing a row of dashes cannot do on its own.
 */
export default function Steps({
  step,
  steps,
  room = false,
}: {
  /** 1-based. A guest's doors are the front page and have none. */
  step: number;
  steps: number;
  room?: boolean;
}) {
  if (step < 1 || steps < 2) return null;
  return (
    <div className="flex items-center gap-1.5">
      <span className="sr-only">
        Question {step} of {steps}
      </span>
      {Array.from({ length: steps }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={`h-[3px] rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none ${
            i + 1 === step
              ? `w-5 ${room ? 'bg-room-action' : 'bg-ember'}`
              : `w-2.5 ${room ? 'bg-room-ink-2/35' : 'bg-ink-3/30'}`
          }`}
        />
      ))}
    </div>
  );
}
