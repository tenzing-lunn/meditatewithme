'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { serverNow, syncClock } from '@/lib/clock';
import { candleBurn, hourKey, hourStart, nextHourStart } from '@/lib/session';
import {
  endsAt as computeEndsAt,
  hasEnded,
  mmss,
  monotonicEndAtFromServerTarget,
  nextSharedBellAt,
  remainingMs,
} from '@/lib/timer';
import type { Session, UserPreferences } from '@/lib/types';
import { currentStreak, summarise, type PracticeEntry } from '@/lib/practice';
import CandleScene, { REVEAL_EASE, REVEAL_MS, type ScenePhase } from './CandleScene';
import Practice from './Practice';
import SessionSetup, { type Step } from './SessionSetup';
import Account from './Account';
import { FOCUS, QUIET } from './controls';
import { localTime } from '@/lib/format';
import SoundMixer from './SoundMixer';
import type { MASTER_KEY, TrackSlug } from './mix';
import type { Mix } from './useMix';
import type { AuthState } from './useAuth';
import type { usePractice } from './usePractice';
import { usePresence } from './usePresence';
import { useSession } from './useSession';
import type { SyncStatus } from './useSyncPreferences';
import {
  openingBell,
  scheduleBell,
  unlockAudio,
  type ScheduledBell,
} from './audio';

/**
 * The room.
 *
 * NOBODY IS EVER TURNED AWAY
 * An earlier version ran a forty-five minute session and refused to start a
 * sitting for the other fifteen, which meant a meditation site told a quarter
 * of its arrivals to come back later. The hour is not permission. A candle is
 * lit at the top of every hour and burns down across it; you sit whenever you
 * like, against whatever is left of it.
 *
 * What is shared is the candle's state, not the right to begin. Two people in
 * different timezones opening this in the same second see the same height of
 * wax — and someone arriving at :50 gets a stub, which says "you are late"
 * far more gently than a locked button.
 *
 * TWO CLOCKS, KEPT APART
 * The session clock is absolute, shared and corrected against the server. The
 * personal timer is relative, private and monotonic. Conflating them is the
 * most likely source of confusing bugs here, so `now` and `mono` are read from
 * different sources on the same tick and never substituted for one another.
 *
 * A sitting may run through the top of the hour. It is not interrupted — a new
 * candle is simply lit under it, which needs no code because the burn is a
 * function of the clock.
 */

type Sitting = {
  /** Its own id, minted at Begin. Carried into the practice log so that a
   *  double-fired effect records the same sitting twice and de-duplicates to
   *  one, rather than counting it twice. */
  id: string;
  startedAt: number;
  /** Wall clock, for the practice log. `startedAt` is monotonic and says
   *  nothing about what day it is. */
  startedAtWall: number;
  endsAt: number;
  /**
   * Ends on the shared bell, with everyone else who chose it. Read by the ring
   * for its last minute — the one sitting whose end is a meeting rather than
   * a timer running out, and the only one where it should look like it.
   */
  together: boolean;
  bell: ScheduledBell | null;
  /**
   * The bell struck at Begin, held only so it can be silenced.
   *
   * A sitting that ends on its own never needs this — the tail is clamped to
   * the sitting's own length, so by the time the closing bell strikes this one
   * has already finished. It exists for the two ways a sitting stops being
   * true: ending early, and the room going away underneath it.
   */
  opening: ScheduledBell | null;
};

type Activity =
  | { kind: 'idle' }
  | { kind: 'sitting'; sit: Sitting }
  | {
      kind: 'finished';
      minutes: number;
      /** Monotonic, at the bell. What the ten-second return counts from. */
      endedAt: number;
      /**
       * How many other people had lit this hour when the bell went.
       *
       * Read once, at the bell, and then carried — not read live. The count
       * polls every fifteen seconds, and a sentence that says "you sat with
       * eleven others" is not allowed to become "with ten" while somebody is
       * reading it. Null means the count was unavailable, in which case the
       * line is not shown at all rather than guessed at.
       */
      withOthers: number | null;
    };

/**
 * Fit the copy into the band above the flame.
 *
 * The band's height comes from cover-fitting a 3:2 photograph, which is a
 * scale with no relationship at all to the height type is sized against — so
 * on a short wide window the flame climbs faster than any `vh` clamp can
 * follow, and no amount of hand-tuned spacing survives it. The copy is
 * therefore measured and scaled to fit, which is the only thing that holds at
 * every viewport and for every combination of what happens to be on screen
 * (the ending's stat table alone is three rows that come and go with what is
 * true of you).
 *
 * `offsetHeight` and `ResizeObserver` both report the UNTRANSFORMED box, so
 * the scale this sets cannot feed back into the measurement that produced it.
 *
 * Not floored. A floor would mean choosing, on some window somebody really
 * has, between clipping the copy and putting it on the candle — and small is
 * recoverable where either of those is not.
 *
 * Callback refs rather than `useRef`, because the band is not in the first
 * render: `Room` returns the scene alone until the clock answers, so a `useRef`
 * read inside a `[]` effect finds null, gives up, and is never asked again.
 * This re-runs the moment the nodes actually exist.
 *
 * WHY useLayoutEffect, AND WHY THAT IS THE WHOLE BUG FIX
 * With `useEffect` the browser paints once at whatever scale the last screen
 * left behind, and only then measures and corrects. On every screen change that
 * is a visible snap — the copy lands at one size and jumps to another a frame
 * later, which reads as the page glitching. `useLayoutEffect` runs after the
 * DOM is written and before the paint, so the first frame anybody sees is
 * already the right size. There is nothing to transition and nothing to catch.
 */
