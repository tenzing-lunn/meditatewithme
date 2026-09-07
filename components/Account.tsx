'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
 * part of the photograph it does not need.
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
 * THE TWO DOORS ARE NOW ON A MENU
 * Jonny asked (7 September 2026) for the top-right control to be a three-line
 * settings button that offers `Create account` and `Sign in` as two separate
 * choices, rather than one button labelled with the first and carrying the
 * second as a footnote. So with `menu` set the trigger is the icon, pressing it
 * opens a two-item menu, and each item opens the same panel at a different
 * step — name for a new account, address for an existing one. The flow behind
 * the panel is unchanged; only the door into it is.
 */

/**
 * Which way the panel opens.
 *
 * `down` hangs it under the control at the top right of the landing. `up`
 * stands it above the offer at the foot of the frame after a sitting, where
 * down would be off the bottom of the window.
 */
type Drop = 'down' | 'up';

/** name → email → code. Two questions and a confirmation, one at a time. */
type Step = 'name' | 'email' | 'code';

const FIELD =
  'min-h-11 w-full rounded-control border border-white/25 bg-transparent px-4 text-center text-sm text-white placeholder:text-white/35 focus-visible:border-ember focus-visible:ring-1 focus-visible:ring-ember focus-visible:outline-none';

const SUBMIT =
  'min-h-11 w-full rounded-control border border-ember px-6 text-sm text-ember transition-colors duration-300 hover:bg-ember hover:text-white focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c1410] focus-visible:outline-none disabled:opacity-50';

/** One choice on the menu. Full width of it, lit on hover, nothing else. */
const ITEM =
  'min-h-11 px-5 text-left text-sm text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-none';

/** The quiet word under the button. Bounded by an underline, never bare. */
const FOOT =
  'text-xs text-white/50 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white/80 hover:decoration-white/60 focus-visible:ring-1 focus-visible:ring-ember focus-visible:outline-none';

export default function Account({
  state,
  sync,
  signIn,
  verify,
  linkError,
  signOut,
  className,
  drop = 'down',
  menu = false,
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
  drop?: Drop;
  /**
   * The three-line trigger and the two-item menu, instead of a labelled
   * button. Only ever `down`: it lives in the top corner of the landing.
   */
  menu?: boolean;
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
      if (e.key === 'Escape') close();
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
    if (message) setError(message);
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
      {menu ? (
        <button
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
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={className}
        >
          Create account
        </button>
      )}

      {/* The two doors. Same surface and same entrance as the panel below,
          because the panel is what replaces it in place when one is chosen. */}
      {menuOpen && (
        <div className="absolute top-full right-0 z-20 mt-2">
          <div
            role="menu"
            aria-label="Account"
            className={`rounded-control flex min-w-44 flex-col overflow-hidden border border-white/20 bg-[#1c1410]/95 py-1 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${
              entered ? 'translate-y-0 opacity-100' : '-translate-y-1.5 opacity-0'
            }`}
          >
            <button
              ref={firstItem}
              type="button"
              role="menuitem"
              onClick={() => openAt('name')}
              className={ITEM}
            >
              Create account
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openAt('email')}
              className={ITEM}
            >
              Sign in
            </button>
          </div>
        </div>
      )}

      {/*
        THE PANEL, IN TWO LAYERS.

        Placement on the outer, animation on the inner, so that the outer's own
        `-translate-x-1/2` cannot be clobbered by the transform that moves it.

        `down` hangs off the trigger's right edge, which is what keeps it inside
        the frame's padding in the top corner. `up` centres on the trigger
        instead: that one is centred at the foot of the frame, and
        right-aligning a 320px panel to a 180px button there puts its left edge
        off the side of a phone.
      */}
      {open && (
        <div
          className={`absolute z-20 ${
            drop === 'down'
              ? 'top-full right-0 mt-2'
              : 'bottom-full left-1/2 mb-2 -translate-x-1/2'
          }`}
        >
          <div
            role="dialog"
            aria-label={step === 'name' ? 'Create account' : 'Sign in'}
            // The whole animation, and all of it on the compositor. 160ms
            // because the panel has not far to come and nothing to explain;
            // anything slower and the press and the arrival stop feeling like
            // one event.
            className={`rounded-control w-[min(20rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-6rem)] overflow-y-auto border border-white/20 bg-[#1c1410]/95 p-5 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${
              entered
                ? 'translate-y-0 opacity-100'
                : `opacity-0 ${drop === 'down' ? '-translate-y-1.5' : 'translate-y-1.5'}`
            }`}
          >
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <h2 className="font-display text-2xl leading-tight text-white">
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
              <p className="min-h-[3.75rem] text-left text-xs leading-relaxed break-words text-white/60">
                {hint}
              </p>

              {step === 'name' && (
                <>
                  <label
                    htmlFor={nameId}
                    className="text-center text-sm text-white/70"
                  >
                    What should we call you?
                  </label>
                  <input
                    id={nameId}
                    ref={firstField}
                    type="text"
                    required
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
                    className={FIELD}
                  />
                </>
              )}

              {step === 'email' && (
                <>
                  <label
                    htmlFor={emailId}
                    className="text-center text-sm text-white/70"
                  >
                    {name.trim()
                      ? `And your email, ${name.trim()}?`
                      : 'Your email address'}
                  </label>
                  <input
                    id={emailId}
                    ref={firstField}
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={FIELD}
                  />
                </>
              )}

              {step === 'code' && (
                <>
                  <label
                    htmlFor={codeId}
                    className="text-center text-sm text-white/70"
                  >
                    The code
                  </label>
                  <input
                    id={codeId}
                    ref={firstField}
                    // `one-time-code` is what lets a phone offer the digits
                    // from the notification instead of making somebody switch
                    // apps to read them.
                    autoComplete="one-time-code"
                    inputMode="numeric"
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
                    className={`${FIELD} text-xl tracking-[0.4em] tabular-nums`}
                  />
                </>
              )}

              <button type="submit" disabled={busy} className={SUBMIT}>
                {step === 'name'
                  ? 'Continue'
                  : step === 'email'
                    ? busy
                      ? 'Sending'
                      : 'Send me a code'
                    : busy
                      ? 'Checking'
                      : 'Confirm and enter'}
              </button>

              {/* Reserved too, for the same reason the hint is. */}
              <p
                role="alert"
                className="min-h-4 text-center text-xs text-white/80"
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
                    className={FOOT}
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
                    className={FOOT}
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
                    className={FOOT}
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
