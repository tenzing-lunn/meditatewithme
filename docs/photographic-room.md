# Bringing the photographic room into meditatewithme

Everything here is presentation. Nothing in `lib/` changes, no new dependency,
and no new font — the type this needs is already loaded in `app/layout.tsx`.

Order: assets, component, keyframes, type, then `Room.tsx`.

---

## 1. Assets

```
handoff/room-base.png  →  public/room-base.png
handoff/flame.png      →  public/flame.png
```

`room-base.png` is the photograph with the flame painted off the wall (the wick
is still in it, and so is the light it casts on the wax and the dish).
`flame.png` is the flame alone, its alpha taken from its own luminance. They are
screen-composited back together at runtime, which is what lets the flame move
without dragging a rectangle of wall with it.

The original render has baked-in type ("Begin.", "Take a deep breath and settle
in."). Both files here are cleaned. Do not re-export from the original.

## 2. Component

```
handoff/CandleScene.tsx  →  components/CandleScene.tsx
```

It replaces `components/Candle.tsx`. Same shape of contract as the old one — a
number in, a glowing thing out — except the number is a phase rather than a
burn fraction:

```tsx
<CandleScene phase="idle" />
```

| Prop | Default | Does |
|---|---|---|
| `phase` | — | `load` · `idle` · `quiet` · `open` · `sitting` · `finished` |
| `wind` | `1` | how hard the pointer pushes the flame; `0` turns it off |
| `flicker` | `1` | how restless the flame is on its own; `0` is still |
| `intensity` | `1` | multiplies every camera move |
| `breath` | `true` | the slow continuous drift |

`prefers-reduced-motion` is honoured inside the component: the camera holds
still and the flame is drawn once.

One thing not to simplify: the loop keeps a 33ms `setInterval` alongside
`requestAnimationFrame`. rAF is only owed to a page the browser intends to
paint, so in a hidden, offscreen or throttled frame it can be deferred
indefinitely — and the flame, the first measurement and the `ResizeObserver`
callbacks all ride on it. The interval steps only when rAF has gone quiet. It is
what stops the candle arriving unlit with nothing thrown.

## 3. Keyframes

One block into `app/globals.css`. It is the only CSS the component needs; the
rest is inline because it is all derived from `phase`.

```css
@keyframes room-drift {
  0%, 100% { transform: scale(1.025) translate(0.3%, 0.2%); }
  50%      { transform: scale(1.05) translate(-0.4%, -0.6%); }
}

@media (prefers-reduced-motion: reduce) {
  .room-drift { animation: none !important; }
}
```

The existing `candle-breathe` / `candle-flicker` / `.glow` rules and the
`--color-wax-*` tokens go with `Candle.tsx` — nothing else reads them.

## 4. Type — nothing to install

The prototype was built on the Organic design system, whose display face is
Caprasimo. On a candle it read as an advertisement, so the prototype now uses
**the three faces this codebase already loads**, in the three roles
`globals.css` already defines:

| Role | Token | Face | Used for |
|---|---|---|---|
| Display | `--font-display` | Instrument Serif | `Begin.`, the questions, the closing line |
| Voice | `--font-body` | IBM Plex Sans | every control, every sentence |
| Numerals | `--font-numeral` | IBM Plex Mono | the sitting clock only |

So there is no font step. Use `font-display`, `font-sans` and `font-numeral`
as `Room.tsx` already does. Two things carried over from the prototype, because
Instrument Serif is optically smaller and looser than Caprasimo:

- display sizes go up about 15% (`text-6xl`/`sm:text-8xl` for `Begin.`),
- tracking stays near normal — drop `tracking-tight` from the masthead; a serif
  at that size does not want it.

Colour still comes from the design system: cream ink is `--color-ink` on the
dark room, and the ember (`--color-ember` #e0a057) is close enough to the
Organic terracotta that no token has to move.

## 5. Wiring it into `Room.tsx`

### 5a. Derive the phase

The room already owns every piece of state the camera needs.

```tsx
const [booted, setBooted] = useState(false);
const [openQuestion, setOpenQuestion] = useState<string | null>(null);

// `load` is the first paint — one held beat, then the five-second settle-in
// push into `idle`.
useEffect(() => {
  if (now === null) return;
  const t = window.setTimeout(() => setBooted(true), 200);
  return () => window.clearTimeout(t);
}, [now]);

const phase: ScenePhase =
  !booted                       ? 'load'
  : activity.kind === 'sitting'  ? 'sitting'
  : activity.kind === 'finished' ? 'finished'
  : openQuestion !== null        ? 'open'
  : !prefs.showCount             ? 'quiet'
  : 'idle';
```

### 5b. The scene is the page background, not an element in the column

Today `Focus()` returns the candle from inside the centred flow. The photograph
cannot live there — it is the room, so it goes behind everything and the column
renders over it.

`Focus()` stays. It still answers "what does this hour ask you to look at", and
it is still the only place a future focus loop gets added:

```tsx
function Focus({ session, phase }: { session: Session | null; phase: ScenePhase }) {
  switch (session?.focusSlug) {
    case 'candle':
    default:
      return <CandleScene phase={phase} />;
  }
}
```

In `Room`'s return, hoist it out of the column:

```tsx
return (
  <>
    <div className="fixed inset-0 -z-10">
      <Focus session={session} phase={phase} />
    </div>

    <div className="relative flex w-full flex-col items-center text-center">
      {/* the existing column, unchanged */}
    </div>
  </>
);
```

`burn` and `firstHere` stop being scene inputs. `firstHere` still drives
`PresenceMessage`; see "the burn" below for `candleBurn`.

### 5c. `SessionSetup` has to say when a question is open

It owns `open` privately. Add one optional callback — three lines, no behaviour
change:

```tsx
// props
onOpenChange?: (step: Step | null) => void;

// inside the component, after the existing useState for `open`
useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
```

Then in `Room`: `<SessionSetup … onOpenChange={setOpenQuestion} />`. The rack
focus is the only thing that needs it.

### 5d. `app/page.tsx`

Loses `justify-center` — the column now sits in the top band of the photograph,
above the flame — and the wrapper stops clipping the fixed layer:

```tsx
export default function Home() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center px-6 pt-10 pb-16">
      <Room />
    </main>
  );
}
```

Keep `overflow-hidden` off `main`; `CandleScene` clips itself.

### 5e. Then delete `components/Candle.tsx`

…and the `burn` plumbing, if you want it gone.

---

## The burn — a real decision, not a port detail

`candleBurn(now)` currently shortens the wax across the hour, and the README is
proud of "arrive at :50 and you get a stub". A photograph cannot shorten.

Two honest options:

1. **Keep it, spend it differently.** Feed `burn` into flame scale and glow
   strength, so a late arrival finds a smaller, dimmer flame. The idea survives;
   the mechanism changes.
2. **Drop it.** The candle becomes "the same candle everyone is watching" and
   nothing more.

Worth deciding before launch. Option 1 is two lines in `CandleScene` (multiply
the sprite height and the glow opacity); it is not built here because it changes
what the hour means.

## What in the prototype is prototype-only

- The countdown starts from the chosen duration and the clock is clickable to
  ring the bell early. `Room.tsx` already owns the real timer and the real bell
  on the audio clock — drop both.
- The presence lines are hard-coded strings. `usePresence()` supplies the real
  ones.
- The prototype has no practice log, sign-in or mixer. They are unchanged in the
  column.

## Values worth knowing

The flame's position in the photograph is four numbers at the top of
`CandleScene.tsx` (`F = { x: 720, y: 400, w: 98, h: 138 }`, in the 1536×1024
source). If the photograph is ever re-cropped or replaced, that constant and
`PHOTO_FOCUS_Y` are the only things that need to move.

The prototype fits the copy into the band of photograph *above* the flame, whose
height comes from cover-fitting a 3:2 image — a scale unrelated to the viewport
height type is sized against. On a short wide window the flame rises faster than
any `vh` clamp. If the column ever collides with the flame in the app, that is
the cause, and the prototype's fix is to publish the band as a custom property
and scale the copy into it.