function useFitToBand(screen: string, open: boolean) {
  const [outer, setOuter] = useState<HTMLDivElement | null>(null);
  const [inner, setInner] = useState<HTMLDivElement | null>(null);
  const [fit, setFit] = useState({ scale: 1, slack: 0 });

  useLayoutEffect(() => {
    if (!outer || !inner) return;
    const frame = outer.parentElement;
    if (!frame) return;

    const measure = () => {
      // THE HEIGHT WE FIT AGAINST IS THE ONE THE BAND IS GOING TO BE, NOT THE
      // ONE IT CURRENTLY IS. THIS IS THE WHOLE BUG.
      //
      // `outer.clientHeight` is the obvious thing to read and it is wrong for
      // 700ms after every open and close, because that is how long the band
      // takes to travel between the strip above the flame and the whole frame.
      // Read mid-flight, it produced a `scale` and a `slack` that were correct
      // for a height that existed only in that frame — and since the
      // ResizeObserver fires *every* frame of that animation, the transform
      // below was handed a new target roughly forty times, each one restarting
      // its 600ms ease-out from wherever the last had got to.
      //
      // A repeatedly-restarted ease-out never arrives. The copy crept in,
      // drifted past where it had appeared to be going, and settled about a
      // second late; Tenzing saw it twice and called it bouncing both times.
      // The account panel dodged this by leaving the band alone. The setup
      // questions cannot dodge it — taking the frame is what they are — so the
      // measurement is fixed here instead.
      //
      // Both targets are known without waiting for anything: `open` is the
      // frame's own height, because the band is `height: 100%` of it, and shut
      // is `--flame-top`, which `CandleScene` publishes in px. So the fit is
      // computed once per screen, the observer's forty callbacks all compute
      // the same numbers and are dropped by the equality check below, and the
      // transform transitions exactly once.
      const available = open ? frame.clientHeight : restingBandHeight(frame);
      const needed = inner.offsetHeight;
      if (!available || !needed) return;
      const scale = Math.min(1, available / needed);
      // How much room is left over once it fits. Zero whenever the copy had to
      // be scaled down, positive only when it was already short enough — which
      // is what makes lifting it safe: there is nothing to lift into when the
      // band is full, so nothing can be pushed off the top.
      const slack = Math.max(0, available - needed * scale);
      // Only when it actually moves. Writing the same numbers back on every
      // observer callback re-renders the whole room for nothing.
      setFit((was) =>
        Math.abs(scale - was.scale) < 0.001 && Math.abs(slack - was.slack) < 1
          ? was
          : { scale, slack },
      );
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
    // `screen` is in the deps so the measurement is re-taken explicitly every
    // time what is on screen changes, rather than waiting to be told. A
    // ResizeObserver is delivered during the browser's rendering step, which
    // does not run at all for a hidden page — leave the screen change to the
    // observer alone and the copy comes back at the previous screen's size.
    // Measured: the sound question rendered with the bell question's offset,
    // 127px of lift where it needed 70.
    //
    // `open` joins it because it changes which of the two targets is the right
    // one, and it changes on the same click that changes `screen`.
  }, [outer, inner, screen, open]);

  return { outer: setOuter, inner: setInner, ...fit };
}

/**
 * How tall the band is when it is not travelling.
 *
 * `--flame-top` is published by `CandleScene` from its own cover-fit of the
 * photograph — see the note there. It is the untransformed position of the
 * flame in px, and the band is exactly the strip above it.
 *
 * The fallback mirrors the CSS's own `39vh`, which is where the flame sits in
 * the source image, and is only ever used for the frame or two before the first
 * measurement lands. It is taken off the frame rather than off `innerHeight`
 * because the frame is `h-dvh`, and on a phone with a retracting toolbar those
 * are not the same number.
 */
function restingBandHeight(frame: HTMLElement): number {
  const published = getComputedStyle(document.documentElement).getPropertyValue(
    '--flame-top',
  );
  const px = Number.parseFloat(published);
  return Number.isFinite(px) && px > 0 ? px : Math.round(frame.clientHeight * 0.39);
}

/**
 * The return.
 *
 * Ten seconds between the bell and anything to read, counted down on screen so
 * it is a held beat rather than a page that has failed to load. The gong you
 * chose is still ringing across all of it — bells decay over 18–22s — and the
 * ambient mix is still receding underneath (`fadeOut(14)`).
 *
 * The point of showing the number is that a meditation does not have an OK
 * button. Landing straight on a stat block and two choices is being handed a
 * receipt while the bowl is still sounding. Ten seconds is long enough to open
 * your eyes in and short enough that nobody wonders whether it is stuck.
 */
const COOLDOWN_MS = 10_000;

/**
 * A control that lives on the photograph rather than in the dark band.
 *
 * THE ONE EXCEPTION TO "TEXT ONLY IN THE BAND", AND WHY IT IS ALLOWED
 * Everything readable goes in the strip above the flame because the rest of the
 * frame is lit wax and nothing sits on it at 4.5:1. That rule is about *type* —
 * a sentence you scrim in order to read is a panel pasted onto a picture, which
 * is what the veil was and why it went.
 *
 * A button is a different object. It is allowed to have a surface, because a
 * surface is what tells you it is a button; and once it has one, its contrast
 * is measured against its own fill and not against whatever is behind it. So
 * the two controls during a sitting and the account offer after one can sit at
 * the foot of the frame, where they are out of the way of the ring and the
 * reading, without touching the photograph anywhere else.
 *
 * White, not ink-2. Over lit wax the composite behind this is nowhere near dark
 * enough for ink — measured at the worst case this ever sees, the bright dish
 * in `finished` at roughly #d8c0a0, white comes out at 6.9:1 and ink-2 at about
 * 1.6. On the much darker wall behind a sitting it is comfortably past 15:1.
 *
 * THE FILL IS WARM AND IT IS NOT OPAQUE
 * At #100c09/80 it was a neutral near-black, which on a warm brown photograph
 * reads as a chip of something else laid on top — the button announced itself
 * as not belonging to the picture. A warm dark at 65% takes the room's own
 * colour through it, so it reads as a shadow in the scene that happens to have
 * a word in it. That is as far as it can go: the transparency is bounded by the
 * measurement above, not by taste, and lightening it further is what would
 * start failing on the dish.
 */
const LIFTED_SURFACE =
  `flex min-h-11 items-center justify-center rounded-control border border-white/20 bg-panel/65 text-sm tracking-wide text-white transition-colors hover:border-white/40 hover:bg-panel/85 ${FOCUS}`;

const LIFTED = `${LIFTED_SURFACE} px-6`;

/** The same surface, square, for a control that is an icon rather than a word. */
const LIFTED_ICON = `${LIFTED_SURFACE} w-11`;

function newSittingId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Everything the room needs and does not own.
 *
 * WHY THESE ARRIVE AS PROPS NOW
 * They were hooks called here, which was right while the room was the whole
 * product. It is not: `Entry` may render a home instead, and Home reads the
 * same practice log, writes the same preferences and starts the same audio
 * graph. Two `usePreferences` would hold separate React state over one
 * localStorage key and silently disagree about what you had chosen; two
 * `usePractice` would both run the sync loop against the same table.
 *
 * So there is one of each, above both screens, and the room is handed them.
 * `usePresence` deliberately did NOT lift — see the note on it below.
 */
interface RoomProps {
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  mix: Mix;
  entries: PracticeEntry[];
  record: ReturnType<typeof usePractice>['record'];
  auth: AuthState;
  sync: SyncStatus;
  signIn: (email: string, name?: string) => Promise<string | null>;
  verify: (email: string, code: string) => Promise<string | null>;
  /**
   * Why the link they followed did not sign them in, if they followed one.
   *
   * Passed straight through to `Account`, which is the only thing that can do
   * anything about it. The room itself does not react — somebody who arrived on
   * a dead link still gets the photograph and the word on it.
   */
  linkError: string | null;
  signOut: () => void;
  /**
   * Where "done" goes, when there is somewhere for it to go.
   *
   * This one prop is the whole difference between the two ways the room is
   * used, because that difference really is "is there a home to come back to":
   *
   *   absent   a guest. The landing, the word `Begin.`, the three questions,
   *            and the account offer at the end.
   *   present  somebody signed in. The sitting starts on arrival — they
   *            answered the questions on Home by reading them — and the ending
   *            comes back here instead of offering an account they have.
   *
   * Two booleans would let the room be asked for a state that cannot exist: a
   * sitting that starts on arrival and then strands somebody with nowhere to
   * go, or a landing offering an account to somebody holding one.
   */
  home?: () => void;
}

export default function Room({
  prefs,
  update,
  mix,
  entries,
  record,
  auth,
  sync,
  signIn,
  verify,
  linkError,
  signOut,
  home,
}: RoomProps) {
  // Null until mounted — the server cannot know the viewer's clock, so
  // rendering any time during SSR guarantees a hydration mismatch.
  const [now, setNow] = useState<number | null>(null);
  const [mono, setMono] = useState(0);
  const [activity, setActivity] = useState<Activity>({ kind: 'idle' });

  // The camera's opening move. `load` is the wide, soft, dim frame the room
  // arrives on; `booted` is what releases it into the five-second settle — and
  // it is also the single gate the whole arrival hangs off, because the room
  // and the word on it fade up together or they are two events. See
  // `sceneReady` and THE LANDING below.
  const [booted, setBooted] = useState(false);
  // The photograph has decoded. Reported by `CandleScene`, which is the only
  // thing that knows: it is a CSS background and has no load event of its own.
  const [sceneReady, setSceneReady] = useState(false);
  const onSceneReady = useCallback(() => setSceneReady(true), []);
  /**
   * Is the setup flow open, and which question is showing.
   *
   * `setup` null means the landing: the photograph, and the word `Begin.` on
   * it. Nothing else — no folded settings, no questions. `Begin.` opens the
   * flow, the room settles out of focus behind it, and the last screen of the
   * flow is what actually starts a sitting.
   */
  const [setup, setSetup] = useState<Step | null>(null);
  // The mixer, reached mid-sitting, and the practice log. Owned here rather
  // than by the components that show them because the camera has to know: see
  // `phase` below.
  const [soundOpen, setSoundOpen] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);

  /**
   * THE KEYBOARD FOLLOWS THE DISCLOSURE
   *
   * The sound drawer opens in the band, above the toggle that opened it at the
   * foot of the frame, so Tab from the toggle carried on to `End this sitting`
   * and never reached a fader. Focus now goes to the drawer's first control on
   * open, and Escape brings it back to the toggle, so a keyboard reaches the
   * mixer the way a thumb does. The practice log had the other problem: `Your
   * practice` unmounts when pressed and `Hide your practice` takes its place,
   * so the focused button vanished and the keyboard landed on `<body>`.
   * Whichever of the two has just appeared takes the focus.
   *
   * Only after a press. On a mouse the moved focus draws no ring — the browser
   * shows `:focus-visible` on programmatic focus only when the last input was
   * a key — and `practiceToggled` keeps the ending's first render, where `Your
   * practice` mounts on its own, from pulling focus to it.
   */
  const soundToggle = useRef<HTMLButtonElement>(null);
  const soundDrawer = useRef<HTMLDivElement>(null);
  const practiceShow = useRef<HTMLButtonElement>(null);
  const practiceHide = useRef<HTMLButtonElement>(null);
  const practiceToggled = useRef(false);

  useEffect(() => {
    if (!soundOpen) return;
    soundDrawer.current?.querySelector('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setSoundOpen(false);
      soundToggle.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [soundOpen]);

  useEffect(() => {
    if (!practiceToggled.current) return;
    practiceToggled.current = false;
    (practiceOpen ? practiceHide : practiceShow).current?.focus();
  }, [practiceOpen]);

  /**
   * Whether the half minute after the bell has passed.
   *
   * The bell is not the end of a sitting; it is the start of coming back from
   * one. For thirty seconds after it the bowl is still audible, the ambient mix
   * is still receding and the camera is still travelling — see `returning` in
   * `CandleScene`. This only marks when that is over.
   */
  const [returned, setReturned] = useState(false);
  /**
   * How much of the ending has been allowed on screen.
   *
   * 0 the ten seconds of coming back · 1 what you sat, to read · 2 what you can
   * do about it, to choose from.
   *
   * READING, THEN SELECTIONS
   * The ending had six blocks arriving on four timers and read as a pile. It is
   * now two things in that order: a stat block you read, and a row of controls
   * you pick from. Splitting them across two beats 3.5s apart — one fade
   * length, so each has finished arriving before the next starts — is what
   * makes the difference legible without a rule drawn between them.
   *
   * Nothing at all for the first ten seconds. See `ComingBack`.
   */
  const [reveal, setReveal] = useState(0);
  /**
   * THE ACCOUNT FLOW IS NOT ROOM STATE ANY MORE, AND THAT IS THE FIX.
   *
   * There used to be a `signInOpen` here. It fed `phase`, so pressing `Sign in`
   * racked the camera; it fed the band's height, so the frame grew from the
   * strip above the flame to all of it; and it fed `useFitToBand`'s key, so the
   * copy re-measured and re-scaled against a container that was still animating
   * — the transform's target moving every frame while a 600ms ease-out chased
   * it. That chase is what read as bouncing.
   *
   * The account panel now owns whether it is open, animates nothing but its own
   * opacity and a six-pixel slide, and the room does not know or care. See the
   * head of `Account.tsx` for why an account is not one of the room's
   * questions.
   */

  /**
   * Whether the band is taking the whole frame, or the strip above the flame.
   *
   * Declared here rather than derived from `phase` below because the fit hook
   * needs it and hooks run before `phase` exists. `phase` reads it back, so the
   * two cannot disagree about what "open" means — which they would have to
   * agree on anyway, since one sets the band's height and the other decides
   * what height to measure against.
   */
  const bandOpen = booted && (setup !== null || soundOpen || practiceOpen);

  // Everything that changes what is in the band, in one string. See the hook.
  const band = useFitToBand(
    // `reveal` is in here because the ending swaps `ComingBack` for the stat
    // block at stage 1, and those are different heights.
    `${activity.kind}:${setup ?? '-'}:${soundOpen}:${practiceOpen}:${prefs.showCount}:${reveal}`,
    bandOpen,
  );
  /**
   * PRESENCE DID NOT LIFT WITH THE REST, AND MUST NOT.
   *
   * Everything else the room needs now comes from `Entry`, because Home reads
   * the same log and writes the same preferences. This one stays here, because
   * heartbeating is not reading — it puts you in the count. §14 settled that
   * the count means "here", and somebody reading their own streak on a
   * dashboard is not here. Home reads the number; only the room writes one.
   */
  const { count, litCount, begin: recordBegin } = usePresence();
  const [beganWith, setBeganWith] = useState<number | null>(null);

  // Re-resolves only when the clock rolls into a new hour, which is the only
  // moment the answer can change.
  const session = useSession(now === null ? null : hourKey(now));

  // Read in cleanup, where a stale closure would otherwise leave a bell
  // scheduled after the component is gone.
  const activityRef = useRef(activity);
  activityRef.current = activity;

  // Read at the bell, not depended on. Putting `litCount` in the finishing
  // effect's deps would tear it down and rebuild it every fifteen seconds for
  // a number it only reads once.
  const litRef = useRef<number | null>(null);
  litRef.current = litCount;

  useEffect(() => {
    let frame: number;

    const tick = () => {
      setNow(serverNow());
      setMono(performance.now());
      frame = window.setTimeout(tick, 250) as unknown as number;
    };

    void syncClock().then(tick);

    const onFocus = () => void syncClock();
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearTimeout(frame);
      window.removeEventListener('focus', onFocus);
      const a = activityRef.current;
      if (a.kind === 'sitting') {
        a.sit.bell?.cancel();
        // The opening bell too: it may still be ringing when the room goes
        // away, and a bell left sounding into a page nobody is on is the one
        // thing this site promised never to do.
        a.sit.opening?.cancel();
      }
    };
  }, []);

  /**
   * One held beat on the opening frame, then the settle.
   *
   * Deliberately keyed on WHETHER the clock has arrived, not on what it says.
   * `now` changes four times a second, so depending on its value would tear
   * this timeout down and rebuild it on every tick — and would leave the room
   * stranded in `load` forever the day somebody makes the tick faster than
   * this delay. It should run once, when time first exists.
   */
  useEffect(() => {
    if (activity.kind !== 'finished') {
      setReturned(false);
      setReveal(0);
      return;
    }
    // Ten seconds of coming back, then the reading, then the selections a fade
    // apart. Thirty before the camera has finished travelling. The bell is
    // still ringing through all of it — `decay` is 18–22s.
    const timers = [
      window.setTimeout(() => setReveal(1), COOLDOWN_MS),
      window.setTimeout(() => setReveal(2), COOLDOWN_MS + 3500),
      window.setTimeout(() => setReturned(true), 30_000),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [activity.kind]);

  /**
   * When the room is allowed to arrive.
   *
   * Both conditions, not either: the clock, because the copy that fades in is
   * about an hour it does not yet know, and the photograph, because a word
   * fading up over a dark ground while the picture lands underneath it a second
   * later is two arrivals where the design has one.
   *
   * The 200ms is a beat, not a wait — it lets the browser paint the `load`
   * frame at zero before anything transitions off it, which is what makes this
   * a fade rather than a jump.
   */
  const hasTime = now !== null;
  useEffect(() => {
    if (!hasTime || !sceneReady) return;
    const t = window.setTimeout(() => setBooted(true), 200);
    return () => window.clearTimeout(t);
  }, [hasTime, sceneReady]);

  /**
   * A sound slider moved.
   *
   * `ensure()` first and synchronously: this call is inside the change event,
   * which is the only place autoplay policy will let an AudioContext start.
   * Persisting is second because it goes through React and would not count.
   */
  const setSound = useCallback(
    (slug: TrackSlug | typeof MASTER_KEY, gain: number) => {
      mix.ensure();
      update({ soundMix: { ...prefs.soundMix, [slug]: gain } });
    },
    [mix, update, prefs.soundMix],
  );

  /**
   * `Begin.` on the landing. Opens the questions; does not start a sitting.
   *
   * The audio unlock happens HERE rather than at the end of the flow, and that
   * is the whole reason it is a callback and not a `setSetup` inline. Autoplay
   * policy only lets an AudioContext start inside a user gesture, and the next
   * thing this flow does is offer to play five sounds so somebody can hear what
   * they are choosing. Waiting until the end would mean every one of those play
   * buttons was the first gesture, on a context that had not been unlocked yet.
   */
  const openSetup = useCallback(() => {
    unlockAudio();
    // Silent. The context has to start inside this gesture or the audition
    // buttons three screens later have nothing to play through — but starting
    // it is not the same as playing through it, and this word is not where
    // anybody agreed to hear rain. See `useMix`.
    mix.ensure({ silent: true });
    setSetup('duration');
  }, [mix]);

  // The sound question is on screen, so sound may now be heard: the auditions
  // need it, and anyone who is going to say No is looking at the switch that
  // says so. Not a gesture, and it does not need to be — the context is
  // already running and this only moves a gain.
  useEffect(() => {
    if (setup === 'sound') mix.unmute();
  }, [setup, mix]);

  const begin = useCallback(() => {
    // Must happen inside the click. Autoplay policy will not let an
    // AudioContext start any other way, which is why Begin is a deliberate
    // gesture rather than sound arriving unannounced.
    unlockAudio();
    // Same gesture, same reason. Somebody who set a mix and then reloaded has
    // levels stored but no graph running, so Begin has to build it.
    mix.ensure();
    mix.restore();

    const startedAt = performance.now();
    // Begin is only rendered after `now` exists; the fallback keeps this
    // callback total for TypeScript and for an unusually fast programmatic tap.
    const sessionNow = now ?? serverNow();
    const end = prefs.untilBell
      ? monotonicEndAtFromServerTarget(
          nextSharedBellAt(sessionNow),
          sessionNow,
          startedAt,
        )
      : computeEndsAt(startedAt, prefs.timerMinutes);

    // Scheduled on the AUDIO clock, not a JS timer — background tabs throttle
    // timers to roughly one tick a minute, and a bell ninety seconds late has
    // failed at its one job.
    const seconds = (end - startedAt) / 1000;
    const bell = scheduleBell(seconds, prefs.endBell);

    // A sitting is bounded at both ends by the same sound. Without this, Begin
    // put you into silence and left you to work out for yourself whether
    // anything had started — the bell was the only thing that ever marked a
    // threshold, and it only ever marked the far one.
    const opening = openingBell(prefs.endBell, seconds);

    setSetup(null);
    setActivity({
      kind: 'sitting',
      sit: {
        id: newSittingId(),
        startedAt,
        startedAtWall: Date.now(),
        endsAt: end,
        together: prefs.untilBell,
        bell,
        opening,
      },
    });
    // Presence is never allowed to delay the ritual. The request records a
    // server-stamped start and, if it returns in time, gives the one still
    // sentence that says who crossed the threshold with you.
    void recordBegin().then(setBeganWith);
  }, [prefs.timerMinutes, prefs.untilBell, prefs.endBell, now, mix, recordBegin]);

  /**
   * Somebody signed in arrives already having chosen.
   *
   * REVERSING §16'S "NO SKIP PATH", AND WHAT PAYS FOR IT
   * That section argued against a skip on the grounds that the three questions
   * are "the only moment the product has to ask a returning visitor whether
   * today is a ten-minute day". The concern is right and it is answered rather
   * than dropped: Home prints the settings this sitting will use directly under
   * the button that starts it, with `Change` beside them. The question is still
   * put every time. It is now read instead of walked.
   *
   * A guest still gets all three screens, because a guest has no home to have
   * read the answer on.
   *
   * THE AUDIO WAS ALREADY UNLOCKED BEFORE THIS RAN. `begin()` calls
   * `unlockAudio()`, but an effect is not a user gesture and autoplay policy
   * only starts an AudioContext inside one. Home's `Sit` handler does it in the
   * click that brought us here — see `startSitting` in `Entry`. If a silent
   * sitting ever appears, that is the line that has been moved.
   *
   * IT WAITS FOR THE ROOM, NOT JUST THE CLOCK. This used to fire the moment
   * `now` was known, while the reveal above waits for the photograph as well —
   * so on a cold cache the ring was already draining on a black screen, and a
   * ten-minute sitting was a nine-and-a-half-minute one by the time there was
   * anything to look at. `booted` is the same gate the arrival uses, so the
   * sitting now starts in the frame where it can be seen. On a warm cache the
   * two gates open together and nothing about the entry changes.
   */
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!home || autoStarted.current) return;
    // `begin` needs the corrected clock to resolve a shared bell, and the
    // sitting needs a room to be visible in.
    if (now === null || !booted) return;
    autoStarted.current = true;
    begin();
    // `begin` and `now` both change on every tick; the ref is what makes this
    // run once. Depending on them without it would restart the sitting four
    // times a second.
  }, [home, now, booted, begin]);

  /**
   * `End this sitting`.
   *
   * WHERE IT LEAVES YOU DEPENDS ON WHETHER YOU HAVE ANYWHERE TO GO.
   * A guest goes back to `idle`, which is the landing: the photograph and the
   * word on it. Somebody signed in has no landing — the room starts a sitting
   * on arrival, so `idle` renders nothing at all for them — and returning them
   * to it would leave them looking at a photograph with no way off it. They go
   * home, which is where they came from.
   */
  const endEarly = useCallback(() => {
    setActivity((a) => {
      if (a.kind === 'sitting') {
        a.sit.bell?.cancel();
        // Somebody who stops ten seconds in is stopping while the opening bell
        // is still going. Leaving it to ring over the return would answer
        // "I've changed my mind" with the sound that means "begin".
        a.sit.opening?.cancel();
        mix.fadeOut();
        // Stopping early still counts, and counts for what was actually sat.
        // Someone who set an hour and stopped at twenty sat for twenty —
        // recording the intention instead would make the totals a wish list.
        // Under a minute records nothing; that was a mis-tap.
        record({
          id: a.sit.id,
          startedAt: a.sit.startedAtWall,
          seconds: (performance.now() - a.sit.startedAt) / 1000,
          completed: false,
        });
      }
      return { kind: 'idle' };
    });
    // After the log, not instead of it: the sitting is recorded either way, and
    // only then does the room hand somebody back to where they came from.
    home?.();
  }, [record, mix, home]);

  // The bell rings itself, on the audio clock. This only moves the UI on.
  useEffect(() => {
    if (activity.kind !== 'sitting') return;
    if (!hasEnded(activity.sit.endsAt, mono)) return;

    // Passing the sitting's own id makes this safe to run twice — React runs
    // effects twice in development, and the log de-duplicates by id rather than
    // counting the same sitting again.
    record({
      id: activity.sit.id,
      startedAt: activity.sit.startedAtWall,
      seconds: (activity.sit.endsAt - activity.sit.startedAt) / 1000,
      completed: true,
    });

    // The sound goes with the sitting, and it goes across the whole return
    // rather than inside it. Four seconds put silence in the room twenty-five
    // seconds before the camera had finished coming back, which is the gap that
    // made the ending feel like something switching off.
    mix.fadeOut(14);

    setActivity({
      kind: 'finished',
      endedAt: performance.now(),
      minutes: Math.max(1, Math.round((activity.sit.endsAt - activity.sit.startedAt) / 60_000)),
      // Everyone who lit this hour, minus you. `litCount` rather than the live
      // count on purpose: somebody who sat the first ten minutes of the hour
      // and left was still in it with you, and a candle they lit does not go
      // out because they closed the tab.
      withOthers: litRef.current === null ? null : Math.max(0, litRef.current - 1),
    });
  }, [activity, mono, record, mix]);

  // The room is painted before the clock has answered. `load` is the frame it
  // arrives on, so waiting for the network to render it would mean holding the
  // opening shot back until a fetch returns. The scene sits in the same slot in
  // both branches below, so React keeps it mounted across the changeover and
  // the camera moves off `load` rather than cutting to it.
  //
  // Nothing is said while that happens. This frame lasts a few milliseconds and
  // a label in it only flickers — the scene at `load` is already the first frame
  // of the room either way, so the clock arriving changes nothing anybody sees.
  //
  // The fragment matters: returning the scene bare would put a different fiber
  // type at the root than the branch below, and React would remount it —
  // throwing away the photograph, the canvas and the camera's position.
  if (now === null) {
    return (
      <>
        <Scene
          session={null}
          phase="load"
          burn={0}
          reveal={booted}
          onReady={onSceneReady}
        />
      </>
    );
  }

  const sitting = activity.kind === 'sitting';
  // Every block of the ending shares one fade at one speed; only the moment it
  // starts differs. Same easing throughout, so four separate arrivals still
  // read as one continuous thing settling rather than as four events.
  const ending = (stage: number) =>
    `transition-opacity duration-[3500ms] ease-out ${
      reveal >= stage ? 'opacity-100' : 'opacity-0'
    }`;
  const firstHere = count === 1 && litCount === 1;

  /**
   * Where the camera is.
   *
   * Every input here is state the room already owned; nothing new is tracked
   * to drive it. The order is the priority: being asked something outranks
   * what you are doing, which outranks how much of the room you have chosen
   * to see.
   *
   * `open` leads, and the mixer counts as open. It used to sit below
   * `sitting`, which was fine while the only thing that could be open was a
   * setup question — and those cannot appear during a sitting. The mixer can:
   * the proposal promises the sound can be adjusted without leaving the page,
   * and it means during. Left under `sitting` the camera stayed at its 1.82
   * push while five faders unfolded beneath the clock, and at that zoom the
   * flame's glow is 227px of radius reaching to within 175px of the top of the
   * frame. `End this sitting` was measured on it at 1.00:1 — the same
   * luminance as the type. Opening the mixer is the same act as opening a
   * question, so it gets the same camera: the room pulls back, stops down, and
   * comes back when the drawer closes. The practice log is here for the same
   * reason — it is a block of its own with a heatmap in it, and left in the
   * band it would shrink the entire landing every time somebody looked at it.
   */
  const phase: ScenePhase = !booted
    ? 'load'
    : // `bandOpen` is the same condition, declared above because the fit hook
      // needs it too. The account panel is deliberately absent from it: it is a
      // dropdown with its own surface, not a question taking the frame, and
      // racking the whole photograph behind a 320px panel was most of what
      // made opening it feel like the page lurching.
      bandOpen
      ? 'open'
      : activity.kind === 'sitting'
        ? 'sitting'
        : activity.kind === 'finished'
          ? returned
            ? 'finished'
            : 'returning'
          : !prefs.showCount
            ? 'quiet'
            : 'idle';

  return (
    <>
      <Scene
        session={session}
        phase={phase}
        // Quantised to half-minute steps, so the prop only changes 120 times an
        // hour rather than on every 250ms tick. `CandleScene` is memoised and
        // this is the one prop that would otherwise defeat it. The flame spends
        // `burn` on a 22% scale falloff across the hour, so a step is under a
        // fifth of a percent — nothing anybody can see move.
        burn={Math.floor(candleBurn(now) * 120) / 120}
        reveal={booted}
        onReady={onSceneReady}
      />

      {/*
        THE BAND
        Everything the page asks anybody to read sits in here, because it is the
        only part of the frame that is reliably dark. Its height is measured off
        the photograph by `CandleScene` and published as `--flame-top`; the
        fallback is the same 39% the flame sits at in the source image, for the
        frame or two before the first measurement lands.

        Nothing may be placed below this. The rest of the picture is a lit wax
        cylinder, and the only ways to put type on it are to scrim the
        photograph or to back the type — both of which turn a picture into a
        page with panels on it.
      */}
      <div
        ref={band.outer}
        className="relative overflow-hidden text-center"
        style={{
          // A question being asked is the one time the band is the whole
          // frame. `open` racks the camera to blur 4.8 and dims it by half —
          // the room stops being a photograph of a candle for as long as it
          // takes to answer, so there is no lit wax to keep clear of, and the
          // question can have the middle of the picture at full size instead
          // of being shrunk into the strip above the flame.
          height: phase === 'open' ? '100%' : 'var(--flame-top, 39vh)',
          transition: 'height 700ms ease-out',
        }}
      >
        <div
          ref={band.inner}
          // Absolutely centred rather than flex-centred, and that is not a
          // preference. As a flex child taller than the band this is laid out
          // at a negative offset, and a scale applied on top of that does not
          // land where the transform-origin says it should — measured, the top
          // of the copy sat 28px above the frame and the masthead was cut in
          // half. `translate(-50%, -50%)` puts the copy's own middle on the
          // band's middle whatever its height, and the scale after it keeps
          // that middle fixed.
          //
          // The padding is inside the measured box for a related reason: a
          // transform does not participate in layout, so copy scaled to the
          // band's full height would overflow straight through padding set on
          // the band itself as if it were not there.
          // The extra bottom padding is for the one case where the band is the
          // whole frame *and* the foot row is on screen: the mixer, opened
          // mid-sitting. Padding rather than a shorter band because it is
          // inside the measured box, so the scaler counts it.
          className={`absolute top-1/2 left-1/2 flex w-full flex-col items-center px-6 py-4 ${
            sitting && soundOpen ? 'pb-24' : ''
          }`}
          style={{
            // Lifted off centre while a question is open, so the question is
            // near the top of the frame and read first rather than found in the
            // middle of it. The lift is a fraction of the measured slack, never
            // a fixed percentage: when the copy is tall enough to have been
            // scaled down there is no slack, so there is nothing to lift and
            // nothing can be pushed off the top of the screen.
            transform: `translate(-50%, calc(-50% - ${
              phase === 'open' ? Math.round(band.slack * 0.34) : 0
            }px)) scale(${band.scale})`,
            transition: 'transform 600ms ease-out',
          }}
        >
          {/* Only after a sitting. On the landing the room is the photograph
              and the word on it, and a title, a tagline and the hour were three
              lines of chrome in front of that. What they said, the picture
              already says. */}
          {/*
            NO MASTHEAD HERE ANY MORE

            The name of the place and the line explaining the candle used to
            open the ending. Between them they were 74px of a 272px band —
            about a sixth of the scale everything else on this screen is read
            at — spent introducing the site to somebody who has just finished
            using it.

            The one part of it that was load-bearing is when the next candle is
            lit, because that is what you need to decide whether to sit again.
            That has moved into the quiet row at the bottom, where it costs
            nothing: the row was already there and already wraps.
          */}

          {sitting && (
            <SittingRing
              remaining={remainingMs(activity.sit.endsAt, mono)}
              total={activity.sit.endsAt - activity.sit.startedAt}
              live={prefs.showCount ? count : null}
              lit={prefs.showCount ? litCount : null}
              together={activity.sit.together}
            />
          )}

          <div className="mt-4 flex w-full flex-col items-center">
          {/* THE LANDING
              The photograph, one word on it, and one line saying what the
              place is. The settings, the title and the quiet links have all
              moved behind this word or after the sitting, because a picture
              with anything else on it stops being a picture.

              THE LINE IS THE EXCEPTION, AND IT IS PAID FOR
              This screen said `Let’s begin.` and nothing else until 7
              September 2026, which is a picture with no product in it. The
              sentence that explains the site was written and shipped — to
              `opengraph-image.tsx` and to the meta description — so a stranger
              who saw a *link* to this place was told more than one who typed
              the address. That is not restraint, it is an omission with a
              tidy edge on it, and it made the comprehension test in
              `plans/room-polish.md` §4 unrunnable: four of its five questions
              had no answer anywhere on screen.

              The cost is one line and one link against a photograph. The trade
              is written down here rather than assumed, because the argument
              for emptiness is a real one and the next person to shorten this
              screen should have to argue with something.

              It fades in behind the opening move rather than being there when
              the lights come up: `load` spends 5.6s pushing the camera in from
              wide and soft, and a word already sitting on top of that reads as
              an overlay waiting for the animation to finish. Arriving as the
              room settles makes it part of the same gesture.

              THE SAME GESTURE MEANS THE SAME NUMBER
              The photograph comes up on `REVEAL_MS` too, off this same
              `booted`, which is why the duration is imported rather than typed
              here. The room used to appear whenever its file finished loading
              and the word faded in on a timer of its own; nothing was wrong
              with either, and together they read as a page assembling itself.
              One gate, one duration, one easing. */}
          {activity.kind === 'idle' &&
            setup === null &&
            !practiceOpen &&
            !home && (
              <div
                className="flex flex-col items-center transition-opacity"
                style={{
                  opacity: booted ? 1 : 0,
                  transitionDuration: `${REVEAL_MS}ms`,
                  transitionTimingFunction: REVEAL_EASE,
                }}
              >
                <BeginWord onClick={openSetup} />
                {/* `showCount` off means the room is hidden, so the live half
                    is withheld and the standing sentence stands in. Somebody
                    who asked not to be shown the others is not shown them
                    here either. */}
                <WhatThisIs
                  now={now}
                  litCount={prefs.showCount ? litCount : null}
                />
              </div>
            )}

          {activity.kind === 'idle' && setup !== null && (
            <SessionSetup
              prefs={prefs}
              update={update}
              onSound={setSound}
              now={now}
              // The camera holds `open` for the whole flow; this is what tells
              // the room which question it is holding it for.
              onStepChange={setSetup}
              onCancel={() => setSetup(null)}
              // Placed by the flow rather than after it, on the last screen:
              // "when does the start appear" is the same question as "how far
              // through the questions are we".
              begin={<StartButton onClick={begin} />}
            />
          )}

          {/* The mixer only. `Sound` and `End this sitting` are now at the
              foot of the frame — see THE FOOT below — because the ring wants
              every pixel of the band and those two do not need to be in it. */}
          {sitting && soundOpen && (
            <div ref={soundDrawer} className="mt-8 w-full max-w-sm">
              <SoundMixer
                soundMix={prefs.soundMix}
                onChange={setSound}
                compact
              />
            </div>
          )}

          {activity.kind === 'finished' && reveal === 0 && (
            <ComingBack endedAt={activity.endedAt} mono={mono} />
          )}

          {activity.kind === 'finished' && reveal > 0 && (
            <Afterwards
              onAgain={() => {
                // Signed in, "again" means again — not back to a landing to
                // press `Begin.` and answer three questions that were already
                // answered on Home. This click is a real gesture, so the
                // AudioContext `begin` needs is allowed to start in it.
                if (home) {
                  begin();
                  return;
                }
                mix.restore();
                setActivity({ kind: 'idle' });
              }}
              onDone={home}
              minutes={activity.minutes}
              withOthers={activity.withOthers}
              entries={entries}
              now={now}
              stage={ending}
            />
          )}

          </div>

          {/* What this hour is, and who else is in it. Text, so it is in the
              band — the foot of the frame has room for two links and nothing
              else. Last, because it is the least of what is being said. */}
          {/* Your practice, with the room pulled back behind it. Collapsed by
              default and absent entirely until there is something to show: the
              page's job is to get somebody sitting, and a record of how
              consistent you have been belongs after that, not between you and
              it. */}
          {practiceOpen && (
            <div className="flex flex-col items-center gap-6">
              <Practice entries={entries} now={now} />
              <button
                ref={practiceHide}
                type="button"
                onClick={() => {
                  practiceToggled.current = true;
                  setPracticeOpen(false);
                }}
                aria-expanded
                className={QUIET}
              >
                Hide your practice
              </button>
            </div>
          )}

          {activity.kind === 'sitting' && prefs.showCount && (
            <div className="mt-3">
              <PresenceMessage
                count={count}
                litCount={litCount}
                firstHere={firstHere}
                beganWith={beganWith}
              />
            </div>
          )}

          {/*
            THE SECONDARY SELECTIONS — after a sitting, not before one.

            The room you are in and your own history used to sit under `Begin.`
            on the landing. Nothing there was anything anybody arrived for, and
            three grey links across the bottom of a photograph is the exact
            thing that makes a picture look like a page.

            Buttons, not links. Everything on this screen is now either
            something to read (the stat block) or something to pick, and these
            are things to pick — set as bare words they read as a caption on the
            picture, which is the whole complaint. Smaller and quieter than
            `Sit again` and `Finish`, because they are the second rank.
          */}
          {/* GUESTS ONLY. Thirteen seconds after a bell is not the moment for
              a settings row, and for somebody signed in these two are on Home
              — the practice log is most of that page, and the room switch is
              in its settings. So the signed-in ending is Sit again and Done,
              and nothing else to read.

              A guest has no Home. This is the only place they can see their
              own log or turn the dots off, so they keep both. The design audit
              called these "the two nobody came back for", and that is true of
              the person with somewhere else to find them. */}
          {activity.kind === 'finished' && phase !== 'open' && !home && (
            <div
              className={`mt-3 flex flex-wrap items-center justify-center gap-2 ${ending(2)}`}
            >
              <button
                type="button"
                onClick={() => update({ showCount: !prefs.showCount })}
                aria-pressed={prefs.showCount}
                // border-ink-2/65, not border-ink-3/50. A border is a UI
                // boundary and owes 3:1; ink-3 at half strength measured 2.49
                // on the palette ground and less over the ending's bright
                // photograph. ink-2 at 65% clears it on both.
                className={`border-ink-2/65 text-ink-2 hover:border-ink-2 hover:text-ink rounded-control flex min-h-11 items-center border px-4 text-xs transition-colors ${FOCUS}`}
              >
                {prefs.showCount ? 'Hide the room' : 'Show the room'}
              </button>

              {entries.length > 0 && (
                <button
                  ref={practiceShow}
                  type="button"
                  onClick={() => {
                    practiceToggled.current = true;
                    setPracticeOpen(true);
                  }}
                  aria-expanded={false}
                  className={`border-ink-2/65 text-ink-2 hover:border-ink-2 hover:text-ink rounded-control flex min-h-11 items-center border px-4 text-xs transition-colors ${FOCUS}`}
                >
                  Your practice
                </button>
              )}
            </div>
          )}

          {/* All that survives of the masthead, and the only part of it anybody
              needed at this moment: when the next one is lit.

              Its own line, below the buttons. Set inline with them it was one
              piece of plain text in a row of bordered controls, which is
              exactly the "is this a thing I press?" ambiguity the borders were
              added to remove. */}
          {activity.kind === 'finished' && phase !== 'open' && (
            <p
              // text-sm, not text-xs: the same rank as the stat rows above it.
              // This is the shared fact and it was the smallest type on the
              // screen, under a text-6xl personal one.
              className={`text-ink-2 mt-4 text-sm tabular-nums ${ending(2)}`}
            >
              Next candle at {localTime(nextHourStart(now))}
            </p>
          )}
        </div>
      </div>

      {/*
        THE WAY IN, TOP RIGHT

        §16 recorded the cost of having no way to sign in before a first
        sitting, and named the remedy if that cost ever stopped being worth
        paying: "the fix is one quiet line, not the row of three that used to be
        there." This is the one quiet line. It is not joined by a second.

        Why bare type is allowed here when it is not allowed at the foot: this
        is inside the band. The band is the top of the frame — the strip above
        the flame — and it is the one region of the photograph whose darkness
        belongs to the composition rather than to the window. The foot is lit
        wax, which is why the controls down there carry their own surface.

        It fades in on the same `REVEAL_MS` as `Begin.` and as the photograph
        itself, off the same `booted`. Arriving
        before the opening move has settled would make it an overlay waiting for
        an animation to finish, which is the exact complaint that took the old
        row of three off this screen.

        Absent for anybody signed in: they have a home, and this is the door to
        it. Absent while a question is open, because one thing is being asked.

        IT IS THREE LINES, AND IT OFFERS BOTH DOORS BY NAME
        It said `Create account`, with "I already have one" as a footnote inside
        the panel — chosen over `Sign in` because `signInWithOtp` creates the
        account on first use, and `Sign in` alone asks a first-time visitor for
        credentials they do not have. Jonny asked (7 September 2026) for a
        three-line settings button here instead, opening a menu that offers
        `Create account` and `Sign in` as two separate choices. Both lead into
        the same panel at different steps; `Account` owns the menu.
      */}
      {!home &&
        auth.status === 'signed-out' &&
        activity.kind === 'idle' &&
        setup === null &&
        !practiceOpen && (
          <div
            className="absolute top-0 right-0 z-20 p-3 transition-opacity sm:p-5"
            style={{
              opacity: booted ? 1 : 0,
              transitionDuration: `${REVEAL_MS}ms`,
              transitionTimingFunction: REVEAL_EASE,
            }}
          >
            {/*
              LIFTED, not a bare word.

              This corner is the photograph — the same surface as the foot of
              the frame — so it takes the same treatment the foot does. As grey
              type it cleared 4.5:1 and was still effectively invisible: it sat
              in the darkest corner of a picture at 12px with nothing bounding
              it, and read as a watermark. Contrast was never the problem;
              nothing said it could be pressed.

              The panel that drops from it carries the same surface for the same
              reason, one step more opaque because it is read rather than
              pressed.
            */}
            <Account
              state={auth}
              sync={sync}
              signIn={signIn}
              verify={verify}
              linkError={linkError}
              signOut={signOut}
              className={LIFTED_ICON}
              menu
            />
          </div>
        )}

      {/*
        THE FOOT OF THE FRAME

        Only one kind of thing may live below the band, and bare type is not it:
        at 1280x800 there is a strip in the bottom left about 480px wide and 44px
        tall that measures 5.15:1, and it is tempting — but widen it to 560 and
        it is 4.46, raise it 44px and it is 2.66 where the dish begins, and at
        375 wide the photograph is cropped to the candle so there is no dark
        foreground at all. Two links measured 3.98 and 2.19 there. The band is
        the only part of this picture whose darkness belongs to the composition
        rather than to the window.

        What may: a `LIFTED` button, which carries its own surface and so is
        measured against that rather than against whatever the photograph is
        doing underneath it. See `LIFTED`.

        THE PRESENCE FIELD IS GONE FROM HERE, AND FROM THE PRODUCT
        It was a 6x10 grid of identical teardrops in this corner, half of them
        dimmed, and on the photograph it read as a sprite sheet that had failed
        to load rather than as people. `room-polish.md` §4A called it that in
        those words; Tenzing, looking at it on the live site, called it the same
        thing less politely.

        Nothing replaces it because the ring already did: one dot per candle lit
        this hour, on the circle the timer sweeps, in the middle of the frame
        where somebody is actually looking. Keeping the field on the landing was
        the last of it, on the reasoning that the landing has no ring — but the
        landing's whole argument is that it is a photograph with one word on it,
        and a scatter of flames in the corner is precisely the thing that
        argument exists to keep off.
      */}

      {/* Out of the band entirely, and out of the way. These are the two things
          you might reach for mid-sitting, and neither belongs anywhere near the
          ring — under it they crowded the one object on screen that matters,
          and every pixel they took came off the ring's diameter. At the foot of
          the frame they are where a hand already is on a phone, and the band
          above is free for the clock and the room. */}
      {sitting && (
        // gap-10, not the gap-3 two adjacent buttons would normally take. These
        // are not a pair of options to choose between — one opens a drawer and
        // one ends the sitting — and side by side with a hairline between them
        // they read as a segmented control, which invites a mis-tap on the one
        // that cannot be undone.
        //
        // The bottom padding grows by the safe-area inset. `pb-7` alone put
        // `End this sitting` inside the iOS home-indicator zone — the one
        // control that cannot be undone, where the system swipe-up gesture
        // lives. The inset is zero everywhere that has no such zone, so the
        // 28px stands on every other device.
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-10 px-5 pb-[calc(1.75rem+env(safe-area-inset-bottom))]">
          <button
            ref={soundToggle}
            type="button"
            onClick={() => setSoundOpen(!soundOpen)}
            aria-expanded={soundOpen}
            className={LIFTED}
          >
            {soundOpen ? 'Hide sound' : 'Sound'}
          </button>
          <button type="button" onClick={endEarly} className={LIFTED}>
            End this sitting
          </button>
        </div>
      )}

      {/* THE ACCOUNT OFFER, ON ITS OWN

          Separated from the ending by the whole height of the photograph, which
          is the point: everything in the band is about the sitting you just
          did, and this is the one thing on the screen that is about the
          product. Mixed in among the stats it read as another line of the
          receipt. Down here it is plainly an aside, and skipping it costs
          nothing.

          Hidden while the practice log is open — that takes the whole frame.

          GUESTS ONLY, NOW. `Account` used to render `Sign out` here for anybody
          signed in, which put the least wanted control in the product at the
          foot of the one screen somebody has just finished meditating on. There
          is a home for that now, and `Sign out` lives on it. What is left here
          is only ever the offer — made to the only people it means anything to.

          `drop="up"`, because this one is already at the bottom of the window
          and the panel has nowhere below it to go.
      */}
      {activity.kind === 'finished' && !practiceOpen && !home && (
        <div
          className={`absolute inset-x-0 bottom-0 z-20 flex justify-center px-5 pb-[calc(1.75rem+env(safe-area-inset-bottom))] ${ending(2)}`}
        >
          <Account
            state={auth}
            sync={sync}
            signIn={signIn}
            verify={verify}
            // Deliberately NOT `linkError`. That flag lives for the whole
            // session, and this instance mounts at the end of a sitting —
            // minutes after the arrival it describes. Only the landing can be
            // reached by following a link, so only the landing reports on one.
            signOut={signOut}
            className={LIFTED}
            drop="up"
          />
        </div>
      )}
    </>
  );
}

