---
name: Meditate With Me
description: A warm, light room of one question at a time, in a rounded face, that leads to a bowl; strike it and the light goes down to dusk, where the earth shows who is sitting with you. Ember is spent on the one thing that goes forward. Nothing is in the background until the sitting.
colors:
  paper: "#f6e9d8"
  surface: "#fdf6ec"
  ink: "#3b2a1d"
  ink-2: "#6a5342"
  ink-3: "#76604f"
  rule: "#e6d5c1"
  ember: "#9c3d12"
  ember-soft: "#f8d7b8"
  glow: "#d9661f"
  dusk: "#2b1a10"
  dusk-ink: "#f6e9d8"
  dusk-ink-2: "#d7bfa6"
  flame: "#e0a057"
  white: "#ffffff"
typography:
  wordmark:
    fontFamily: "Comfortaa, ui-rounded, system-ui, sans-serif"
    fontSize: "2.25rem / 3.25rem at sm / 4rem at md / 4.5rem at lg / 5rem at xl"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.01em"
  question:
    fontFamily: "Comfortaa, ui-rounded, system-ui, sans-serif"
    fontSize: "1.75rem / 2.25rem at sm / 2.5rem at lg"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "normal"
  minutes:
    fontFamily: "Comfortaa, ui-rounded, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
  masthead:
    fontFamily: "Comfortaa, ui-rounded, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Nunito, ui-rounded, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  lede:
    fontFamily: "Nunito, ui-rounded, system-ui, sans-serif"
    fontSize: "1.0625rem / 1.125rem at sm / 1.1875rem at lg"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  control:
    fontFamily: "Nunito, ui-rounded, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  label:
    fontFamily: "Nunito, ui-rounded, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  clock:
    fontFamily: "Nunito, ui-rounded, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  control: "1rem"
  card: "1.5rem"
  action: "9999px"
spacing:
  xs: "0.5rem"
  sm: "1rem"
  md: "1.5rem"
  lg: "2rem"
  xl: "2.5rem"
  column: "28rem"
  gutter: "1.5rem / 2.5rem at sm / 3.5rem at md / 5rem at lg / 6rem at xl"
motion:
  rail: "300ms cubic-bezier(0.22, 1, 0.36, 1), a 1.5rem vertical switch"
  draw: "the line under a typed answer, over the prompt's typing time"
  settle: "240ms ease-out"
  colour: "200ms"
  strike: "600ms wobble, three 1400ms rings 180ms apart"
  breath: "4s ease-in-out, the live dot beside the count"
  lift: "1400ms cubic-bezier(0.4, 0, 0.2, 1)"
  hold: "10s"
  reduced: "rail 0ms, settle 0ms, lift 400ms crossfade, earth still"
components:
  button-primary:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.white}"
    typography: "{typography.control}"
    rounded: "{rounded.action}"
    padding: "0 1.5rem"
    height: "2.75rem"
  button-primary-sm:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.white}"
    fontSize: "0.875rem"
    fontWeight: 600
    rounded: "{rounded.action}"
    padding: "0 1.25rem"
    height: "2.375rem, 2.75rem hit area"
  field-line:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    borderBottom: "2px {colors.ink-3} at 80%"
    borderBottomFocus: "2px {colors.ember}"
    fontSize: "1.5rem / 1.75rem at sm"
    height: "3.5rem"
  button-quiet:
    backgroundColor: transparent
    textColor: "{colors.ink-2}"
    borderColor: "{colors.rule}"
    typography: "{typography.control}"
    rounded: "{rounded.action}"
    padding: "0 1.5rem"
    height: "2.75rem"
  button-quiet-hover:
    textColor: "{colors.ember}"
    borderColor: "{colors.ember}"
  button-quiet-dusk:
    backgroundColor: transparent
    textColor: "{colors.dusk-ink}"
    borderColor: "{colors.dusk-ink-2} at 55%"
    rounded: "{rounded.action}"
    height: "2.75rem"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    borderColor: "{colors.rule}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "2.75rem"
  chip-on:
    backgroundColor: "{colors.ember-soft}"
    textColor: "{colors.ember}"
    borderColor: "{colors.ember}"
  door:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.card}"
    padding: "1.25rem 1.5rem"
    minHeight: "6rem"
  door-on:
    borderColor: "{colors.ember}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.rule}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "3rem"
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.card}"
    padding: "1.25rem"
  switch:
    trackOff: "{colors.rule}"
    trackOn: "{colors.ember}"
    thumb: "{colors.white}"
    size: "2.75rem x 1.5rem"
  icon-trigger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.action}"
    size: "2.75rem"
  menu:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.control}"
    shadow: "0 12px 32px -12px rgb(59 42 29 / 0.35)"
    itemHeight: "2.75rem"
  word:
    backgroundColor: transparent
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    underline: "{colors.rule}, ember on hover"
  bowl:
    body: "{colors.glow} to {colors.ember}"
    rim: "{colors.flame}"
    size: "12rem"
  candle-sprite:
    family: "{colors.flame}, warm to pale"
    ring: "rgba(224,160,87,0.45) for your own"
