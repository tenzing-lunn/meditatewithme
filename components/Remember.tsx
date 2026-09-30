'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { cleanText, NAME_MAX, ORIGIN_MAX, type Profile } from '@/lib/label';
import { POND_CHOICE, WORD } from './controls';
import LineActions from './LineActions';
import LineField from './LineField';
import NameScreen from './NameScreen';
import OriginScreen from './OriginScreen';
import Rail from './Rail';
import Screen from './Screen';
import GoogleSignIn from './GoogleSignIn';
import Switch from './Switch';
import { askEmailUpdates } from './useEmailUpdates';

const STEPS = ['ask', 'name', 'place', 'email', 'code'] as const;
type Step = typeof STEPS[number];

/** The guest account flow uses the same rail and questions as the arrival. */
export default function Remember({ profile, onProfile, signIn, signInWithGoogle, verify, onSkip, suggestion }: {
  profile: Profile;
  onProfile: (patch: Partial<Profile>) => void;
  signIn: (email: string, name?: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
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
        if (screen === 'ask') return (
          <Screen current={current} align="center" title="Would you like to be remembered?" lede="Keep your practice and settings with you.">
            <div className="mx-auto mb-5 w-full max-w-xs">
              <div className="mb-4">
                <Switch checked={updates} onChange={setUpdates} label="Email me when the app is ready"
                  description="And now and then, news of the site." />
              </div>
              <GoogleSignIn signIn={() => { askEmailUpdates(updates); return signInWithGoogle(); }} disabled={busy} onBusyChange={setBusy} onError={setError} />
              <p className="mt-3 text-caption text-ink-3">You’ll stay signed in on this browser.</p>
              <p role="alert" className="mt-3 text-caption text-ember">{error}</p>
            </div>
            <div className="flex justify-center gap-6">
              <button type="button" disabled={busy} className={POND_CHOICE} onClick={() => move('name')}>Use email</button>
              <button type="button" disabled={busy} className={POND_CHOICE} onClick={onSkip}>Not now</button>
            </div>
          </Screen>
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