/**
 * Whatever this hour asks you to look at.
 *
 * This is the branch the whole session architecture exists to make possible,
 * and it is deliberately the only one. The room does not ask "are we live?" —
 * it hands the session here and renders what it says.
 *
 * In v1 that is always the candle: `sessions` is empty, so every hour resolves
 * ambient. The two remaining focus loops from the spec, and v2's live video,
 * both arrive as cases in this function and a row in a table — not as changes
 * to the clock, the timer, the presence count or anything else in this file.
 *
 * `session` is null only in the instant before the first tick. The candle is
 * right for that instant too, so there is nothing to wait for.
 */
/**
 * The background layer: the photograph, and nothing over it.
 *
 * Nothing may be added here to make the column readable. A scrim over the
 * photograph is the obvious fix and it was tried and rejected — it reads as a
 * panel pasted onto a picture, which is the opposite of what the room is for.
 * The type belongs inside the photograph, so it is placed where the photograph
 * is already dark. `CandleScene`'s own vignette is the only grade there is.
 *
 * Fixed rather than in flow, because the room is behind the page and not a
 * block within it. `-z-10` puts it under the column and — thanks to `isolate`
 * on `main` — no lower than that.
 */
function Scene(props: {
  session: Session | null;
  phase: ScenePhase;
  burn: number;
  reveal: boolean;
  onReady: () => void;
}) {
  return (
    <div className="fixed inset-0 -z-10">
      <Focus {...props} />
    </div>
  );
}

