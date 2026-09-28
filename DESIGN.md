---
name: Meditate With Me
description: Pale water. A dull, very light grey-blue pond where everyone sitting this hour is a small stone with slow rings spreading from it. One sentence and Begin; your stone skims in and settles; the bell is one wide ring. Newsreader for what the site says, the system sans for what you press, slate for the one thing that goes forward.
colors:
  paper: "#e5e9ec"
  surface: "#eef1f3"
  ink: "#2a3136"
  ink-2: "#4f5a61"
  ink-3: "#5a656c"
  rule: "#cdd4d9"
  ember: "#3e4c55"
  ember-soft: "#d5dde2"
  glow: "#6f7b82"
  dusk: "#e5e9ec"
  dusk-ink: "#2a3136"
  dusk-ink-2: "#4f5a61"
  flame: "#3e4c55"
  flame-core: "#5f6a71"
  scrim: "#1b2226"
  white: "#ffffff"
typography:
  # Each role is a `--text-*` token in `@theme`; a role that grows with the
  # window carries its steps as `-sm`, `-md`, `-lg`, `-xl` tokens. Tailwind's
  # own scale is off. Floor 0.75rem, held by tests/type.test.ts.
  wordmark:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "2.25rem / 3.25rem at sm / 4rem at md / 4.5rem at lg / 5rem at xl"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.01em"
  sentence:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "2.125rem / 2.75rem at sm / 3.5rem at lg"
    fontWeight: 700
    lineHeight: "1.08 to 1.1"
    letterSpacing: "-0.015em on the earth, normal beside an instrument"
  question:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.75rem / 2.25rem at sm / 2.5rem at lg"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "normal"
  minutes:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
  section:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  masthead:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
  answer:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.5rem / 1.75rem at sm"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  clock:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: "normal"
    letterSpacing: "normal"
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  control:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: "normal"
    letterSpacing: "normal"
  caption:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  control: "1rem"
  card: "1.5rem"
  action: "9999px"
shadow:
  menu: "0 12px 32px -12px rgb(59 42 29 / 0.35)"
spacing:
  xs: "0.5rem"
  sm: "1rem"
  md: "1.5rem"
  lg: "2rem"
  xl: "2.5rem"
  column: "28rem"
  gutter: "1.5rem / 2.5rem at sm / 3.5rem at md / 5rem at lg / 6rem at xl"
motion:
  ease: "cubic-bezier(0.22, 1, 0.36, 1) for the rail, both halves, the settle and the draw"
  rail: "300ms, a 1.5rem vertical switch"
  draw: "the line under a typed answer, over the prompt's typing time"
  settle: "240ms"
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
    padding: "0 1.75rem"
    height: "3rem"
  button-primary-sm:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.white}"
    typography: "{typography.control}"
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
    padding: "0 1.75rem"
    height: "3rem"
  button-quiet-hover:
    textColor: "{colors.ember}"
    borderColor: "{colors.ember}"
  button-quiet-dusk:
    backgroundColor: transparent
    textColor: "{colors.dusk-ink}"
    borderColor: "{colors.dusk-ink-2} at 55%"
    rounded: "{rounded.action}"
    height: "3rem"
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
    padding: "0 1.25rem 0 1.375rem"
    minHeight: "4.875rem, 6rem from md"
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
    trackOff: "{colors.surface} outlined {colors.rule}"
    trackOn: "{colors.ember-soft} outlined {colors.ember}"
    thumbOff: "{colors.ink-3}"
    thumbOn: "{colors.ember}"
    track: "3.5rem x 2rem"
    thumb: "1.25rem, travelling 1.5rem"
    row: "2.75rem, the label beside it in {typography.control}"
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
    shadow: "{shadow.menu}"
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
    family: "{colors.flame}, warm to pale, a {colors.flame-core} centre"
    ring: "{colors.flame} at 85% for your own, {colors.ember} at dawn"
---

# Meditate With Me — Design System

