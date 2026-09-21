import Steps from './Steps';
import { QUIET_ROOM_SM, QUIET_SM } from './controls';

/**
 * The top of every question: Back on the left, the marks in the middle, and
 * — pinned over the rail by `Journey`, not drawn here — the dawn or dusk
 * toggle and the menu on the right. One row, 44px tall, on the same gutter
 * as the corner, so the three read as one bar and neither Back nor the marks
 * move while the questions change under them.
 *
 * Until 21 September 2026 the marks sat above each heading and Back at the
 * foot beside Next, except on the typed screens, which had Back in the
 * corner and the marks on the margin below it: three things at three
 * heights and two margins.
 */
export default function RailBar({
  onBack,
  backLabel = 'Back',
  step,
  steps,
  room = false,
}: {
  onBack?: () => void;
  backLabel?: string;
  step?: number;
  steps?: number;
  room?: boolean;
}) {
  if (!onBack && (step === undefined || steps === undefined)) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(0.875rem+env(safe-area-inset-top))] z-10 flex h-11 items-center px-4 sm:px-10 md:px-14 lg:px-20 xl:px-24">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className={`pointer-events-auto ${room ? QUIET_ROOM_SM : QUIET_SM}`}
        >
          {backLabel}
        </button>
      )}
      {step !== undefined && steps !== undefined && (
        <div className="absolute left-1/2 -translate-x-1/2">
          <Steps step={step} steps={steps} room={room} />
        </div>
      )}
    </div>
  );
}