function Focus({
  session,
  phase,
  burn,
  reveal,
  onReady,
}: {
  session: Session | null;
  phase: ScenePhase;
  burn: number;
  reveal: boolean;
  onReady: () => void;
}) {
  switch (session?.focusSlug) {
    // 'water' and 'hourglass' from the spec are cases here once the client
    // sources the loops. Anything unrecognised falls through on purpose: a
    // typo in a database row should show a candle, not an empty page.
    case 'candle':
    default:
      return <CandleScene phase={phase} burn={burn} reveal={reveal} onReady={onReady} />;
  }
}

/**
 * `Let’s begin.`
 *
 * The words, not a button around them. A bordered pill on a photograph reads as
 * a sticker laid on top of it, and the render this room was designed from had
 * this set as display type inside the picture.
 *
 * It said `Begin.` — an instruction, from the room to you. `Let’s` makes it an
 * invitation from someone sitting down with you, which is the entire premise of
 * the site and was being spent nowhere else on this screen. It is the only copy
 * a first-time visitor reads before deciding, so it is worth the two extra
 * words.
 *
 * A typographic apostrophe, matching the rest of the visible copy — `You’ll
 * finish with everyone else at…` in `SessionSetup`. Straight quotes in this
 * project are a code-comment habit, not a copy one.
 *
 * It is the landing and only the landing. It used to appear twice, meaning two
 * different things — opening the questions here, starting the sitting at the
 * end of them — which read as the flow having failed to go anywhere. The one at
 * the end is `StartButton` below.
 */