> **Pale water, 22 September 2026, on `dev`.** The tokens above are the new
> values; the palette, the type and the three screens a visitor sees (the
> arrival, the sitting, the ending) were replaced to match the Pale water
> wireframes on the redesign canvas. Where the prose below still speaks of
> warm paper, ember, dusk, candles, the earth, Comfortaa or Nunito, it
> describes the look being replaced and has not been rewritten yet. What is
> built: `components/Pond.tsx` (one canvas, every frame: stones, rings, the
> skim, the bell ring), `components/Arrive.tsx` (the sentence and Begin),
> `components/Brand.tsx` (the stone-in-rings mark and the serif name), and
> `Sitting` and `Afterwards` redrawn over the pond. Home, Settings, Account
> and the documents only took the new tokens.


Extracted from the code on 14 September 2026, the day the warm rail replaced
the photographic room, and corrected against it on 22 September 2026, when
the type became tokens. Tokens are in `app/globals.css` (`@theme`), control
classes in `components/controls.ts`, motion in the same stylesheet's `:root`
and its reduced version in the one block at the file's end. If a change
makes this wrong, fix it in the same commit.

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
would rather not sit in the dark at noon. Home is the room too.

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
- **Ember** (`#9c3d12`): the action. Fills Next, Save, Done, Strike; outlines
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
- **Dusk-ink-2** (`#d7bfa6`): secondary on dusk — the ending's row, the
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
  The room is also settled on `<body>` before the first pixel, by an inline
  script at the top of the body in `app/layout.tsx` running the same rule, and
  `body` paints `--color-room`: the first screen of the site is always the
  room, and until 22 September 2026 the window paid for that by painting paper
  and then turning dark the moment React arrived.
  Everything in the room is drawn in the `room-*` tokens (`room`, `room-ink`,
  `room-ink-2`, `room-edge`, `room-action`, `room-action-ink`,
  `room-action-ink-2`), which hold the dusk values in `@theme` and the paper
  values under `[data-room="dawn"]`. So at dusk the one lit control is flame
  with dusk type; at dawn it is ember with white, exactly the paper controls.
  The settings drawer follows the room like Home under it.
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

Eleven roles, each a `--text-*` token in `@theme` and nothing else: since
22 September 2026 Tailwind's own scale is switched off there, so a size that
is not a role cannot be written, and `tests/type.test.ts` fails on any
`text-[…]`, any `text-sm`, and any token under 0.75rem. A role that grows
with the window carries its steps as suffixed tokens (`text-question
sm:text-question-sm lg:text-question-lg`). Before that the site had 33
sizes for nine declared roles, three of them under 12px.

- **Comfortaa 700** (`--font-display`), and only 700 is loaded: the
  **wordmark** (2.25rem, up to 5rem at `xl`); the **sentence** — the
  question on the earth, *Hello, Ana.* and *How will you sit?*, the sentence
  beside the candle and the dial, *Come back.*, and the answer large in the
  dial's centre and the drawer's *How long* (2.125rem, 2.75rem from `sm`,
  3.5rem from `lg`); the **question** on a rail screen, *When you are
  ready.*, a document's or a panel's title (1.75rem, 2.25rem from `sm`,
  2.5rem from `lg`, line-height 1.15); the **minutes** on the ending
  (3.5rem); a **section** heading — the drawer's *Menu*, a document's
  sections, the account panel's, the practice log's number, the dial's bell
  time (1.5rem); and the **masthead** — the wordmark in a corner, a door's
  title, the candle's minutes, the drawer's unit (1.25rem). A question is
  bold or it is not a question.
- **Nunito 400** (`--font-body`): **body** at 1rem / 1.625 — copy, the line
  under a question, a field; the **answer** typed on the rail's line
  (1.5rem, 1.75rem from `sm`); the **clock** in the sitting and the
  six-digit code, in `tabular-nums` (1.25rem); the **caption** — a hint, a
  label over a field, the usual on the doors, a tile's three words, the
  ends of a slider (0.8125rem).
- **Nunito 600**: the **control** — every button, chip, word, switch label,
  menu item, the line on a door, and every tile's name (0.9375rem); the
  drawer's rows at the masthead size and its section headings at the body
  size, since they are controls and headings under the display floor, not
  display. Nunito's tabular figures were checked on the clock at Phase 3 of
  the rebuild; the old Plex Mono is gone.