---

# Meditate With Me — Design System

Extracted from the code on 14 September 2026, the day the warm rail replaced
the photographic room. Tokens are in `app/globals.css` (`@theme`), control
classes in `components/controls.ts`, motion in the same stylesheet's `:root`.
If a change makes this wrong, fix it in the same commit.

## Overview

**Creative North Star: "One question, then the bowl."**

The site is a sequence. It opens on this hour's earth with its name and two
doors — with everyone, or on your own; then it asks one thing at a time — your name and where you are
from the first time, how long, which bell, any sound — each on
its own screen, rising into place as the last lifts away. Nothing is
in the background. At the end is a bowl. Strike it and the light goes down to
dusk, the camera lifts, and you are seated in front of the earth, where the
people sitting with you are candles and one line says who they are. A clock
sits small in the corner because it is not the point.

Two grounds, and the boundary between them is the choice. **Paper** is for
who you are: your name, where you are, the account, the
documents, the map's page. **The room** is where you sit, from the doors that
open the site to the ending: the doors, the time, the bell, the sound, the
bowl, the earth, the clock. The room is **dawn or dusk**. It follows the
visitor's own day — dawn from six in the morning, dusk from six in the
evening — and a sun or moon beside the menu switches it until the day next
turns. Dusk is dark because candles are lights and a light needs a dark to
be seen in; dawn is the same room with the paper's values, for someone who
would rather not sit in the dark at noon. Home is the room too, and the map
at `/world` stays a dusk panel set on the paper, because it is a thing to be
read rather than a place to sit.

One face for what is said to you and one for what you say back. Comfortaa,
rounded and bold, is the wordmark, the question, and the minutes afterwards —
never smaller than 1.25rem, because its rounds close up under that. Nunito is
everything else: body, controls, fields, the clock's numerals in
`tabular-nums`. No serif, no mono, no uppercase.

Ember is the colour of going forward. It fills the one primary control on a
screen, outlines the chosen chip and the chosen door, and is the focus ring.
It is a deep brick red-brown, not the orange of the flame: the brighter
orange fails the contrast gate on paper as text, so it is **glow**, kept for
the bowl's body, the warmth behind the flame mark, and nothing a person has to
read or press.

**Key characteristics:**
- One screen, one question, one primary control. Back on the left, Next on
  the right, an optional quiet word between.
- The rail switches screens with a short vertical move — 1.5rem, 300ms, one
  easing — never a page sliding sideways. The frame, the margin and the menu
  in the corner stay still; only what is asked changes.
- Company is a sentence built from the earth (*Ana from Lisbon is meditating
  with you*), never a figure to compare; a number that was not read is left
  out.
- Every control is 44px to hit; the two doors are 78px, 96px from `md`. A typed answer is a
  line, not a box. Sentence case everywhere.
- Reduced motion is honoured in one place, and the rail, the strike and the
  lift all have a still version.

## Colors

A warm near-monochrome on two grounds: browns for type on paper, creams for
type on dusk, one ember for the action, one glow for decoration, one flame
family for the candles.

### On paper
- **Paper** (`#f6e9d8`): the page. Every deciding screen is this colour edge
  to edge; no gradient, no picture.
- **Surface** (`#fdf6ec`): a step lighter than paper. Fields, chips, cards,
  doors, the menu, the icon trigger. A surface is what says "this is a thing
  you can act on"; type never gets one.
- **Ink** (`#3b2a1d`): headings, the wordmark, field text, the chosen door's
  title. 11.4:1 on paper.
- **Ink-2** (`#6a5342`): body copy and control labels. 6.0:1.
- **Ink-3** (`#76604f`): captions, placeholders.
  4.9:1 — it is the floor, and it is the smallest type on the site, so nothing
  under 0.8125rem may use anything lighter.
- **Rule** (`#e6d5c1`): the hairline around a control, the divider in a list,
  a switch's off track. Decorative; never measured as text.
- **Ember** (`#9c3d12`): the action. Fills Next, Save, Sit again, Strike; outlines
  the chosen chip, the chosen door, the switch's on track; the focus ring.
  5.7:1 on paper, and white on it is 6.8:1.
- **Ember-soft** (`#f8d7b8`): the chosen chip's fill and the hover of a menu
  item. Ember on it is 5.0:1.
- **Glow** (`#d9661f`): decoration only. The bowl's body, the warmth on the
  share card. 3.0:1 on paper, which is why it is never text or a control
  edge.