function BeginWord({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-display text-ember hover:text-ink rounded-control px-4 text-5xl leading-none transition-colors duration-500 sm:text-6xl ${FOCUS}`}
    >
      Let’s begin.
    </button>
  );
}

/**
 * What this place is, under the word that opens it.
 *
 * ONE SENTENCE, AND IT IS THE ONE WE ALREADY WROTE
 * The standing form is the Open Graph card's, verbatim — `opengraph-image.tsx`
 * and the meta description have both been saying it to crawlers since the
 * launch. Repeating it here rather than writing a third version is the point:
 * one product, one sentence, and the person in the room hears the same thing
 * the link preview promised them.
 *
 * LIVE WHEN THERE IS SOMETHING TRUE TO SAY, STANDING WHEN THERE IS NOT
 * `A candle was lit at 12:00. 11 people are looking at the same one.` says the
 * premise *and* proves it in one breath, which no static sentence can. But it
 * is only said when it is true: `litCount` of one is you, on your own, and
 * `A candle was lit at 12:00. 1 person is looking at it` is a lonely sentence
 * dressed as company. Below two, and whenever the count is unknown, the
 * standing sentence stands — the same rule `PresenceMessage`, `Afterwards`,
 * `Home` and `World` all keep. A missing number costs far less than a wrong
 * one, and an invented one costs the most of all.
 *
 * `ink-2`, not `ink-3`. This sits over a photograph, and it is the sentence
 * the whole screen exists to deliver — the quiet tone is for the things that
 * can afford to be missed.
 */
function WhatThisIs({
  now,
  litCount,
}: {
  now: number | null;
  litCount: number | null;
}) {
  const company = now !== null && litCount !== null && litCount > 1;

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <p className="text-ink-2 max-w-[34ch] text-center text-sm text-balance">
        {company
          ? `A candle was lit at ${localTime(hourStart(now))}. ${litCount} people are looking at the same one.`
          : 'A candle is lit at the top of every hour. Everyone is looking at the same one.'}
      </p>

      {/* The door to `/world`, which had none. It is the strongest evidence
          the product owns for its own claim — strangers' candles on the real
          earth — and until now the only link to it was on Home, which is
          signed in. The persuasion asset was behind the conversion.

          `QUIET`, not `LIFTED`: this is the band, where the composition
          supplies its own contrast. See `controls.ts`.

          The same words as Home's link, deliberately. One thing, one name. */}
      <Link href="/world" className={QUIET}>
        See where the candles are
      </Link>
    </div>
  );
}

/**
 * What actually starts a sitting, at the foot of the last question.
 *
 * A button here and a word on the landing, and the difference is the point.
 * `Begin.` is display type set into a photograph — it is the room inviting you
 * in, and a border around it would make it a sticker on a picture. This is the
 * last of three answers in a form, sitting where `Next` sat on the two screens
 * before it, and at that moment somebody is looking for a control, not for
 * typography. Set as display type it read as a heading that happened to be
 * clickable, and people went looking for the real button underneath it.
 *
 * So: the same ember, the same shape as `Next`, one step louder because it is
 * the one that commits — and much smaller than the landing's word, which stays
 * the largest thing the product ever says.
 */
function StartButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-ember bg-ember-soft text-ember hover:bg-ember rounded-action min-h-12 border px-10 text-base tracking-wide transition-colors duration-300 hover:text-white ${FOCUS}`}
    >
      Start
    </button>
  );
}