- **Sentence case.** No tracked uppercase anywhere; `tests/caps.test.ts`
  budgets one use of `uppercase` in `components/` and it is unspent.

### Named rules
- **The display face never goes below 1.25rem.** Its rounds are the point and
  they close up small. Until 22 September 2026 the bell and sound tiles and
  the drawer's rows and headings set it at 0.875rem to 1.125rem; those are
  controls and are Nunito 600 now.
- **A size is a role.** Wanting a new one is a decision about the system,
  made in `@theme` with a name, not in a class string with a number.
- **One question per screen, and the question is the `h2`.** The rail moves
  focus to it on arrival, so it is also the announcement — except on the
  name, where focus goes straight to the field so typing needs no click. On a typed answer
  the `h2` is read and not seen; the prompt on the line says it instead.
- **Copy is a sentence.** *Silence is the usual answer.* *Everyone finishes
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
  `clamp(1rem, 7vh, 5rem)`, has one caller: the name question, since it
  stopped being `bare` on 22 September 2026; every other question is
  `middle`, `bare` or centred. Until 17 September 2026 the block was centred
  and the foot pinned to the window's bottom, which put the heading at a
  different height on every step (a two-line lede moved it sixty pixels) and
  left the buttons as much as three hundred pixels below what they answered,
  one hard left and one mid-column. The origin (`bare`) is the
  exception: it is only a line, so it sits in the middle of the frame, with
  Skip and Next under it (`LineActions`). The name hangs from the baseline
  like any question — title, one line, the line field, `LineActions` under
  it. The bowl still centres itself, and from
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
  and *Question 5 of 6* for anyone not looking at it. It counts the screens
  this visitor will actually see, so a returning guest's shorter rail is
  described honestly; the words count the questions without the bowl, and
  the bowl's own mark, the last, is read as *The bowl*. A guest's front page
  (the doors) has none: it is the way in, not a question.
- **Two columns from `md` on every question that has an instrument.** The
  question left, the control right (`split`), both hanging from that
  baseline: the bell, the sound, and both time screens. A phone is unchanged.
- **The rail is a stack of panels in one frame.** `Rail` sets every panel
  `absolute inset-0`; the current one rises in (`rail-enter`) as the last
  lifts out (`rail-leave`), downward instead going back. The **first** panel
  does neither: `rail-enter` waits out the leaving panel's fade before it
  starts, and on arrival at the site there is nothing leaving, so the wait
  was 420ms of an empty window after everything had already loaded. A
  question answered is an arrival; the front door is not. Each panel is `h-dvh`
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
  Skip under the left end of the line, arriving
  last once the prompt has typed itself out and not in the tab order until
  then, and Next under its right end once something is typed — right,
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
doors. **The menu** is the one thing that floats — the guest's two doors,
the account panel and the place list under the origin's line, all on
`--shadow-menu`, the one shadow token — because it is the one thing that is
over something else. The bowl's ripples are opacity, not shadow. On dusk
there is no elevation at all: the Sound sheet mid-sitting is `room` at 90%
with a hairline, laid over the foot of the earth, and the earth showing
faintly through is the only sign it is over anything; the settings drawer is
`room` with a hairline on its left and the scrim over Home, no shadow.

### Named rules
- **No shadow on a control.** A chip, a door, a button, a slider's thumb is
  flat on its surface. If it needs to look pressable, the border or the fill
  does that. (The thumb and the drawer carried shadows until 22 September
  2026.)
- **The lift is the only z-motion**, and it is the bowl panel scaling down
  and away while the sitting scales in.

## Shapes

- **Control radius 1rem** on fields, chips, the menu, the number field.
- **Card radius 1.5rem** on Home's settings bar, the delete confirmation,
  the candle's stage, the tiles, and the two doors on the earth (1.25rem
  until 22 September 2026, the one radius that was neither).
- **Pill** on every button and the icon trigger.
- **The bowl is a drawn SVG**: a body in glow-to-ember with a flame rim, and
  it wobbles and ripples when struck.
- **A candle sprite is a teardrop over a wick** with a halo and two glints,
  additive on the dusk, drawn at 1× and 1.5× for your own.

## Components