### On dusk
- **Dusk** (`#2b1a10`): the sitting's ground, the ending's, and the panel the
  earth sits in. The ocean on the map is a shade warmer (`#34201a`) so the
  earth reads as an object on the dusk and not as a hole in it.
- **Dusk-ink** (`#f6e9d8`): the same value as paper, used as type on dusk.
  The company line, the clock, the minutes afterwards. 14:1.
- **Dusk-ink-2** (`#d7bfa6`): secondary on dusk — the ending's rows, the
  settings line. 9.5:1. At 55% it is the quiet control's border on dusk,
  3.8:1, which is the non-text floor.
- **Flame** (`#e0a057`): the candle family. The sprites on the earth are
  five pre-tinted variants of it, warm to pale; the ring around your own is
  it at 45%; the bowl's rim is it; the quiet control on dusk turns to it on
  hover. 7.4:1 on dusk.

### Named rules
- **Two grounds, one boundary.** Paper for the name and the place; the room
  everywhere else on the rail, from the doors until Done. `Journey` sets
  `data-room` on the frame and transitions its background — over half the lift
  when the rail steps into or out of the room, over the lift at the strike.
  Everything in the room is drawn in the `room-*` tokens (`room`, `room-ink`,
  `room-ink-2`, `room-edge`, `room-action`, `room-action-ink`,
  `room-action-ink-2`), which hold the dusk values in `@theme` and the paper
  values under `[data-room="dawn"]`. So at dusk the one lit control is flame
  with dusk type; at dawn it is ember with white, exactly the paper controls.
  The settings drawer follows the room like Home under it. The map at `/world` is still a dusk panel on paper.
- **The room follows the day.** `lib/room.ts`: dawn from 06:00 to 18:00 local,
  dusk otherwise. The toggle (`RoomToggle`, `ICON_ROOM`, beside the menu from
  the mode question through the sitting, and on Home) shows where it would
  take you — a sun in the dusk, a moon at dawn — and its choice, kept on the
  device as `mwm.room`, lapses at the next six o'clock, so a switch at noon
  does not mean the opposite at midnight.
- **Ember is for going forward.** One filled control per screen. Chosen
  states borrow its outline; hover on a quiet control borrows its colour.
  Delete account is a quiet chip, not a red one: there is no danger colour,
  and the safe answer (*Keep it*) is the one that gets the chosen treatment.
- **Glow is never read.** If it is in front of a person as words or as the
  edge of a control, it is the wrong token.
- **The gate is `npm run contrast`.** It reads `@theme` and checks every pair
  above, plus the 55% composite. A new colour is added to `scripts/contrast.mjs`
  in the same commit, or it is not added.

## Typography

- **Comfortaa 700** (`--font-display`): the wordmark (2.25rem, 3rem from
  `sm`), every question title (1.75rem, 2.25rem from `sm`, line-height 1.15),
  *When you are ready.* over the bowl, *Come back.* and the minutes on the
  ending (3.5rem), the masthead on Home and the map (1.25rem), a document's
  title and section headings. Comfortaa 400 is loaded but nothing uses it
  yet; a question is bold or it is not a question.
- **Nunito 400** (`--font-body`): body copy at 1rem / 1.625, captions at
  0.8125rem, the usual line on the doors.
- **Nunito 600**: every control label at 0.9375rem, the settings line, the
  status line under the number field, the clock at 1.25rem in
  `tabular-nums`. Nunito's tabular figures were checked on the clock at
  Phase 3 of the rebuild; the old Plex Mono is gone.
- **Sentence case.** No tracked uppercase anywhere; `tests/caps.test.ts`
  budgets one use of `uppercase` in `components/` and it is unspent.

### Named rules
- **The display face never goes below 1.25rem.** Its rounds are the point and
  they close up small.
- **One question per screen, and the question is the `h2`.** The rail moves
  focus to it on arrival, so it is also the announcement — except on the
  name, where focus goes straight to the field so typing needs no click. On a typed answer
  the `h2` is read and not seen; the prompt on the line says it instead.
- **Copy is a sentence.** *Strike the bowl to begin.* *Everyone finishes
  together at 12:55.* Not a label with a colon, not a fragment.

## Layout

- **One left margin, and everything on the rail hangs from it.** The gutter
  grows with the window — 1.5rem on a phone, 6rem on a wide laptop. A
  question's measure is still 28rem, because a field wider than that is
  harder to read, not easier; what changed on 14 September 2026 is that the
  column is anchored to the margin rather than floating in the middle of the
  window. The air is on the side the eye leaves.
