'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { NAME_MAX } from '@/lib/label';
import { FIELD, PRIMARY, WORD } from './controls';
import type { AuthState } from './useAuth';
import type { SyncStatus } from './useSyncPreferences';
import GoogleSignIn from './GoogleSignIn';
import Switch from './Switch';
import { askEmailUpdates } from './useEmailUpdates';

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
 * SIGN IN IS THE DOOR, AND CREATING ONE IS ITS FOOTNOTE
 * The corner says *Sign in*, the way web apps do, and opens the panel on the
 * address straight away (30 September 2026; it was a three-line menu with
 * the two as separate items before). *Don't have an account? Create one* at
 * its foot turns the same panel to the name first. Google or an email code
 * creates the account on first use either way, so nobody is stuck on the
 * wrong one of the two.
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
  signInWithGoogle,
  verify,
  linkError,
  signOut,
  className,
}: {
  state: AuthState;
  sync: SyncStatus;
  /** Sends the email. `name` only lands if the address is new — see `useAuth`. */
  signIn: (email: string, name?: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
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
  const shown = open;
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
  // Sign in first; the name is only asked of somebody creating an account.
  const [step, setStep] = useState<Step>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(linkError ?? null);
  const [resent, setResent] = useState(false);
  const [updates, setUpdates] = useState(false);

  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
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

  // Escape, and a press anywhere else. Both are what a dropdown is expected to
  // do, and neither loses the flow — see the state note above.
  useEffect(() => {
    if (!shown) return;

    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      close();
      // Focus was in a field, and closing unmounts it —
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
    askEmailUpdates(updates);
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

  // On the address step after the name: the create-account path, still.
  const creating = name.trim() !== '';

  const heading =
    step === 'name'
      ? 'Create account.'
      : step === 'email'
        ? creating ? 'Create account.' : 'Sign in.'
        : 'Check your email.';

  const hint =
    step === 'name'
      ? 'Every sitting is already logged on this device. An account carries it to your others.'
      : step === 'email'
        ? 'You’ll stay signed in on this browser.'
        : `We have sent a six-digit code to ${email.trim()}. The link in that email works too.`;

  return (
    <div ref={wrap} className="relative inline-block">
      <button
        ref={trigger}
        type="button"
        onClick={() => {
          setError(null);
          setOpen((v) => !v);
        }}
        aria-expanded={shown}
        aria-haspopup="dialog"
        className={className}
      >
        Sign in
      </button>

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
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <h2 className="font-display text-section font-bold leading-tight text-ink">
                {heading}
              </h2>

              {/* The email step's hint sits under its button instead. */}
              {step !== 'email' && (
                <p className="text-caption leading-relaxed break-words text-ink-3">{hint}</p>
              )}

              {step !== 'code' && <>
                <Switch checked={updates} onChange={setUpdates} label="Email me when the app is ready"
                  description="And now and then, news of the site." />
                <GoogleSignIn signIn={() => { askEmailUpdates(updates); return signInWithGoogle(); }} disabled={busy} onError={setError} onBusyChange={setBusy} />
                <div aria-hidden className="flex items-center gap-3 text-caption text-ink-3">
                  <span className="h-px flex-1 bg-rule" />
                  or
                  <span className="h-px flex-1 bg-rule" />
                </div>
              </>}

              {step === 'name' && (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={nameId}
                    className="text-caption text-ink-3"
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
                    className={FIELD}
                  />
                </div>
              )}

              {step === 'email' && (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={emailId}
                    className="text-caption text-ink-3"
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
                    className={FIELD}
                  />
                </div>
              )}

              {step === 'code' && (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={codeId}
                    className="text-caption text-ink-3"
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
                </div>
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

              {step === 'email' && <p className="-mt-2 text-caption text-ink-3">{hint}</p>}

              {(error || resent) && (
                <p role="alert" className={`text-caption ${error ? 'text-ember' : 'text-ink-3'}`}>
                  {error ?? 'Sent again.'}
                </p>
              )}

              <div className="flex border-t border-rule pt-2">
                {step === 'name' && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setName('');
                      setStep('email');
                    }}
                    className={`${WORD} -ml-2`}
                  >
                    Already have one? Sign in
                  </button>
                )}

                {step === 'email' && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStep('name');
                    }}
                    className={`${WORD} -ml-2`}
                  >
                    {creating ? 'Back' : 'Don’t have an account? Create one'}
                  </button>
                )}

                {step === 'code' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      if (await send(name.trim() || undefined)) setResent(true);
                    }}
                    className={`${WORD} -ml-2`}
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