### Buttons
- **Primary** (`PRIMARY`): ember fill, white control text, pill, 48px with
  1.75rem of padding, `hover:brightness-90`. One per screen: Next, Done (or
  Finish), Save, Confirm and enter, Continue and Send me a code on the
  account panel.
- **The foot, small** (`PRIMARY_SM`, `QUIET_SM`): Back, Skip and Next under
  every question, 38px to look at in the same control type, and an `::after`
  that makes the target 44px. The question is the point; the way on only
  needs finding. Skip there is the plain `WORD`.
- **Quiet** (`QUIET`): rule outline, ink-2 text, pill, 48px; ember outline
  and text on hover. Back, Finish, Delete account, the map's Back.

- **The room's controls** (`PRIMARY_ROOM`, `PRIMARY_ROOM_SM`, `QUIET_ROOM`,
  `QUIET_ROOM_SM`, `WORD_ROOM`, `ICON_ROOM`, `FOCUS_ROOM`): the
  same shapes as their paper names, drawn in the `room-*` tokens. The edge is
  `room-edge` — dusk-ink-2 at 55% over dusk (3.8:1), ink-3 at 80% over paper
  at dawn (3.4:1), both precomputed so the gate reads them. `Screen` takes
  `room` for its heading, lede, marks and foot; `Switch` takes `room`. The
  Next and Back on time, bell, sound and the bowl, Done and *Sit again* are
  all these, and so are the tiles' own outlines and fills.
- **Word** (`WORD`): ink-2 control text, underlined in rule, ember on hover,
  44px tall. Skip, Change on the bowl screen, the foot of the account panel.
- **Menu item** (`MENU_ITEM`): a row on the guest's menu, 44px, ink-2 control
  text, ember on ember-soft on hover and on focus.
- **Icon trigger** (`ICON`): 44px round surface with a rule hairline. The
  menu's three lines and the account's.

All of them are `controls.ts`'s; the account panel had its own set at 44px
and `ring-1` until 22 September 2026.

### Chips
Surface fill, rule outline, ink-2 600, control radius, 44px. **On**:
ember-soft fill, ember outline, ember text. The *Until the bell at 12:55,
with everyone* stop under the slider; Keep it. On the room's own screens a
choice is a tile rather than a chip — see below.

### Tiles
A choice you can look at: card radius, a `room-edge` outline, a drawing above
its name in Nunito 600 at the control size (a tile is a control; until 22
September 2026 the name was the display face at 0.875rem), and the action
colour — outline, tint at 15%, and the name — when it is chosen. Two
screens use them, and the shape is the same on both.

**The bells** (`BellScreen`) are three 11rem cards across the answer column:
a drawn bowl, gong and cast bell over the name and the instrument's character
in three caption words — *Warm, with a warble*, *Low, slowest to fade*,
*Bright, with a hard edge*. Tapping one sounds it and sends two rings out of
the drawing, the second 170ms behind the first (`bell-ring`), which is the
only visible receipt for a tap whose whole effect is a noise. The three are
one `radiogroup` of `radio`s, not three toggles: one tab stop, and the
arrows move the choice and ring the bell they land on — on the rail and in
the drawer alike. Until 17 September 2026 these were three full-width chips
with centred labels: a 700px target carrying 15px of type, and nothing to
choose between.

**The sounds** (`Sounds`) are nine tiles — silence and the eight beds —
two across on a phone and three from `sm`, each carrying a drawn texture.
Silence is a tile among them and the one that starts chosen. Under the grid,
once a bed is on, one *Volume* row: not a tenth sound but how loud that bed
is. It replaced a lone switch that revealed a pale card of pills and an
*Adjust levels* button — the same question asked twice, the second time on a
page of its own.