- **One baseline for every question below `md`, and the foot belongs to the
  answer.** On a phone, `Screen` hangs the time, bell and sound questions
  (`middle`) from a fixed height under the bar — `clamp(3rem, 9vh, 5rem)`,
  since 22 September 2026; until then that branch had no phone padding at
  all and the heading sat under Back and the marks — so stepping from one
  question to the next moves the answer and nothing else; and Next sits
  directly under the control, at its right edge. `Screen`'s plain default,
  `clamp(1rem, 7vh, 5rem)`, has no caller today: every question is
  `middle`, `bare` or centred. Until 17 September 2026 the block was centred
  and the foot pinned to the window's bottom, which put the heading at a
  different height on every step (a two-line lede moved it sixty pixels) and
  left the buttons as much as three hundred pixels below what they answered,
  one hard left and one mid-column. The name and origin (`bare`) are the
  exception: they are only a line, so it sits in the middle of the frame, with
  Skip and Next under it (`LineActions`). The bowl still centres itself, and from
  `md` up the time, bell and sound questions leave the baseline and sit in the
  middle of the page, each question level with the middle of its control
  (`middle` on `Screen`), so the three read as one run into the bowl.
- **One bar across the top of every question** (`RailBar`). Back on the
  left, the marks in the middle of the window, the dawn or dusk toggle and
  the menu on the right: one 44px row on the page gutter, the same on every
  question from the name to the bowl, so neither Back nor the marks move
  while the questions change under them. The foot under an answer is only
  ever the way forward. Until 21 September 2026 the marks sat above each
  heading and Back at the foot beside Next, and the typed screens had Back in
  the corner and the marks below it on the margin — three heights, two
  margins.
- **A question says where it is.** `Steps`: one 3px mark per question, the
  one you are on twice as long and in the action colour, in the bar —
  and *Question 5 of 7* for anyone not looking at it. It counts the screens
  this visitor will actually see, so a returning guest's shorter rail is
  described honestly. A guest's front page (the doors) has none: it is the
  way in, not a question.
- **Two columns from `md` on every question that has an instrument.** The
  question left, the control right (`split`), both hanging from that
  baseline: the bell, the sound, and both time screens. A phone is unchanged.
- **The rail is a stack of panels in one frame.** `Rail` sets every panel
  `absolute inset-0`; the current one rises in (`rail-enter`) as the last
  lifts out (`rail-leave`), downward instead going back. Each panel is `h-dvh`
  and scrolls itself if it must; the page never does. Non-current panels are
  `inert`, `aria-hidden`, and `visibility: hidden` once the leaving one has
  faded. **A guest's menu is not on a panel**: `Journey` pins it top right
  over the rail, so it stays in place on every question until the strike.
- **The front page is the room.** A guest lands on the doors, on this
  hour's earth, with the wordmark where the question would be and the usual
  as one quiet line and a switch in the foot. There is no paper title page
  before it (retired 19 September 2026): the earth shows what the site is,
  and the first click is a door.
- **A question is title, lede, control, foot.** `Screen` puts the question and
  one line at the top of the column's vertical centre, the control under it,
  and a foot row on the safe-area inset: Back on the left, Skip (a quiet
  word) and Next on the right. **On the name and origin screens the foot
  is Back alone**, and the rest is `LineActions`, in the same places on both:
  Skip (*Leave it out* on the origin) under the left end of the line, arriving
  last once the prompt has typed itself out, and Next under its right end once something is typed — right,
  as on every foot, and in a right thumb's reach. The origin's share switch
  hangs under that row.