/**
 * The personal timer, and the room, as one object.
 *
 * WHY THE RING CARRIES THE PEOPLE
 * A number counting down says how long is left and nothing else, so everything
 * about sitting *together* had to be said somewhere else — a line of text, or a
 * scatter of flames in a corner nobody looks at while their eyes are shut. Both
 * are a second thing on a screen that should have one thing on it.
 *
 * The ring says both. The arc is your time draining away; the dots on it are
 * the candles lit this hour, one each. They are on the same circle because they
 * are the same fact: this is the hour, and this is who is in it.
 *
 * WHY THE DOTS ARE SPREAD EVENLY RATHER THAN DROPPED INTO FIXED SLOTS
 * Fixed slots mean a new arrival lights a dot and nothing moves, which is
 * cheaper and completely wrong at the counts this will actually see. Three
 * people in sixty slots is not a quiet room, it is a broken one. Spread evenly,
 * one person is a single mark at the top of the ring, two are opposite each
 * other, three are a triangle — every count is composed, because every count is
 * the only arrangement of itself.
 *
 * The cost is that arrivals move everybody. That is paid for with a slow
 * transition on each dot's angle, so the ring opens up to make room rather than
 * snapping to a new arrangement — which is the truer picture of what just
 * happened anyway.
 *
 * LIT, NOT LIVE
 * A dot is a candle. Somebody who sat the first ten minutes of the hour and
 * closed the tab still lit one, so it stays — dimmer, because they are not
 * here now, but lit. That is `litCount` behind the dots and `live` behind
 * which of them are at full strength, the same distinction `PresenceField`
 * has always drawn.
 */