Since 22 September 2026 the six are **one exclusive choice**, drawn like the
bells next door: a `radiogroup` of `radio`s, one tab stop, the arrows moving
the choice. Before that each tile was a toggle carrying its own fader and the
beds stacked, so *Volume* was a master over however many were on at once. The
client's instruction is that the sounds are individual — one at a time, one
volume over whichever it is — so choosing a bed silences the rest and the way
to hear nothing is the Silence tile. The per-tile faders went with the
stacking, and with them the `h-11` spacer that kept a tile with no fader the
same height as one with: the six are the height of a texture and a word.

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
larger dot in the action colour (glow, until 22 September 2026, and glow is
never read) with *bell* outside the ring — HTML laid over the drawing as a
caption in room-ink-2, since 22 September 2026; as SVG text it scaled with
the face to under 10px on a phone. The centre is the value — the minutes at
the sentence size, 2.125rem, or the bell's time at the section size — over
its unit as a caption, and is not pressable. A gap at the top keeps the two
ends from meeting. 15rem wide on a phone, 16rem to 19rem in its column
beside the sentence. Under it, centred, a caption hint in room-ink-2, *Turn
the dial*, that fades out over 200ms at the first drag or key and keeps its
line, so Next does not move. Beside it, the sentence is the screen's `h2` at
the sentence size, all of it in room-ink: the dial changes the length, and
with the count in ember (until 22 September 2026) the count read as something
to press.

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
the minutes at the masthead size in flame over *min* as a caption in
dusk-ink-2, and a 2px tick for every stop (flame for the chosen one,
dusk-ink-2 at 30%). Under the
stage, centred and always there, a caption hint in dusk-ink-2 with a mark
in the action colour: on a laptop *Drag the candle up or down* beside an
arrow that nudges up at the candle every 1.4s; on a touch screen (`pointer:
coarse`) *Slide the candle up or down* beside a fingertip that slides up a
short track every 1.8s. Both go still at the first drag or key, and under
reduced motion. The whole
stage is the slider; held, the rim follows the finger and nothing eases; let
go, it settles on the rail's ease over 460ms. Far off on both sides, a light
for each other person on the page, 6–12px, a flame-core centre in flame
fading out, arriving a few at a time and breathing at their own paces. The
flame's glow and the warmth down the wax are flame at 34% and 30%
(`.candle-glow`, `.candle-warmth`). No shadow. The
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
arrival. **Two doors, one shape**: card radius, 78px tall (96px from `md`),
titles at the masthead size in Comfortaa 700 over a Nunito 600 line at the
control size, an arrow on the right that travels 2px on hover. Stacked on a
phone and beside the heading from `md`; side by side from `xl`, 19rem each.
- **Sit with everyone is lit**: flame fill, dusk type, the line in dusk at 80% (75% was 4.48:1, under the gate)
  — *Everyone finishes together at 12:55*, or *Your own length, with
  everyone* when a private length will survive the door (`togetherLine`) —
  brightening on hover. Flame, not
  ember: on the dark ground the action is the candle's colour. At dawn it is ember with white type and a line in ember-soft (5.0:1).
- **Sit on your own is outlined**: dusk at 55% with a light blur over the map,
  a 1px `room-edge` outline (the same edge as `QUIET_ROOM`; 1.5px until 22
  September 2026) that turns to the action colour on hover, *Your own
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
`role="switch"` on a 44px row that is the whole control: a 56×32 track,
surface outlined in rule when off and ember-soft outlined in ember when on,
with a 20px thumb that is ink-3 off and ember on and travels 24px; the label
to its right in control type, ember when on, with an optional caption
description under it in ink-3. A `dusk` variant (flame at 20%, flame thumb)
for the sitting's Sound sheet and a `room` one (`room-action`) for Home's
bar. *Sound on / In silence*, *Let others see Ana from Lisbon while you sit
with them*, *Go straight to the bowl*, *Full screen*.

### Slider
`.room-range`: a rule track with a flat ember pill for a thumb, 44px hit
height, over the timer's stops with `aria-valuetext`, with the two ends
labelled under it as captions.
The drawer only: on the rail, by yourself is the candle and with
others is the dial.

