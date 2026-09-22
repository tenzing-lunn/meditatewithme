'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { NAME_MAX } from '@/lib/label';
import { FIELD, MENU_ITEM, PRIMARY, WORD } from './controls';
import type { AuthState } from './useAuth';
import type { SyncStatus } from './useSyncPreferences';

/**
 * The account offer, as a panel that drops from the control that opened it.
 *
 * WHY THIS IS NO LONGER A QUESTION IN THE BAND
 * It used to be. Pressing `Sign in` racked the camera to `open`, grew the band
 * from the strip above the flame to the whole frame, and put the form in the
 * middle of the picture — composed exactly like `How long` or `Which bell`, on
 * the reasoning that sign-in is the room asking you something.
 *
 * The reasoning was wrong, and watching it made that obvious. Three things
 * animate at once on that press: the band's height over 700ms, the copy's
 * transform over 600ms, and the camera's rack. Worse, the second chases the
 * first — `useFitToBand` measures `outer.clientHeight` through a
 * ResizeObserver, that height is mid-animation, so the transform's target
 * moves every frame and its 600ms ease-out restarts every frame against it.
 * The form does not arrive, it drifts in, overshoots where it looked like it
 * was going, and settles about a second and a half later. Tenzing's word for it
 * was bouncing, and that is exactly what a repeatedly-restarted ease-out looks
 * like.
 *
 * The setup questions are worth that expense because they *are* the room: you
 * came to sit and they are the last thing between you and sitting. An account
 * is not. It is the one thing on this screen that is about the product rather
 * than the practice, and the right object for it is the one everybody already
 * knows — a panel under the button you pressed, arriving in 160ms, taking no
 * part of the screen it does not need.
 *
 * Nothing here measures anything. Opacity and a six-pixel translate, both on
 * the compositor, on a box whose size no observer is watching. There is no
 * feedback loop left to bounce.
 *
 * WHY IT MAY SIT ON THE PHOTOGRAPH AT ALL
 * Same argument as `LIFTED` in `Room`: the rule is that *type* lives in the
 * dark band, because the rest of the frame is lit wax and nothing reads on it.
 * A panel is not type. It carries its own surface, so its contrast is measured
 * against that fill rather than against whatever the candle is doing behind it.
 *
 * ONE FLOW, TWO DOORS
 * `signInWithOtp` creates the user if the address is new and signs them in if
 * it is not, so there is no second form for people who already have an account
 * — only a quieter way into the same one, skipping the name.
 *
 * THE TWO DOORS ARE ON A MENU
 * Jonny asked (7 September 2026) for the top-right control to be a three-line
 * settings button that offers `Create account` and `Sign in` as two separate
 * choices, rather than one button labelled with the first and carrying the
 * second as a footnote. So the trigger is the icon, pressing it opens a
 * two-item menu, and each item opens the same panel at a different step —
 * name for a new account, address for an existing one. The flow behind the
 * panel is unchanged; only the door into it is. The panel hangs under the
 * trigger; the variant that stood it above an offer at the foot of the
 * ending went with that offer (22 September 2026), as did the labelled
 * button.
 *
 * The field, the button, the menu item and the word are `controls.ts`'s —
 * the same as everywhere else, not a second set at 44px and `ring-1`.
 */

/** name → email → code. Two questions and a confirmation, one at a time. */
type Step = 'name' | 'email' | 'code';

