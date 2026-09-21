/**
 * The controls, in one place.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE
 * Type can be quiet. A control cannot. Every control has to be bounded,
 * coloured or underlined — a control whose only affordance is being a word is
 * not a quiet control, it is an invisible one. That was learned the expensive
 * way in the first room, where five bare grey words were all the same
 * mistake made five times because there was nowhere for the answer to live.
 *
 * WHICH ONE TO USE
 *   `PRIMARY`  the one thing this screen is for: Next, Join a session, Sit
 *              again. Ember fill, white text, a pill. One per screen.
 *   `QUIET`    the other thing: Back, Skip, Sound, End. A rule outline that
 *              warms to ember on hover, so it reads as a sibling of the
 *              primary rather than a rival to it.
 *   `CHIP`     one of a set you pick from: a bell, a bed, a length. `CHIP_ON`
 *              is the picked one, ember on ember-soft.
 *   `FIELD`    something you type into.
 *
 * A fifth style needs a reason that is not "this one felt different".
 *
 * WHY `ember` IS SCARCE
 * `ember` is the colour of the primary action and it is worth more while it
 * stays scarce. It returns on hover, where it means "this one, now" rather
 * than "this one, always".
 */

/**
 * The focus ring, once. Every keyboard stop draws the same two-pixel ember
 * ring, offset from the control by the page colour. Anything that changes it
 * here changes it everywhere, which is the only way a ring stays one ring.
 * On the dusk ground the offset is dusk: see `FOCUS_DUSK`.
 */
export const FOCUS =
  'focus-visible:ring-ember focus-visible:ring-offset-paper focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none';

export const FOCUS_DUSK =
  'focus-visible:ring-flame focus-visible:ring-offset-dusk focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none';

const BUTTON_SHAPE =
  'inline-flex items-center justify-center gap-2 rounded-action font-semibold transition-[background-color,border-color,color,filter,transform] duration-200 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none';

const BUTTON = `${BUTTON_SHAPE} min-h-12 px-7 text-[0.9375rem]`;

export const PRIMARY = `${BUTTON} bg-ember text-white hover:brightness-90 ${FOCUS}`;

/**
 * The foot of a question — Back, Skip, Next — a size down.
 *
 * The question and its answer are what a screen is for, so the way on is
 * set smaller than both: 38px to look at. The `::after` reaches 3px above
 * and below, so what a finger lands on is still 44px.
 */
const BUTTON_SM = `${BUTTON_SHAPE} relative min-h-[2.375rem] px-5 text-[0.875rem] after:absolute after:inset-x-0 after:inset-y-[-3px] after:content-['']`;

export const PRIMARY_SM = `${BUTTON_SM} bg-ember text-white hover:brightness-90 ${FOCUS}`;

export const QUIET_SM = `${BUTTON_SM} border border-rule text-ink-2 hover:border-ember hover:text-ember ${FOCUS}`;

export const QUIET = `${BUTTON} border border-rule text-ink-2 hover:border-ember hover:text-ember ${FOCUS}`;


export const CHIP = `inline-flex min-h-11 items-center justify-center rounded-control border border-rule bg-surface px-4 text-[0.9375rem] font-semibold text-ink-2 transition-colors duration-200 hover:border-ember hover:text-ember motion-reduce:transition-none ${FOCUS}`;

export const CHIP_ON = 'border-ember bg-ember-soft text-ember';

export const FIELD = `min-h-12 w-full rounded-control border border-rule bg-surface px-4 text-base text-ink placeholder:text-ink-3 transition-colors duration-200 hover:border-ember focus-visible:border-ember motion-reduce:transition-none ${FOCUS}`;

/**
 * A quiet word: Skip, Change, Leave it blank. Bounded by an underline, and
 * 44px tall so the thing you hit is bigger than the thing you read.
 */
const WORD_SHAPE = `inline-flex min-h-11 items-center px-2 font-semibold text-ink-2 underline decoration-rule underline-offset-4 transition-colors duration-200 hover:text-ember hover:decoration-ember motion-reduce:transition-none ${FOCUS}`;

export const WORD = `${WORD_SHAPE} text-[0.9375rem]`;

/** The same word in the foot, beside the small buttons. */
export const WORD_SM = `${WORD_SHAPE} text-[0.875rem]`;

/**
 * Something typed on the rail: a line, not a box.
 *
 * A question asks for a word or two, so the field is where the words go
 * rather than a container for them — a 2px line under large type. The line
 * is ink-3 at 80%, which clears the 3:1 a control's boundary needs on paper
 * (`scripts/contrast.mjs`); it darkens under the pointer and turns ember
 * with the caret in it. That ember line is the focus indicator, so no ring
 * is drawn round a field that has no box to ring. `line-field` is what the
 * typed-out prompt's caret listens to (`globals.css`).
 */
export const LINE = 'line-field peer h-14 w-full rounded-none border-b-2 border-transparent bg-transparent px-0 pt-1 pb-2 text-[1.5rem] leading-normal text-ink outline-none sm:text-[1.75rem]';

/** The line itself, drawn under a `LINE` as its own element so it can be drawn out. */
export const LINE_RULE = 'pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left bg-ink-3/80 transition-colors duration-200 peer-hover:bg-ink-2 peer-focus:bg-ember motion-reduce:transition-none';

/** The three-line trigger in the top corner. */
export const ICON = `inline-flex size-11 items-center justify-center rounded-action border border-rule bg-surface text-ink-2 transition-colors duration-200 hover:border-ember hover:text-ember motion-reduce:transition-none ${FOCUS}`;

/**
 * THE ROOM'S CONTROLS
 * From the choice to the ending the ground is the room, dawn or dusk
 * (`useRoom`), so these are drawn in the `room-*` tokens and follow it: at
 * dusk the action is flame with dusk type, at dawn it is ember with white —
 * the paper controls above, exactly. Settings is always dawn.
 */
export const FOCUS_ROOM =
  'focus-visible:ring-room-action focus-visible:ring-offset-room focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none';

/** The corner triggers in the room: the menu, and dawn or dusk. */
export const ICON_ROOM = `inline-flex size-11 items-center justify-center rounded-action border border-room-edge bg-room/40 text-room-ink backdrop-blur-sm transition-colors duration-200 hover:border-room-action hover:text-room-action motion-reduce:transition-none ${FOCUS_ROOM}`;

export const PRIMARY_ROOM = `${BUTTON} bg-room-action text-room-action-ink hover:brightness-110 ${FOCUS_ROOM}`;

export const PRIMARY_ROOM_SM = `${BUTTON_SM} bg-room-action text-room-action-ink hover:brightness-110 ${FOCUS_ROOM}`;

export const QUIET_ROOM = `${BUTTON} border border-room-edge text-room-ink hover:border-room-action hover:text-room-action ${FOCUS_ROOM}`;

export const QUIET_ROOM_SM = `${BUTTON_SM} border border-room-edge text-room-ink hover:border-room-action hover:text-room-action ${FOCUS_ROOM}`;

export const WORD_ROOM = `inline-flex min-h-11 items-center px-2 text-[0.9375rem] font-semibold text-room-ink-2 underline decoration-room-edge underline-offset-4 transition-colors duration-200 hover:text-room-action hover:decoration-room-action motion-reduce:transition-none ${FOCUS_ROOM}`;