### The drawer (menu and settings)
`SettingsDrawer.tsx`. From the right over Home, full height, up to 26rem
wide (the whole width on a phone), `room` ground with a `room-edge` hairline
on its left and the `scrim` at 45% over Home. Slides in over 300ms on
`--ease-lift`; none under reduced motion. *Menu* at the section size and the
round close button, then the menu as rows: Nunito 600 at the masthead size,
56px tall, `room-edge` hairlines between, action colour on hover —
*Account*, *Settings*, *Your practice*, *Sign out*.
*Sign out* asks once more in its own row before it acts — *Sign out?*, with
*Stay* (`PRIMARY_ROOM_SM`) and *Yes, sign out* (`QUIET_ROOM_SM`) — the
delete confirm's pattern, the way out emphasised and the act quiet.
*Settings* is a disclosure with a chevron that turns over; it opens in place
(grid rows 0fr to 1fr, 300ms) to three sections headed in Nunito 600 at the
body size, each with an optional caption aside on the right: *How long* (the
answer at the sentence size in the action colour, the slider, its last stop
always *Until the bell*), *The bell* (the three cards from the rail, smaller,
the same `radiogroup`; *Tap to hear*),
*Underneath* (the same nine tiles and *Volume* as the rail's sound
question; *Heard in the sitting*). The skip switch is on Home's bar alone. Chosen tiles are the
rail's: `room-action` border on `room-action` at 15%. The body scrolls
inside the drawer when the window is short. The three lines open it on the
menu; *Change* on Home's bar opens it with Settings already open.

### Cards
Surface on rule, card radius, 20px padding. The delete confirmation; the ending's one row is a list on dusk, not a card. The
usual on the front page is deliberately **not** a card — a bordered box made
last time's settings the second-loudest thing on the page the site opens
with, so it is a line of type and the switch beside it.

### Menu
Signed in, the three lines open the drawer above. Guest (`Account.tsx`): the
icon trigger opens a surface panel under it, right-aligned, control radius,
with the one shadow. Items are 44px, ink-2 600, ember-soft on hover and
focus. Up and Down wrap, Home and End, Escape closes and returns focus:
Create account, Sign in.

### The two doors and the fish

On `dev` only (27 September 2026). The guest's front page is the pond
with *How would you like to sit?* in the question role and two doors
under it: `rounded-card`, a `rule` edge that turns `ember` on hover, a
`surface` fill at 80%, 88px tall (100px from `sm`, side by side there,
stacked on a phone), a small mark (a grey fish; a framed figure in ember)
before a 1.25rem title and a control-size line in `ink-2`.

Everyone else sitting right now is a fish — nobody else here, no fish,
and never one for yourself — `#7a868d` at 55–85% opacity, 20px nose to
tail on desktop and 15px on a phone, 14px and 11px once there are more
than a hundred. A fish swims nose first: it steers toward where it
belongs at a limited rate of turn, speeds up and slows down smoothly
(a cruise of a quarter of a body length a second, up to four and a half,
ten for the moment a touch startles it), and never slides sideways, backs
up or turns on the spot. Calm, it never turns on a radius under a body
length and a half (half a body length when startled), so
it sweeps round rather than chasing its tail. Within about a body length
of its place it slows to a drift and hardly steers, so it hangs there,
turning now and then. Its
spine has three joints, head, body and tail, with a forked fin off the
tail. A turn curves the body along the path the head took, and a wave
runs from head to tail, barely at the head and most at the fin, beating
faster and wider the faster it swims, so a gliding fish hardly moves
(`swim` in `lib/fish.ts`). Each fish swims in its person's part of the world on a loose
map of the water — west on the left, north at the top, 62°N to 43°S
filling the band — from the one-degree cell of their heartbeat. Quiet
water: each fish wanders a small loop around its place. Crowded (more
than one fish per 12,000 px²): each region (24° by 16°) mills as one
swarm around the region's middle, roughly 60 to a swarm. Which
swarm a fish joins is hashed so that one person coming or going moves
nobody else's fish, or only those of a swarm that appears or goes. The place is
written beside a fish only when its person chose to share it (*Ana from
Lisbon*); nobody is named or placed in words without choosing it. A touch pushes the ones within eleven body-lengths
straight away, easing off over five seconds, and they dart away before drifting back.
Under reduced motion the fish are still, straight, each where it belongs;
none in a guided sitting.

Once a door is chosen, a chevron in the top-left corner, in the menu's own
44px square (`ICON`) before the mark, goes back to the two doors: on the
*By yourself* screen it steps back, and in a sitting (either door) it
ends the sitting the way *End* does and lands on the doors — Home for
somebody signed in. It rests and wakes with the sitting's other controls.