- **The doors sit low on a phone** (`Screen`'s `low`): under `sm` the question
  and the doors are at the bottom of the column, just over Back, in thumb
  reach; from `sm` up they are centred like every question. **From `md` up
  they sit side by side** (`split`): the question in a left column at the
  margin, at least 17rem, the doors in a right column up to 34rem, both centred on the
  frame's height, so a laptop's width is used and nothing is enlarged but
  the map.
- **The bowl is the one screen that centres itself** (`align="center"`). The
  rail walks in from the margin and arrives in the middle of the frame, which
  is where the camera lifts from and where the sitting is.
- **The sitting is one frame.** `Sitting` is `h-dvh` in the room: the clock top
  right, the earth centred at its own 2.055 aspect and capped so the company
  line under it always fits, Sound and End on the safe-area inset. By
  yourself, the bowl stays faintly centred where the earth would be.
- **The controls rest.** Sound, End, the dawn or dusk toggle (top left
  during the sitting) and the clock are there when it begins and fade over
  500ms after 4s without a tap or a key; any tap or key brings them back.
  Resting they take no pointer, so the waking tap never presses End. They
  stay while the sound sheet is open or focus is inside them.
- **The Sound sheet lies over the earth.** `room` at 90% with a `room-edge`
  hairline, card radius, absolute above Sound and End at `max-w-md`. It is
  never in the layout, so the earth does not move when it opens; the earth
  holds its frame behind it. Escape and a tap outside close it.
- **Home and the documents scroll.** Home is still a centred 28rem column —
  a page with a header, like the map's, rather than a panel on the rail:
  wordmark and menu in the header, greeting, the two doors, and the bar
  under them: *Your sitting* with its three answers as pills and *Change*,
  opening the settings drawer, and the *Go straight to the bowl* switch. The
  bar is `room` at 75% with a blur and a `room-edge` hairline, card radius,
  so it reads over the map.
  Panels behind the menu replace the body of the column and keep the header.
- **The map's page is the column at `max-w-3xl`**, so the dusk panel can be
  as wide as a laptop allows while the caption stays a paragraph.

## Elevation & Depth

Flat, with two exceptions. **Surfaces** are a step lighter than paper with a
rule hairline: that is the whole depth model for fields, chips, cards and
doors. **The menu** is the one thing that floats, with a 12px soft brown
shadow, because it is the one thing that is over something else. The bowl's
ripples are opacity, not shadow. On dusk there is no elevation at all: the
Sound sheet mid-sitting is `room` at 90% with a hairline, laid over the foot
of the earth, and the earth showing faintly through is the only sign it is
over anything.

### Named rules
- **No shadow on a control.** A chip, a door, a button is flat on its
  surface. If it needs to look pressable, the border or the fill does that.- **The lift is the only z-motion**, and it is the bowl panel scaling down
  and away while the sitting scales in.

## Shapes

- **Control radius 1rem** on fields, chips, the menu, the number field.
- **Card radius 1.5rem** on Home's settings bar, the delete confirmation,
  the candle's stage, the dusk panel around the earth at `/world`. The two
  doors on the earth are 1.25rem.
- **Pill** on every button and the icon trigger.
- **The bowl is a drawn SVG**: a body in glow-to-ember with a flame rim, and
  it wobbles and ripples when struck.
- **A candle sprite is a teardrop over a wick** with a halo and two glints,
  additive on the dusk, drawn at 1× and 1.5× for your own.

## Components

### Buttons
- **Primary** (`PRIMARY`): ember fill, white 600 text, pill, 44px,
  `hover:brightness-90`. One per screen: Next, Done, Save, Sit again,
  Confirm and enter.
- **The foot, small** (`PRIMARY_SM`, `QUIET_SM`, `WORD_SM`): Back, Skip and
  Next under every question, 38px to look at with 0.875rem type, and an
  `::after` that makes the target 44px. The question is the point; the way on
  only needs finding.
- **Quiet** (`QUIET`): rule outline, ink-2 text, pill, 44px; ember outline
  and text on hover. Back, Finish, Delete account, the map's Back.

- **The room's controls** (`PRIMARY_ROOM`, `PRIMARY_ROOM_SM`, `QUIET_ROOM`,
  `QUIET_ROOM_SM`, `WORD_ROOM`, `ICON_ROOM`, `FOCUS_ROOM`): the
  same shapes as their paper names, drawn in the `room-*` tokens. The edge is
  `room-edge` — dusk-ink-2 at 55% over dusk (3.8:1), ink-3 at 80% over paper
  at dawn (3.4:1), both precomputed so the gate reads them. `Screen` takes
  `room` for its heading, lede, marks and foot; `Switch` takes `room`. The
  Next and Back on time, bell, sound and the bowl, *Sit again* and Done are
  all these, and so are the tiles' own outlines and fills.
- **Word** (`WORD`): ink-2 600 text, underlined in rule, ember on hover.
  Skip, Leave it out, Change on the bowl screen, the foot of the account
  panel.
- **Icon trigger** (`ICON`): 44px round surface with a rule hairline. The
  menu's three lines and the account's.

### Chips
Surface fill, rule outline, ink-2 600, control radius, 44px. **On**:
ember-soft fill, ember outline, ember text. The *Until the bell at 12:55,
with everyone* stop under the slider; Keep it. On the room's own screens a
choice is a tile rather than a chip — see below.

### Tiles
A choice you can look at: card radius, a `room-edge` outline, a drawing above
its name, and the action colour — outline, tint at 15%, and the name — when
it is chosen. Two screens use them, and the shape is the same on both.

**The bells** (`BellScreen`) are three 11rem cards across the answer column:
a drawn bowl, gong and cast bell over the name and the instrument's character
in three words — *Warm, with a warble*, *Low, slowest to fade*, *Bright, with
a minor edge*. Tapping one sounds it and sends two rings out of the drawing,
the second 170ms behind the first (`bell-ring`), which is the only visible
receipt for a tap whose whole effect is a noise. Until 17 September 2026
these were three full-width chips with centred labels: a 700px target
carrying 15px of type, and nothing to choose between.