/** Past this the ring is a dotted line rather than a room. */
const MAX_DOTS = 36;

/**
 * THE DOTS SIT OUTSIDE THE ARC, NOT ON IT
 *
 * Drawn on the same circle they are invisible for most of a sitting: the arc
 * is ember, the dots are ember, and the arc covers the whole ring until the
 * time starts running out. You would see the room appear only as your sitting
 * ended, which is precisely backwards.
 *
 * Eight units out they never collide with it, and they read better for it — a
 * ring of small lights around the clock rather than markings on it, which is
 * much closer to what they are. Eight and not fourteen: the clearance is dead
 * space in the box on every screen where nobody else is in the room, and it is
 * dead space that comes straight off the diameter of the circle.
 *
 * These are viewBox units, not pixels. The box itself is sized in CSS against
 * the band — see `SittingRing` — and everything in here scales with it.
 */
const RING = { box: 176, mid: 88, r: 74, dotR: 82 };

function SittingRing({
  remaining,
  total,
  live,
  lit,
  together,
}: {
  remaining: number;
  /** The whole sitting, so the arc knows what fraction is left. */
  total: number;
  /** Null when the count is unavailable or the room is hidden: no dots. */
  live: number | null;
  lit: number | null;
  /** Ends on the shared bell. Only then does the last minute gather. */
  together: boolean;
}) {
  const circumference = 2 * Math.PI * RING.r;
  // Clamped both ways: `remaining` can overshoot by a tick either side of the
  // bell, and an arc longer than the circle draws over itself.
  const left = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;

  const here = Math.max(0, live ?? 0);
  const dots =
    lit === null ? 0 : Math.min(MAX_DOTS, Math.max(here, Math.max(0, lit)));

  /* THE LAST MINUTE, WHEN IT IS SHARED

     For most of a sitting the dots are the room: spread evenly round the
     clock, dimmer for the people who lit a candle and left. For a sitting
     that ends on the shared bell, the bell is the one moment in the product
     when strangers actually do something at the same second — and until now
     nothing on screen said so. The arc drained, the bell rang, `Come back.`
     appeared, and the meeting the whole site is built around passed without
     a mark.

     So over the final sixty seconds, and only for those sittings, the dots
     come in. Every candle brightens to full, and each one travels from its
     place on the circle toward twelve — yours — so that by the bell the room
     is a small bright cluster around your own light rather than a scatter
     around the clock. The angle is scaled about twelve rather than toward
     zero so they arrive from both sides, and never fully to zero: eight
     percent of the circle keeps them a cluster rather than a pile.

     `gather` is 0 for the whole sitting until a minute out, then eases to 1.
     It is derived from `remaining`, so it costs nothing on the ticks that
     are not the last minute, and the 2000ms transition each dot already has
     on its transform is what makes the quarter-second ticks read as a drift
     rather than a march. Somebody on their own timer sees none of this: for
     them the end is their own, and it should look like it. */
  const gather =
    together && remaining < 60_000
      ? (() => {
          const g = 1 - Math.max(0, remaining) / 60_000;
          return g < 0.5 ? 2 * g * g : 1 - Math.pow(-2 * g + 2, 2) / 2;
        })()
      : 0;
  const spread = 1 - gather * 0.92;

  return (
    /*
      SIZED AGAINST THE BAND, NOT IN PIXELS

      A fixed pixel ring is either too small on a tall window or too tall for a
      short one, and `useFitToBand` can only fix the second case — by shrinking
      the entire screen, timer and controls and all. So the ring asks for
      whatever is left of the band once the controls and the caption underneath
      have taken their 132px, floored so it never becomes a token and capped so
      it never becomes a target.

      The result is that on nearly every window nothing is scaled at all: the
      ring is exactly as big as the room allows, and the type under it is at its
      real size rather than at 87% of it.

      Everything inside is in viewBox units including the numerals, so the whole
      thing grows and shrinks as one object.
    */
    <div
      role="timer"
      aria-label={`${mmss(remaining)} remaining`}
      style={{
        // 96px is what is left in the band once the presence caption and the
        // margins have had theirs. It was 132 while `Sound` and `End this
        // sitting` were in here too; they are at the foot of the frame now, and
        // the ring got their space.
        width: 'clamp(150px, calc(var(--flame-top, 39vh) - 96px), 230px)',
        aspectRatio: '1',
      }}
    >
      <svg
        viewBox={`0 0 ${RING.box} ${RING.box}`}
        className="h-full w-full"
        aria-hidden
      >
        {/* The hour's own circle, always whole. */}
        <circle
          cx={RING.mid}
          cy={RING.mid}
          r={RING.r}
          fill="none"
          stroke="var(--color-rule)"
          strokeWidth={1}
        />

        {/* What is left, draining clockwise from the top. Drains rather than
            fills because everything else in this room does: the candle burns
            down, the hour runs out. A filling arc would be the only thing on
            screen measuring what has been spent.

            The offset is `1 + left` and that is not a typo. The dash pattern is
            [C dash, C gap], and the offset shifts it backwards along the path,
            so what the number chooses is which of the two lands at the start —
            twelve o'clock, after the rotate.

              C * (1 - left)  puts the *dash* at twelve. The arc is anchored
                              there and its tip retreats 9 → 6 → 3, which reads
                              as a countdown running backwards.
              C * (1 + left)  puts the *gap* at twelve, C * (1 - left) long. The
                              spent time is the hole, it opens at the top and
                              widens 3 → 6 → 9, and the arc that survives is
                              always the part still ahead of it.

            Both draw the same amount of ember; only the end that moves differs.
            The second is the one a clock does. Twelve stays covered either way —
            the dash still finishes there — so the dot in that slot is hidden
            until the last moment, as the block above assumes. */}
        <circle
          cx={RING.mid}
          cy={RING.mid}
          r={RING.r}
          fill="none"
          stroke="var(--color-ember)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 + left)}
          transform={`rotate(-90 ${RING.mid} ${RING.mid})`}
          opacity={0.85}
        />

        {Array.from({ length: dots }, (_, i) => {
          // Slot zero is yours, and it is at twelve o'clock — the one place on
          // a circle that can be found without counting.
          const mine = i === 0;
          const present = i < Math.max(1, here);
          // Signed about twelve, so the gather closes from both sides.
          const around = (360 / dots) * i;
          const signed = around > 180 ? around - 360 : around;
          return (
            <g
              key={i}
              style={{
                transform: `rotate(${(signed * spread).toFixed(2)}deg)`,
                transformOrigin: `${RING.mid}px ${RING.mid}px`,
                transition: 'transform 2000ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {mine && (
                <circle
                  cx={RING.mid}
                  cy={RING.mid - RING.dotR}
                  r={5.5}
                  fill="none"
                  stroke="var(--color-ember)"
                  strokeWidth={1}
                  opacity={0.45}
                />
              )}
              <circle
                cx={RING.mid}
                cy={RING.mid - RING.dotR}
                r={mine ? 3.25 : 2.5}
                fill="var(--color-ember)"
                // Lit but gone: still a candle, no longer a person in the room.
                // In the shared last minute every candle comes up to full.
                opacity={present ? 1 : 0.38 + 0.62 * gather}
                style={{ transition: 'opacity 2000ms ease-out' }}
              />
            </g>
          );
        })}

        {/* SVG text, not an absolutely-positioned <p> over the top. The box is
            sized in CSS against the band, so a fixed `text-3xl` inside it would
            be the one thing that did not grow with the ring — and on a tall
            window that reads as a large circle with a small clock in it. */}
        <text
          x={RING.mid}
          y={RING.mid}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={34}
          fill="var(--color-ink-2)"
          className="font-numeral tabular-nums"
        >
          {mmss(remaining)}
        </text>
      </svg>
    </div>
  );
}

