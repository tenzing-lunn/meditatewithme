'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { cleanText, NAME_MAX, ORIGIN_MAX, type Profile } from '@/lib/label';
import { FOCUS, QUIET, WORD } from './controls';
import LineActions from './LineActions';
import LineField from './LineField';
import NameScreen from './NameScreen';
import OriginScreen from './OriginScreen';
import Rail from './Rail';
import Screen from './Screen';
import GoogleSignIn, { AppleSignIn } from './GoogleSignIn';
import { askEmailUpdates } from './useEmailUpdates';

const STEPS = ['ask', 'name', 'place', 'email', 'code'] as const;
type Step = typeof STEPS[number];

/** The guest account flow uses the same rail and questions as the arrival. */
export default function Remember({ profile, onProfile, signIn, signInWithGoogle, signInWithApple, verify, onSkip, suggestion }: {
  profile: Profile;
  onProfile: (patch: Partial<Profile>) => void;
  signIn: (email: string, name?: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signInWithApple: () => Promise<string | null>;
  verify: (email: string, code: string) => Promise<string | null>;
  onSkip: () => void;
  suggestion?: string | null;
}) {
  const [step, setStep] = useState<Step>('ask');
  const [dir, setDir] = useState<1 | -1>(1);
  const [name, setName] = useState(profile.name ?? '');
  const [place, setPlace] = useState(profile.origin ?? '');
  const [share, setShare] = useState(profile.share);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [updates, setUpdates] = useState(false);
  const pending = useRef(false);
  const id = useId();

  const move = (next: Step) => {
    if (pending.current) return;
    setDir(STEPS.indexOf(next) < STEPS.indexOf(step) ? -1 : 1);
    setError(null);
    setResent(false);
    setStep(next);
  };
  const back = () => move(STEPS[Math.max(0, STEPS.indexOf(step) - 1)]!);
  const send = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    setResent(false);
    askEmailUpdates(updates);
    try {
      const message = await signIn(email.trim(), cleanText(name, NAME_MAX) ?? undefined);
      if (message) setError(message);
      else {
        // Save before authentication can replace Journey with Home.
        onProfile({ name: cleanText(name, NAME_MAX), origin: cleanText(place, ORIGIN_MAX), share });
        setCode('');
        if (step === 'code') setResent(true);
        else { setDir(1); setStep('code'); }
      }
    } catch {
      setError('Could not reach the sign-in service. Please try again.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    if (step === 'email') await send();
    else if (step === 'code') {
      if (!/^[0-9]{6}$/.test(code)) return;
      pending.current = true;
      setBusy(true);
      setError(null);
      try {
        const message = await verify(email.trim(), code);
        if (message) setError(message);
        // Entry opens Home only when authentication confirms the session.
      } catch {
        setError('Could not reach the sign-in service. Please try again.');
      } finally {
        pending.current = false;
        setBusy(false);
      }
    }
  };

  return (
    <div className="h-full bg-paper" onKeyDown={(e) => {
      if (e.key === 'Escape' && !e.defaultPrevented && step !== 'ask' && !busy) {
        e.preventDefault(); back();
      }
    }}>
      <Rail screens={STEPS} at={step} dir={dir} render={(screen, current) => {
        const position = STEPS.indexOf(screen);
        const progress = { step: position, steps: 4 };
        // The ask is the shape every sign-in screen worth copying shares: the
        // ways in stacked full width at the foot, where a thumb is on a phone,
        // one of them filled; the opt-in a small box under them; and the way
        // out in the corner rather than set level with the ways in.
        if (screen === 'ask') return (
          <section className="relative flex h-full w-full flex-col overflow-y-auto px-6 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-10">
            <div className="absolute top-[calc(0.875rem+env(safe-area-inset-top))] right-4 sm:right-10">
              <button type="button" disabled={busy} className={WORD} onClick={onSkip}>Not now</button>
            </div>
            <div className="mx-auto flex w-full max-w-sm flex-1 flex-col sm:justify-center">
              <div className="flex flex-1 flex-col justify-center sm:flex-none">
                <h2 tabIndex={-1} className="font-display text-question font-bold leading-[1.15] text-ink text-balance outline-none sm:text-question-sm">
                  Keep your practice
                </h2>
                <p className="mt-3 text-body leading-relaxed text-ink-2">Your sittings and sounds, on any device.</p>
              </div>
              <div className="sm:mt-10">
                <GoogleSignIn primary signIn={() => { askEmailUpdates(updates); return signInWithGoogle(); }} disabled={busy} onBusyChange={setBusy} onError={setError} />
                <div className="mt-3 empty:hidden">
                  <AppleSignIn signIn={() => { askEmailUpdates(updates); return signInWithApple(); }} disabled={busy} onBusyChange={setBusy} onError={setError} />
                </div>
                <button type="button" disabled={busy} className={`${QUIET} mt-3 w-full`} onClick={() => move('name')}>Continue with email</button>
                <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-caption text-ink-2">
                  <input type="checkbox" checked={updates} onChange={(e) => setUpdates(e.target.checked)}
                    className={`size-5 shrink-0 cursor-pointer rounded accent-ember ${FOCUS}`} />
                  Email me when the app launches
                </label>
                <p role="alert" className="min-h-4 text-caption text-ember">{error}</p>
              </div>
            </div>
          </section>
        );
        if (screen === 'name') return (
          <NameScreen current={current} onChange={setName} onBack={back} onNext={() => move('place')}
            onSkip={() => { setName(''); move('place'); }} {...progress} />
        );
        if (screen === 'place') return (
          <OriginScreen current={current} name={name || null} value={place || null} suggestion={suggestion ?? null}
            share={share ?? false} onChange={(value, shared) => { setPlace(value); setShare(shared); }}
            onBack={back} onNext={() => move('email')} onSkip={() => { setPlace(''); setShare(false); move('email'); }} {...progress} />
        );
        const confirming = screen === 'code';
        const prompt = confirming ? 'Enter your code' : 'Enter your email';
        return (
          <Screen current={current} bare title={confirming ? 'Check your email.' : 'What is your email?'}
            onBack={busy ? undefined : back} {...progress}>
            <form onSubmit={submit} className="relative">
              <LineField id={`${id}-${screen}`} label={confirming ? 'Confirmation code' : 'Your email'} prompt={prompt}
                active={current} type={confirming ? 'text' : 'email'} value={confirming ? code : email}
                onChange={(value) => { setError(null); if (confirming) setCode(value.replace(/\D/g, '').slice(0, 6)); else setEmail(value); }}
                autoComplete={confirming ? 'one-time-code' : 'email'} autoCapitalize="none" required disabled={busy}
                inputMode={confirming ? 'numeric' : 'email'} maxLength={confirming ? 6 : undefined}
                pattern={confirming ? '[0-9]{6}' : undefined} enterKeyHint="go" data-autofocus
                aria-describedby={confirming ? `${id}-hint` : undefined} />
              <LineActions typed={confirming ? code.length === 6 : email.trim() !== ''} active={current} prompt={prompt}
                onSkip={onSkip} skipLabel="Not now" disabled={busy}
                nextLabel={`${confirming ? 'Confirm and enter' : 'Send me a code'}${busy ? '…' : ''}`}>
                {confirming && <p id={`${id}-hint`} className="break-words text-caption leading-relaxed text-ink-3">
                  Enter the six-digit code sent to {email.trim()}. The link in that email works too.
                </p>}
                <p role="alert" className="mt-3 min-h-4 text-caption text-ember">{error ?? (resent ? 'Sent again.' : '')}</p>
                {confirming && <button type="button" disabled={busy} className={`mt-3 -ml-2 ${WORD}`} onClick={() => void send()}>Send it again</button>}
              </LineActions>
            </form>
          </Screen>
        );
      }} />
    </div>
  );
}
