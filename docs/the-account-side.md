# The account side

What exists for somebody who has signed in: a way in from the landing, a home
to come back to, and a globe.

Four things were asked for. Three of them reverse a decision `context/ARCHITECTURE.md`
argues explicitly, so each one records which decision and why it is being
overturned rather than quietly contradicted.

---

## 1. A way in from the landing

**Reverses:** §16, "a first-time visitor cannot sign in before their first
sitting. That was judged the right price for a landing with one word on it."

That section pre-authorised this and prescribed its form: **"the fix is one
quiet line, not the row of three that used to be there."** So it is one control,
top right, and it is not a row.

- Visible only on the landing proper — `idle`, no setup open, signed out. It
  fades in with `Begin.` on the same 2.6s, because a control that arrives before
  the room has settled is an overlay on an animation.
- Pressing it asks for an address **the way the flow asks a question**: the
  camera racks to `open`, the form takes the band, and the same back arrow gets
  out of it. Sign-in is a question the room is asking, so it gets the camera the
  room uses for questions. Nothing new is invented for it.
- It is gone the moment somebody is signed in — a signed-in visitor never lands
  here.

`SignIn` splits into `SignInForm` (the fields, no surface) and `SignIn` (the
foot-of-frame button that opens the form inside a panel). The ending keeps the
second unchanged; the landing uses the first, in the band, where the band's own
darkness makes a panel unnecessary.

## 2. Home

**Reverses:** §16, "the page is one frame, and it does not scroll", and the
whole argument that the room is a photograph.

Deliberately, and only here. Home is not the room: it scrolls, it has a
masthead, and it shows several things at once. That is the point of it — the
room's one-thing-at-a-time discipline exists because somebody is about to
meditate, and a person deciding whether to is doing something different.

**The room's rules still bind the room.** Nothing in this section licenses type
on the photograph or a scrolling sitting.

What is on it, in order of size:

| Block | Why |
|---|---|
| `Sit` | The main focus, and the largest thing. One tap starts a sitting — see §3. |
| The settings it will use, spelled out | "10 minutes · singing bowl · rain and wind", with `Change` next to it. This is what pays for §3. |
| Your practice | The streak, the grid and the totals — `Practice`, reused unchanged. |
| Recent sittings | The list the room has never had room for. |
| The world | A live count, and the way through to §4. |

## 3. No second onboarding

**Reverses:** §16, "There is no 'you have done this before, skip it' path —
three screens opening on your own saved answers is a few seconds, and it is the
only moment the product has to ask a returning visitor whether today is a
ten-minute day."

The concern was real and it is answered rather than ignored: **the settings are
printed on Home, under the button that will use them.** The question "is today a
ten-minute day?" is still put to you every time — you read the answer instead of
walking three screens to re-confirm it, and `Change` is next to it.

Signed out, the flow is untouched. A guest still gets the three questions,
because a guest has no home to have read the answer on.

Two things that will break if they are forgotten:

- **The audio unlock has to happen in the `Sit` click.** Autoplay policy only
  starts an `AudioContext` inside a gesture. Room's `begin()` currently does it,
  but under §3 `begin()` runs from an effect on mount, which is not a gesture.
  So `unlockAudio()` and `mix.ensure()` move into Home's handler, and `useMix`
  lifts with them.
- **One instance of each hook.** `usePreferences`, `usePractice`, `useMix` and
  `useAuth` lift out of `Room` into `Entry` and are passed down. Two
  `usePreferences` would hold separate React state over one localStorage key and
  silently disagree; two `usePractice` would both sync.

`usePresence` does **not** lift. Heartbeating from a dashboard would put people
in the count who are reading their own streak, and §14 settled that the count
means "here", which a dashboard is not.

## 4. The globe

A page at `/world`: the earth, with a light where somebody is sitting.

### Where the lights come from

**Touches:** §14's still-open question, "do we record any analytics at all? …the
answer that needs no banner is 'none'."

It is no longer none, and the shape of what is recorded is chosen so the answer
stays defensible:

- The **server** derives an approximate position from Vercel's edge geo headers.
  The browser is never asked for permission and `navigator.geolocation` is not
  called.
- It is **snapped to a grid before it is stored** — the row holds the grid cell,
  not the reading. Nothing more precise than the cell ever exists in the
  database.
- It is stored on the existing `heartbeats` row, which is already anonymous,
  already keyed to one hour, and already pruned.

It is coarser than what an ordinary server access log holds, which is the bar it
was designed against. The privacy copy for it is drafted in
`plans/privacy-data-inventory.md`, alongside the rest of what the site stores;
step 08 fills in the controller name and publishes it.

### Why it does not break §5

§5's argument is that the count survives a simultaneous global join because the
response is **identical for every viewer**, so one edge-cache entry serves the
world. An aggregate of grid cells is identical for every viewer too. `/api/world`
therefore gets the same `s-maxage=10, stale-while-revalidate=20` pair and the
same reasoning, and the cliff in §11 does not move.

Nothing personal leaves the route: cells and counts, no ids.

### What is drawn

`three` (0.185), loaded only on `/world`, with NASA imagery:

| Asset | Source | Note |
|---|---|---|
| Day | Blue Marble `world.topo.bathy.200412.3x5400x2700` | Downscaled to 4096×2048 |
| Night | Black Marble `dnb_land_ocean_ice.2012.3600x1800` | Downscaled to 2048×1024 |

Both are NASA, public domain. Downscaled to powers of two before committing —
raw they are 3.4MB, which is more than the whole rest of the site.

The terminator is real: the sun's position is computed from the same clock the
candle uses, so the lit half of the earth is the lit half of the earth. Each
sitting is an ember point that blooms.

The room is untouched by all of this. `/world` is its own route and the room
does not import a line of it.

---

## Order

1. Migration — grid cell on `heartbeats`
2. `/api/heartbeat` stamps it · `/api/world` aggregates it
3. Lift the hooks into `Entry`; `Room` takes props
4. Split `SignIn`; the landing's corner control
5. `Home`
6. `Room`: start on mount, and come back to Home
7. `/world`

Typecheck, `npm test` and `npm run build` all pass before this goes near `main`.