### The live window

On `dev` only (27 September 2026). Whoever is on camera, in a guided
sitting: a 16:9 window centred on the pond, `max-w-4xl`, `rounded-card`, a
`rule` edge, `scrim` behind the picture until it plays, no shadow. The
pond stays the ground — its rings and the sitting's words sit around the
window, never on the picture, so nothing needs a wash to be read. It fades
in over 1000ms once frames play and out the same way; under reduced motion
it simply appears. Silent, no controls, never full-bleed. Between two
people on camera it is gone and the company line says when the next
session starts.

### The bowl
A 12rem drawn bowl inside a button labelled *Strike the bowl and begin*,
with the settings line under it. (A caption, *Strike the bowl to begin.*,
sat between them until 22 September 2026: the screen said "begin" four ways.)
Struck: a 600ms rim wobble and three 1400ms ripple rings 180ms apart, then the
lift. Under reduced motion, one opacity pulse.

### The earth
`WorldMap` on dusk: filled land a hair above the ocean, one coastline, no
borders, no labels, the real terminator. Each live cell is a candle sprite
with its own tint, rate and phase; your own is 1.5× with a 1.5px flame ring
at 85% (ember at dawn) — the same strength as the dashed *You* ring before the
strike; at 1px and 45% it was lost under the candle's own glow. Under
it, one line in dusk-ink: who is with you, from the labels the world route
hands back, rotating every 20s when there are several.

### The clock
Nunito 400 at the clock size, 1.25rem, `tabular-nums`, room-ink-2, top
right, `role="timer"`. It is not the subject; it is never larger than this,
and it rests with the controls — a tap shows it.

## Motion

- **One curve**: `--ease-rail: cubic-bezier(0.22,1,0.36,1)` is the house
  easing, for the rail (both halves), the settle, the line's draw, the
  candle's settle and the far lights' arrival. `--ease-lift` is the lift's
  and the drawer's alone; the loops breathe on `ease-in-out`; the strike's
  rings, a tapped bell's and the dial's swell are `ease-out`, a release. Until
  22 September 2026 the rail's leave was `ease-in` and the draw a third
  bezier of its own.
- **Rail**: `--rail-ms: 300ms`. The leaving panel lifts 1.5rem and fades in
  150ms (`.rail-leave`); the arriving one rises 1.5rem into place over 300ms
  from 120ms in (`.rail-enter`). `--rail-dir` is -1 going back, which runs
  both downward. Nothing inside a panel animates its own arrival.
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
- **Ending**: 10s hold on *Come back.* over the ended sitting — the earth
  stays, the clock goes, the controls rest — with the bell's tail, then
  the minutes settle in.
- **Earth**: the shared breath and each candle's own flicker, from the cell's
  coordinates rather than `Math.random()`.
- **Reduced motion**: one `@media` block, at the end of `globals.css`, sets
  rail and settle to 0ms and the lift to 400ms with no transforms, stills
  every loop, and makes the strike one pulse; `useReducedMotion` is the one
  read for the moves decided in JS, and `WorldMap` takes it as `reduced` from
  `Sitting` and `EarthScene` — no loop, one still frame, a redraw on the
  minute for the terminator. (Ten blocks and a `matchMedia` of the earth's
  own, until 22 September 2026.)

## Do's and Don'ts

### Do:
- **Do** ask one thing per screen, and make Next the only ember on it.
- **Do** keep paper for who you are and the room, dawn or dusk, for sitting,
  and change grounds only at the mode question.
- **Do** set the question in Comfortaa 700 and everything a person presses in
  Nunito 600; every changing number in `tabular-nums`; every size as a role
  token, never a number.
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
  menu is the one shadow (`--shadow-menu`); the rail, the strike and the
  lift are the motion, on the one curve.
- **Don't** let a question or the sitting scroll. Home, the account panel,
  the practice panel and the documents are the screens that may.
- **Don't** let a dashboard's vocabulary (stats, badges, progress) into the
  sitting or the ending. The one fact afterwards — who was with you — is a
  row in a sentence's register, shown only when it is known. No streak, no
  total, no countdown: the ending is not a scoreboard.