export default function Account({
  state,
  sync,
  signIn,
  verify,
  linkError,
  signOut,
  className,
}: {
  state: AuthState;
  sync: SyncStatus;
  /** Sends the email. `name` only lands if the address is new — see `useAuth`. */
  signIn: (email: string, name?: string) => Promise<string | null>;
  /** Six digits, checked here rather than in an inbox. */
  verify: (email: string, code: string) => Promise<string | null>;
  /**
   * Why the link they arrived on did not sign them in. See `readLinkError`.
   *
   * When it is set, this panel opens itself on the address step with the reason
   * showing. Somebody who followed a sign-in link and quietly did not get signed
   * in is owed both halves of that: what went wrong, and the one control that
   * fixes it, without having to find the button again.
   */
  linkError?: string | null;
  signOut: () => void;
  /** The trigger's style, handed in by the room. `LIFTED`, in practice. */
  className?: string;
}) {
  const [open, setOpen] = useState(Boolean(linkError));
  const [menuOpen, setMenuOpen] = useState(false);
  // Either surface is on screen. One flag, so switching from the menu to the
  // panel in the same press is a swap in place rather than a second entrance.
  const shown = open || menuOpen;
  // One frame behind `open`, so the panel has a state to transition *from*.
  const [entered, setEntered] = useState(false);

  /**
   * The flow's own state, which deliberately outlives the panel being open.
   *
   * Somebody who sends themselves a code, closes the panel to go and read the
   * email, and comes back should find the code box waiting — not the first
   * question again with their address thrown away. That only works because
   * this component stays mounted the whole time and only its panel is
   * conditional.
   */
  // Straight to the address on a failed link: they have plainly done the name
  // once already, and being asked it again is the product blaming them for
  // its own dead token.
  const [step, setStep] = useState<Step>(linkError ? 'email' : 'name');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(linkError ?? null);
  const [resent, setResent] = useState(false);

  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const firstItem = useRef<HTMLButtonElement>(null);
  const nameId = useId();
  const emailId = useId();
  const codeId = useId();

  /**
   * A link that failed *after* this component mounted.
   *
   * The three seeds above — `open`, `step`, `error` — only fire on mount, which
   * covers the ordinary arrival: the page loads with the reason already in the
   * URL. It does not cover a spent link opened into a tab that is already
   * sitting here, because that never reloads the page; it reaches `useAuth` as
   * a `hashchange` and arrives down here as a prop, late. See the note on
   * `onHashChange` there. Without this, the address bar is quietly tidied up
   * and the visitor is told nothing at all — which is the failure that started
   * this whole thread.
   */
  useEffect(() => {
    if (!linkError) return;
    setOpen(true);
    setStep('email');
    setError(linkError);
  }, [linkError]);

  // The animation's opening frame. `requestAnimationFrame` rather than a
  // microtask: the browser has to have laid the panel out at its start values
  // and painted once before the class swap can be a transition rather than a
  // jump.
  useEffect(() => {
    if (!shown) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [shown]);

  // Straight into the field. The panel is small and there is exactly one thing
  // to do in it, so making somebody find the box with a second click is a step
  // for nothing.
  useEffect(() => {
    if (open) firstField.current?.focus();
  }, [open, step]);

  // And straight onto the first choice, for the same reason.
  useEffect(() => {
    if (menuOpen) firstItem.current?.focus();
  }, [menuOpen]);

  // Escape, and a press anywhere else. Both are what a dropdown is expected to
  // do, and neither loses the flow — see the state note above.
  useEffect(() => {
    if (!shown) return;

    const close = () => {
      setOpen(false);
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      close();
      // Focus was on a menu item or in a field, and closing unmounts it —
      // without this, Escape dropped the keyboard on `<body>` and the next
      // Tab started the page over from the top. Found on 8 September 2026 by
      // pressing it. The pointer close below does not do this: somebody who
      // clicked elsewhere has already put their attention there.
      trigger.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close();
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [shown]);

  // Nothing to offer, or we don't know yet. Render nothing rather than a
  // control that flickers into existence under someone's cursor.
  if (state.status === 'loading' || state.status === 'unavailable') return null;

  // The room hands this to guests only — Home owns `Sign out` now. Kept as the
  // floor under that rather than as a route anybody takes: whatever else this
  // component does, it must never offer an account to somebody holding one.
  if (state.status === 'signed-in') {
    return (
      <button type="button" onClick={signOut} className={className}>
        Sign out
        <span className="sr-only"> ({state.user.email})</span>
        {sync === 'error' && ' · not saved'}
      </button>
    );
  }

  const send = async (withName: string | undefined) => {
    setBusy(true);
    setError(null);
    const message = await signIn(email.trim(), withName);
    setBusy(false);
    if (message) {
      setError(message);
      // The submit was disabled while busy and dropped the keyboard; the
      // thing to correct is the field.
      firstField.current?.focus();
      return false;
    }
    return true;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    if (step === 'name') {
      setError(null);
      setStep('email');
      return;
    }

    if (step === 'email') {
      if (await send(name.trim() || undefined)) {
        setCode('');
        setResent(false);
        setStep('code');
      }
      return;
    }

    setBusy(true);
    setError(null);
    const message = await verify(email.trim(), code);
    setBusy(false);
    // No success branch: `onAuthStateChange` fires and the app changes screen
    // out from underneath this form.
    if (message) {
      setError(message);
      firstField.current?.focus();
    }
  };

  /**
   * A door on the menu. `name` is `Create account`, `email` is `Sign in`.
   *
   * A code already sent is not thrown away by choosing a door again: somebody
   * who closed the panel to go and read their email comes back to the code box,
   * whichever item they press to get there — see the state note above.
   */
  const openAt = (at: Step) => {
    setError(null);
    if (step !== 'code') setStep(at);
    setMenuOpen(false);
    setOpen(true);
  };

  const heading =
    step === 'name'
      ? 'Create account.'
      : step === 'email'
        ? 'Your email.'
        : 'Check your email.';

  const hint =
    step === 'name'
      ? 'Every sitting is already logged on this device. An account carries it to your others.'
      : step === 'email'
        ? 'No password — we send you a code, and that is the whole of it.'
        : `We have sent a six-digit code to ${email.trim()}. The link in that email works too.`;

  return (
    <div ref={wrap} className="relative inline-block">
      <button
        ref={trigger}
        type="button"
        onClick={() => {
          // Pressing the icon while the panel is up closes it, the way it
          // closes a menu — the icon is the one control, whichever it shows.
          if (open) {
            setOpen(false);
            return;
          }
          setMenuOpen((v) => !v);
        }}
        aria-expanded={shown}
        aria-haspopup="menu"
        aria-label="Menu"
        className={className}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* The two doors. Same surface and same entrance as the panel below,
          because the panel is what replaces it when one is chosen.

          UNDER THE WORD ON A PHONE, NOT ON IT
          Hung straight off the trigger this sat across `Let’s begin.`, and
          at 95% the word showed through it. Measured at 390×844: the word is
          a 213px button centred in the frame, so it spans x 88–302, and the
          trigger is 44px wide against the right edge, so anything hung from
          it ends at x 378. To clear the word from there the menu would have
          to be under 76px wide, and `Sign in` alone, with its padding, is
          82 — no width does it, so the fix is vertical. The band is 39% of a
          portrait frame, its copy is centred in it, and the word is the
          first thing in that copy, so the word's bottom sits at about
          0.195×frame − 30px on every phone: 135px at 844, 156px at 956.
          `20dvh` from the trigger's box moves at the same rate, and lands
          the menu about 50px under the word whatever the height, where a
          pixel value clears the tallest phones or the smallest, not both.
          What it covers instead is the tagline, and the fill is opaque now
          for the same reason: a panel over small copy is a menu, a panel
          that display type shows through is two things in one place. From
          `sm` up there is room beside the word — at 640 wide the menu clears
          it by 7px — so there it hangs from the trigger as it did. */}
      {menuOpen && (
        <div className="absolute top-full right-0 z-20 mt-2">
          {/* `role="menu"` is a promise about the keyboard, and it was made
              without being kept: the two items were reachable by Tab and by
              nothing else, so anyone who took the ARIA at its word and pressed
              Down got silence. Two items is small enough that the honest fix
              is to keep the role and wire the keys, rather than drop to a
              group and lose the pattern people already know.

              Up and Down wrap, Home and End go to the ends, and Escape is
              handled by the panel's own close. `preventDefault` because Up and
              Down would otherwise scroll the page behind the menu. */}
          <div
            role="menu"
            aria-label="Account"
            onKeyDown={(e) => {
              const items = Array.from(
                e.currentTarget.querySelectorAll<HTMLButtonElement>(
                  '[role="menuitem"]',
                ),
              );
              if (items.length === 0) return;
              const at = items.indexOf(document.activeElement as HTMLButtonElement);
              const go = (i: number) => {
                e.preventDefault();
                items[(i + items.length) % items.length]?.focus();
              };
              if (e.key === 'ArrowDown') go(at + 1);
              else if (e.key === 'ArrowUp') go(at - 1);
              else if (e.key === 'Home') go(0);
              else if (e.key === 'End') go(items.length - 1);
            }}
            className={`rounded-control flex min-w-44 flex-col overflow-hidden border border-rule bg-surface shadow-menu py-1 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${
              entered ? 'translate-y-0 opacity-100' : '-translate-y-1.5 opacity-0'
            }`}
          >
            <button
              ref={firstItem}
              type="button"
              role="menuitem"
              onClick={() => openAt('name')}
              className={MENU_ITEM}
            >
              Create account
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openAt('email')}
              className={MENU_ITEM}
            >
              Sign in
            </button>
          </div>
        </div>
      )}

      {/*
        THE PANEL, IN TWO LAYERS.

        Placement on the outer, animation on the inner, so that the one cannot
        be clobbered by the transform that moves the other. It hangs off the
        trigger's right edge, which is what keeps it inside the frame's
        padding in the top corner.
      */}
      {open && (
        <div className="absolute top-full right-0 z-20 mt-2">
          <div
            role="dialog"
            aria-label={step === 'name' ? 'Create account' : 'Sign in'}
            // The whole animation, and all of it on the compositor. 160ms
            // because the panel has not far to come and nothing to explain;
            // anything slower and the press and the arrival stop feeling like
            // one event.
            className={`rounded-control w-[min(20rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain border border-rule bg-surface shadow-menu p-5 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${
              entered ? 'translate-y-0 opacity-100' : '-translate-y-1.5 opacity-0'
            }`}
          >
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <h2 className="font-display text-section font-bold leading-tight text-ink">
                {heading}
              </h2>

              {/* Reserved at three lines, which is the longest of the three
                  hints — the last one has an email address in it, and a long
                  address wraps to a third line. Sized for the worst case rather
                  than the common one so that the field and the button below
                  never move as the flow advances. The panel not moving is the
                  point of the whole rewrite; it would be a poor joke to fix the
                  entrance and leave it jumping between steps.

                  `break-words` because an address long enough to overflow a
                  280px line has no space in it to break at. */}
              <p className="min-h-[3.75rem] text-left text-caption leading-relaxed break-words text-ink-3">
                {hint}
              </p>

              {step === 'name' && (
                <>
                  <label
                    htmlFor={nameId}
                    className="text-center text-caption text-ink-2"
                  >
                    What should we call you?
                  </label>
                  <input
                    id={nameId}
                    ref={firstField}
                    name="name"
                    type="text"
                    required
                    maxLength={NAME_MAX}
                    /* NOT `given-name`, WHICH IS WHAT SUMMONED THE DROPDOWN.
                       That attribute tells the browser this is a field on an
                       address form, so Chrome offered the saved profile — a
                       white panel with `Manage Addresses…` in it, landing over
                       the question and the button below it. Nothing here wants
                       a profile: this is what to call you, typed once, and it
                       is not your legal first name any more than it is your
                       postcode. The email field below keeps `email`, where
                       autofill is a genuine kindness. */
                    autoComplete="off"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className={`${FIELD} text-center`}
                  />
                </>
              )}

              {step === 'email' && (
                <>
                  <label
                    htmlFor={emailId}
                    className="text-center text-caption text-ink-2"
                  >
                    {name.trim()
                      ? `And your email, ${name.trim()}?`
                      : 'Your email address'}
                  </label>
                  <input
                    id={emailId}
                    ref={firstField}
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    spellCheck={false}
                    autoCapitalize="none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`${FIELD} text-center`}
                  />
                </>
              )}

              {step === 'code' && (
                <>
                  <label
                    htmlFor={codeId}
                    className="text-center text-caption text-ink-2"
                  >
                    The code
                  </label>
                  <input
                    id={codeId}
                    ref={firstField}
                    name="code"
                    // `one-time-code` is what lets a phone offer the digits
                    // from the notification instead of making somebody switch
                    // apps to read them.
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    spellCheck={false}
                    autoCapitalize="none"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={code}
                    // Stripped rather than validated: a pasted code arrives
                    // with spaces about as often as it doesn't, and rejecting
                    // it is a worse answer than accepting it.
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    // NO PLACEHOLDER. Six middots at 0.4em tracking are not a
                    // hint that six digits go here, they are six specks
                    // scattered across an empty box with a caret among them —
                    // it reads as a rendering fault. The label above says what
                    // the box is for and `maxLength` says how long it is.
                    //
                    // The indent cancels the trailing letter-space, which
                    // otherwise pushes centred tracked digits off to the left.
                    style={{ textIndent: '0.4em' }}
                    className={`${FIELD} text-center text-clock tracking-[0.4em] tabular-nums`}
                  />
                </>
              )}

              {/* Busy keeps the label and adds the ellipsis, so the button
                  says what it is still doing rather than swapping words. */}
              <button type="submit" disabled={busy} className={`${PRIMARY} w-full`}>
                {step === 'name'
                  ? 'Continue'
                  : step === 'email'
                    ? 'Send me a code'
                    : 'Confirm and enter'}
                {busy && '…'}
              </button>

              {/* Reserved too, for the same reason the hint is. */}
              <p
                role="alert"
                className="min-h-4 text-center text-caption text-ember"
              >
                {error ?? (resent ? 'Sent again.' : '')}
              </p>

              <div className="flex justify-center">
                {step === 'name' && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStep('email');
                    }}
                    className={WORD}
                  >
                    I already have one
                  </button>
                )}

                {step === 'email' && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStep('name');
                    }}
                    className={WORD}
                  >
                    Back
                  </button>
                )}

                {step === 'code' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      if (await send(name.trim() || undefined)) setResent(true);
                    }}
                    className={WORD}
                  >
                    Send it again
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
