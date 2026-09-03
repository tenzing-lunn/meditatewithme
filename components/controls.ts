/**
 * Secondary controls, in one place.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE
 * Type can be quiet. A control cannot. Every control has to be bounded,
 * coloured or underlined — a control whose only affordance is being a word is
 * not a quiet control, it is an invisible one.
 *
 * That was learned the expensive way. `Change` on Home, `Sign in` on the
 * landing, `Sign out`, `Hide your practice` and `Back` were all written
 * independently as bare `text-ink-3` words, each one reasonable on its own and
 * each one sitting directly beneath or beside grey type of almost exactly the
 * same weight. None of them read as pressable. They were all the same mistake,
 * made five times, because there was nowhere for the answer to live.
 *
 * WHICH OF THE TWO TO USE
 * There are two, and the background decides:
 *
 *   `QUIET`   here. Flat dark ground — Home, `/world`, and the dark band in
 *             the room where the composition supplies its own contrast.
 *   `LIFTED`  in `Room.tsx`. Over the photograph, where nothing is readable
 *             without a surface of its own and the fill has to be warm enough
 *             to belong to the picture. It carries its own measurement note.
 *
 * If a new control is on the photograph it takes `LIFTED`, and if it is not it
 * takes `QUIET`. A third style needs a reason that is not "this one felt
 * different".
 *
 * WHY `rule` AND NOT `ember`
 * `ember` is the colour of the primary action — `Begin.`, `Sit`, `Send me a
 * link` — and it is worth more while it stays scarce. A `rule` outline is the
 * same value as the dividers on Home, so a secondary control reads as a quiet
 * sibling of the primary one rather than a rival to it. Ember returns on hover,
 * where it means "this one, now" rather than "this one, always".
 */
export const QUIET =
  'text-ink-2 border-rule hover:border-ember hover:text-ember rounded-action focus-visible:ring-ember focus-visible:ring-offset-paper inline-flex min-h-11 items-center gap-2 border px-4 text-xs tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none';