/**
 * The ten seconds after the bell.
 *
 * A meditation has no OK button, and landing straight on a stat block and two
 * choices is being handed a receipt while the bowl is still sounding. So there
 * is a held beat: the word, and a number going down. The gong you chose is
 * ringing across all of it — bells decay over 18-22s — and the ambient mix is
 * still receding underneath.
 *
 * The number is there so it reads as a pause rather than as a page that has
 * failed to load; ten seconds of an unexplained blank frame is a long time. It
 * is small and quiet for the opposite reason: a large ticking digit is the one
 * thing that could make this feel like being timed.
 */
function ComingBack({ endedAt, mono }: { endedAt: number; mono: number }) {
  const left = Math.max(0, Math.ceil((COOLDOWN_MS - (mono - endedAt)) / 1000));

  return (
    <div
      className="flex flex-col items-center"
      // Announced once, not live. A polite live region ticking every second
      // would have a screen reader counting out loud at somebody who still has
      // their eyes shut.
      role="status"
      aria-label="Coming back"
    >
      <p className="text-ink-2 font-display text-4xl leading-none sm:text-5xl">
        Come back.
      </p>
      <p
        aria-hidden
        // ink-2: `returning` brings the camera back at brightness 1.14 with
        // the vignette almost off, and ink-3 does not clear 4.5 on that.
        className="text-ink-2 font-numeral mt-5 text-lg tabular-nums"
      >
        {left}
      </p>
    </div>
  );
}

/**
 * After the bell: a thing to read, then a thing to choose.
 *
 * WHY THE FACTS ARE A TABLE
 * They were four sentences of prose stacked down the middle of the frame -
 * minutes, streak, company, an account offer - each a different length, none
 * aligned to anything, with two buttons in the middle of them. Nothing about
 * the shape of it said which parts were information and which were controls.
 *
 * Now they are a table with no lines in it: label left, value right, one per
 * row, in a column of fixed width. That is enough structure to scan in a second
 * and not enough to look like a dashboard. Every control is underneath it and
 * every control is bordered, so the screen says which half is which before a
 * word of it has been read.
 *
 * The minutes stay out of the table and above it at display size. They are the
 * one number anybody came back for, and a row labelled "Sat for" is not the
 * same as being told.
 */
function Afterwards({
  onAgain,
  onDone,
  minutes,
  withOthers,
  entries,
  now,
  stage,
}: {
  onAgain: () => void;
  /**
   * Where finishing goes, when there is a home to go to.
   *
   * Absent for a guest, and then `Finish` does what it has always done: clears
   * the two buttons and leaves the room. There is nowhere else for a guest to
   * be, and sending them back to `Begin.` would read as the site asking them to
   * go again the instant they said they were done.
   */
  onDone?: () => void;
  minutes: number;
  withOthers: number | null;
  entries: PracticeEntry[];
  now: number;
  /** The shared fade, keyed to how far into the ending we are. */
  stage: (n: number) => string;
}) {
  const [finished, setFinished] = useState(false);

  const streak = currentStreak(entries, now);
  const total = summarise(entries, now);

  /**
   * Only rows that say something. A streak of one is "you sat today", which the
   * line above it just said at display size; one sitting altogether is that
   * same sitting counted again. `withOthers` null means the count was
   * unavailable, and the row is absent rather than guessed at - a meditation
   * site does not invent company.
   */
  const rows: [string, string][] = [];
  if (streak > 1) rows.push(['Days in a row', String(streak)]);
  if (withOthers !== null)
    rows.push([
      'In the room',
      withOthers === 0
        ? 'Just you'
        : `${withOthers} ${withOthers === 1 ? 'other' : 'others'}`,
    ]);
  if (total.sittings > 1)
    rows.push(['Altogether', `${total.sittings} sittings`]);

  return (
    <div className="flex w-full flex-col items-center">
      <p
        className={`text-ink font-display text-5xl leading-none sm:text-6xl ${stage(1)}`}
      >
        {minutes} {minutes === 1 ? 'minute' : 'minutes'}.
      </p>

      {rows.length > 0 && (
        <dl
          className={`mt-6 w-full max-w-[15rem] space-y-1.5 text-sm ${stage(1)}`}
        >
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-6"
            >
              {/* ink-2 and ink, not ink-3 and ink-2. `finished` is the
                  brightest the room ever is — brightness 1.14 with the vignette
                  almost off — and ink-3 measured 4.26-4.51 there, which is a
                  fail or a pass with a hundredth in hand. Both ranks move up
                  one; the hierarchy between them is unchanged. */}
              <dt className="text-ink-2">{label}</dt>
              <dd className="text-ink tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {!finished && (
        <div className={`mt-7 flex gap-3 ${stage(2)}`}>
          <button
            type="button"
            onClick={onAgain}
            className={`border-ember text-ember hover:bg-ember rounded-control min-h-11 border px-7 text-sm transition-colors duration-500 hover:text-white ${FOCUS}`}
          >
            Sit again
          </button>
          <button
            type="button"
            onClick={() => (onDone ? onDone() : setFinished(true))}
            // ink-2, not the ink-3 the rest of the secondary copy uses. This
            // is the one control that only ever appears in `finished`, and
            // `finished` is the brightest the room gets - brightness 1.14 with
            // the vignette almost off. Measured there, ink-3 came to 4.37.
            // The border follows the same reasoning: ink-3/50 is 2.49 against
            // a 3:1 floor for a boundary, and lower still on this phase.
            className={`border-ink-2/65 text-ink-2 hover:border-ink-2 hover:text-ink rounded-control min-h-11 border px-7 text-sm transition-colors ${FOCUS}`}
          >
            {/* The word changes because the act does. A guest is finishing;
                somebody signed in is going back to somewhere. */}
            {onDone ? 'Done' : 'Finish'}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The one sentence the room says back.
 *
 * Counts everyone on the page, not only those who have begun — so the wording
 * is "here", which is true of both. Claiming they were all meditating would
 * not be.
 *
 * Renders nothing when the count is unknown or degraded. Somebody sitting down
 * to meditate should never be shown an error, and a missing number costs far
 * less than a wrong one.
 */
function PresenceMessage({
  count,
  litCount,
  firstHere,
  beganWith,
}: {
  count: number | null;
  litCount: number | null;
  firstHere: boolean;
  beganWith: number | null;
}) {
  if (beganWith !== null) {
    const others = Math.max(0, beganWith - 1);
    if (others > 0) {
      return (
        <p className="text-ink-3 text-xs">
          You began with {others} {others === 1 ? 'other' : 'others'}
        </p>
      );
    }
  }

  if (count === null) return null;

  if (firstHere) {
    return (
      <p className="text-ink-3 text-xs">
        You are the first here this hour
      </p>
    );
  }

  // The dots need saying once, and only once — after that the ring reads
  // itself. Without it a mark on a circle is decoration; with it, it is a
  // person. Deliberately "candles lit", not "people online": that is what the
  // dots are, including the ones that have gone dim.
  const others = Math.max(0, (litCount ?? 1) - 1);
  if (others === 0) return null;
  return (
    <p className="text-ink-3 text-xs">
      {others} {others === 1 ? 'other candle' : 'other candles'} lit this hour
    </p>
  );
}