**The sounds** (`Sounds`) are six tiles — silence and the five beds —
two across on a phone and three from `sm`. Each carries a drawn texture, and
a chosen bed carries its own fader (`.room-range .range-room .range-tile`,
the tile's smaller grip on the same 44px row). Silence is a tile among them
and the one that starts chosen. Under the grid, once anything is on, one
*Volume* row: not a sixth sound but how loud the others are. It replaced a
lone switch that revealed a pale card of pills and an *Adjust levels* button
— the same question asked twice, the second time on a page of its own.

This is **one control in three places**, and since 20 September 2026 it is
one component: the rail's Sound question, *Underneath* in the settings
drawer, and the sheet the *Sound* button opens during a sitting. Before that
the drawer had the tiles with no level on them and the sitting had five
play-and-fader rows in the paper palette, so the mix you learned on the rail
was a different instrument at both of the other doors. The only thing that
varies is the wrap: in the sitting it is three across at every width
(`tight`), because there it shares the screen with the earth, and it lies
over the earth's foot rather than beside it, so the earth keeps its size.

### Timer dial
`TimerDial`, the with-others time question. A 14px ring in rule on a 280-unit
face, filled in ember clockwise from just past twelve o'clock to the hand; the
hand a small ember knob, 28 units across with a 3.5-unit paper ring, flat,
that swells to 115% while held. A small dot at every stop
(paper on the filled arc, ink-3 at 60% beyond it) and the shared bell's stop a
larger glow dot with *bell* outside the ring. The centre is the value — the
minutes in Comfortaa 2.5rem, or the bell's time — over its unit in ink-3, and
is not pressable. A gap at the top keeps the two ends from meeting. 15rem wide
on a phone, 16rem to 19rem in its column beside the sentence. Beside it, the
sentence is the screen's `h2`: Comfortaa 2.25rem to 3.75rem, the length and
the count in ember.

### Candle
`Candle`, the by-yourself time question. A stage with no fill of its own, on
the room's ground (a hairline `room-ink-2` ring keeps the cream wax distinct at
dawn): `clamp(15rem, 40vh, 24rem)` tall on a phone, full
column width; up to `min(62vh, 32rem)` in an 18rem to 22rem column beside the
sentence from `md`. On it a cream candle, 56px wide (64px from `md`), shaded
dusk-ink-2 → dusk-ink → dusk-ink-2 across and warmed with flame at 30% down
from its rim, a darker oval pool at the rim and two dusk-ink drips that
lengthen and draw back over seven seconds; on it a short ink wick and the
`FlameMark` at 44px, swaying from its base, in a flame glow at 34% that
breathes. Under it a saucer, dusk-ink-2 at 20%. **The height is the length**:
a stub at one minute, the full track at 55. Beside the rim, riding with it,
the minutes in Comfortaa 1.25rem flame over *min* in dusk-ink-2, and a 2px
tick for every stop (flame for the chosen one, dusk-ink-2 at 30%). Under the
stage, centred and always there, a 0.8125rem hint in dusk-ink-2 with a mark
in the action colour: on a laptop *Drag the candle up or down* beside an
arrow that nudges up at the candle every 1.4s; on a touch screen (`pointer:
coarse`) *Slide the candle up or down* beside a fingertip that slides up a
short track every 1.8s. Both go still at the first drag or key, and under
reduced motion. The whole
stage is the slider; held, the rim follows the finger and nothing eases; let
go, it settles on the rail's ease over 460ms. Far off on both sides, a light
for each other person on the page, 6–12px, a pale core in flame fading out,
arriving a few at a time and breathing at their own paces. No shadow. The
sentence beside it is the same `h2` as the dial's; the line under it has the
breathing glow dot when anyone else is there.

### The earth scene and the doors
`EarthScene`, the mode question and Home: the earth as the whole ground, in
the room's light — it sets `data-room` itself, so Home needs no frame around
it. At dawn `WorldMap` draws a daylight palette (ocean `#ecdcc6`, land
`#dcc6ab`, coast `#b9a085`, night a 20% wash of ink) and the candles multiply
rather than add, each with a small ember heart. This hour's `WorldMap` covers the frame
(`fit="cover"`) — the whole earth across the width on a laptop; on a phone
72% of the height, cropped around your place, or the device's time zone until
that is known, with the top of the map 6% down. Your place is a dashed
dusk-ink-2 ring with *You* beside it in Nunito 700 12px. `.earth-veil` fades
dusk down from the top under the menu and brings solid dusk up from the
bottom where the words are, with softened corners from `md`. On it, bottom
left: a line in flame 600 with the breathing dot — *43 others are sitting
right now*, *1 other person…*, or in dusk-ink-2 with an empty ring, *Nobody
else yet. Yours will be the first light.* — then the heading in Comfortaa 700,
2.125rem to 3.5rem, room-ink. The menu trigger and the toggle are `ICON_ROOM`
and Back is `QUIET_ROOM_SM`, still in the foot. The count line keeps its 1.5rem
while the count is unknown, so the heading does not move when it arrives.

Pressing a door both answers and advances; nothing is shown as chosen on
arrival. **Two doors, one shape**: 20px radius, 78px tall (96px from `md`),
Comfortaa 700 1.1875rem titles over a Nunito 600 line, an arrow on the
right that travels 2px on hover. Stacked on a phone and beside the heading
from `md`; side by side from `xl`, 19rem each.
- **Sit with everyone is lit**: flame fill, dusk type, the line in dusk at 80% (75% was 4.48:1, under the gate)
  — *Everyone finishes together at 12:55* — brightening on hover. Flame, not
  ember: on the dark ground the action is the candle's colour. At dawn it is ember with white type and a line in ember-soft (5.0:1).
- **Sit on your own is outlined**: dusk at 55% with a light blur over the map,
  a 1.5px `room-edge` outline (the same edge as `QUIET_ROOM`) that turns to the action colour on hover, *Your own
  length, the same sky* in dusk-ink-2.

### Fields
- **On the rail, a line** (`LINE` and `LINE_RULE`, through `LineField`): no
  box, a 2px line in ink-3 at 80% under 1.5rem type (1.75rem from `sm`), ink-2
  under the pointer, ember with the caret in it — and that ember line is the
  focus indicator. When the screen arrives the line draws itself out from the
  left while the prompt, *Enter your name* or *Enter your city*, types itself
  on it in ink-3 at 60% with an ember caret blinking at the front of the line,
  where the first letter will land; the two finish together. The
  prompt is clearly lighter than the ink an answer is typed in, and goes on
  the first key. The name and the origin, and on those two screens **the line
  is all there is**: no visible question and no line of explanation. The
  question stays as an `sr-only` `h2` (`Screen`'s `bare`). The name's line
  always arrives empty.
- **A place list under the origin line**: surface on rule with the menu's
  shadow, rows 44px, the town in ink 600 and the country beside it in ink-3;
  the active row ember on ember-soft. The last row is always *Keep "…" as you
  typed it*.
- **Everywhere else, a box** (`FIELD`): surface on rule, 48px, ink text,
  ink-3 placeholder, control radius; ember border on hover and focus. The
  minutes beside the slider, the account panel, signing in.

### Switch
`role="switch"`, 44×24 track, rule when off and ember when on, white thumb,
label to the right with an optional description under it in ink-3. A `dusk`
variant for the sitting's Sound sheet. *Sound on / In silence*, *Let others
see Ana from Lisbon while you sit with them*, *Go straight to the bowl*,
*Full screen*.

### Slider
`.room-range`: a rule track with an ember thumb, 44px hit height, over the
timer's stops with `aria-valuetext`, with the two ends labelled under it.
The drawer only: on the rail, by yourself is the candle and with
others is the dial.

### The drawer (menu and settings)
`SettingsDrawer.tsx`. From the right over Home, full height, up to 26rem
wide (the whole width on a phone), `room` ground with a `room-edge` hairline
on its left and a scrim over Home. Slides in over 300ms on `--ease-lift`;
none under reduced motion. *Menu* and the round close button, then the menu
as rows: Comfortaa 600 at 1.125rem, 56px tall, `room-edge` hairlines between,
action colour on hover — *Account*, *Settings*, *Your practice*, *Sign out*.
*Settings* is a disclosure with a chevron that turns over; it opens in place
(grid rows 0fr to 1fr, 300ms) to four sections headed in Comfortaa 600 at 1rem, each with an optional ink-2 aside
on the right: *How long* (the answer large in the action colour, the slider),
*The bell* (the three cards from the rail, smaller; *Tap to hear*),
*Underneath* (the same six tiles, faders and *Volume* as the rail's sound
question; *Heard in the sitting*), *Starting* (the switch). Chosen tiles are the
rail's: `room-action` border on `room-action` at 15%. The body scrolls
inside the drawer when the window is short. The three lines open it on the
menu; *Change* on Home's bar opens it with Settings already open.

### Cards
Surface on rule, card radius, 20px padding. The delete confirmation; the ending's fact rows are a list on dusk, not a card. The
usual on the front page is deliberately **not** a card — a bordered box made
last time's settings the second-loudest thing on the page the site opens
with, so it is a line of type and the switch beside it.

### Menu
Signed in, the three lines open the drawer above. Guest (`Account.tsx`): the
icon trigger opens a surface panel under it, right-aligned, control radius,
with the one shadow. Items are 44px, ink-2 600, ember-soft on hover and
focus. Up and Down wrap, Home and End, Escape closes and returns focus:
Create account, Sign in.

### The bowl
A 12rem drawn bowl inside a button labelled *Strike the bowl and begin*,
with *Strike the bowl to begin.* under it and the settings line under that.
Struck: a 600ms rim wobble and three 1400ms ripple rings 180ms apart, then the
lift. Under reduced motion, one opacity pulse.

### The earth
`WorldMap` on dusk: filled land a hair above the ocean, one coastline, no
borders, no labels, the real terminator. Each live cell is a candle sprite
with its own tint, rate and phase; your own is 1.5× with a flame ring. Under
it, one line in dusk-ink: who is with you, from the labels the world route
hands back, rotating every 20s when there are several.

### The clock
Nunito 600, 1.25rem, `tabular-nums`, dusk-ink, top right, `role="timer"`.
It is not the subject; it is never larger than this, and it rests with the
controls — a tap shows it.

## Motion

- **Rail**: `--rail-ms: 300ms`, `--ease-rail: cubic-bezier(0.22,1,0.36,1)`.
  The leaving panel lifts 1.5rem and fades in 150ms (`.rail-leave`); the
  arriving one rises 1.5rem into place over 300ms from 120ms in
  (`.rail-enter`). `--rail-dir` is -1 going back, which runs both downward.
  Nothing inside a panel animates its own arrival.
- **Settle**: `.screen-settle`, 240ms fade-up — the ending's column, and Next
  appearing under the name's line.
- **Colour**: 200ms on every control.
- **Typed prompt**: `useTypedOut`, 55ms a character (45ms more after a
  space) starting 200ms after the screen arrives, once per arrival; the caret
  blinks on `type-caret`, 1.1s in steps, and stays while the field is
  focused and empty, the real caret transparent until the first key. Under reduced motion the prompt is whole and the caret still.
- **Line draw**: `.line-draw`, `scaleX` from 0 from the left, starting with
  the typing and lasting `typingMs(prompt)`, so the line and the letters end
  together. Drawn whole under reduced motion.
- **The skip under a line**: `.screen-settle`, delayed by the prompt's
  start and typing time plus 120ms, so it is the last thing to arrive.
  Immediate under reduced motion.
- **The dial's knob**: held, drawn exactly under the finger on every move,
  the ember fill following it continuously while the value changes stop by
  stop; released or moved by a key, a critically damped spring stepped at
  240Hz, no bounce, with a 0.42s response onto the stop. The swell while
  held is 200ms ease-out. No spring and no swell
  under reduced motion.
- **Breath**: `live-breath`, 4s, the dot beside the count on the doors —
  the only thing there that moves on its own, and it never goes out. The
  count itself fades in over 500ms into a line whose height is already
  reserved, so nothing under it moves when the number arrives.
- **Strike**: `bowl-wobble` 600ms, `bowl-ripple` 1400ms ×3 at 180ms.
- **Lift**: `--lift-ms: 1400ms`; `.lift-out` on the rail (scale to 0.55,
  down 28vh, fade), `.lift-in` on the sitting (from 1.06 / 0 to 1 / 1), the
  frame's background, already the room, on the same clock.
- **Ending**: 10s hold on *Come back.* with the bell's tail, then 600ms
  fades.
- **Earth**: the shared breath and each candle's own flicker, from the cell's
  coordinates rather than `Math.random()`.
- **Reduced motion**: one `@media` block sets rail and settle to 0ms and the
  lift to 400ms with no transforms; `useReducedMotion` holds the earth's
  breath at 1 and its pulse at 0.5.

## Do's and Don'ts

### Do:
- **Do** ask one thing per screen, and make Next the only ember on it.
- **Do** keep paper for who you are and the room, dawn or dusk, for sitting,
  and change grounds only at the mode question.
- **Do** set the question in Comfortaa 700 and everything a person presses in
  Nunito 600; every changing number in `tabular-nums`.
- **Do** put a new colour through `scripts/contrast.mjs` before using it,
  and never use glow as text or as a control's edge.
- **Do** keep every control 44px and the by-yourself row 72px, on the safe-area inset
  when it is at the foot of the frame.
- **Do** omit a number rather than guess it; never report one candle as
  company; never invent a name on the earth.
- **Do** give every motion a reduced version, and put it in the one
  `@media (prefers-reduced-motion)` block.

### Don't:
- **Don't** put anything in the background of a question: no picture, no
  gradient, no earth, no candle. The background arrives with the sitting.
- **Don't** add a second filled control to a screen, a red for danger, or a
  second accent. Ember is the accent and it is for going forward.
- **Don't** use a serif, a mono, or tracked uppercase. The caps budget is
  one and it is unspent.
- **Don't** shadow a control, spring anything, or reveal on scroll. The
  menu is the one shadow; the rail, the strike and the lift are the motion.
- **Don't** let a question or the sitting scroll. Home, the account panel,
  the practice panel and the documents are the screens that may.
- **Don't** let a dashboard's vocabulary (stats, badges, progress) into the
  sitting or the ending. The facts afterwards are rows in a sentence's
  register, shown only when they say something.
