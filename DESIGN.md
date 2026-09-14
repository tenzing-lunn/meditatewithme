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
  title-column: "46rem"
  gutter: "1.5rem / 2.5rem at sm / 3.5rem at md / 5rem at lg / 6rem at xl"
motion:
  rail: "520ms cubic-bezier(0.22, 1, 0.36, 1)"
  settle: "240ms ease-out"
  colour: "200ms"
  strike: "600ms wobble, three 1400ms rings 180ms apart"
  breath: "4s ease-in-out, the live dot on the welcome"
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
  button-primary-lg:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.white}"
    fontSize: "1.0625rem"
    fontWeight: 600
    rounded: "{rounded.action}"
    padding: "0 2rem"
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

The site is a sequence. A warm, light screen says its name and invites you to
join a session; then it asks one thing at a time — your name, where you are
from, with others or by yourself, how long, which bell, any sound — each on
its own screen, sliding in from the right as the last slides out. Nothing is
in the background. At the end is a bowl. Strike it and the light goes down to
dusk, the camera lifts, and you are seated in front of the earth, where the
people sitting with you are candles and one line says who they are. A clock
sits small in the corner because it is not the point.

Two grounds, and the boundary between them is the strike. **Paper** is for
deciding: every question, the home, the account, the documents, the map's
page. **Dusk** is for sitting: the earth, the clock, the ending. Paper is
light so a person arrives somewhere gentle rather than somewhere dim; dusk is
dark because candles are lights and a light needs a dark to be seen in. No
screen mixes them, except that the map at `/world` is a dusk panel set on the
paper, because it is a thing to be read rather than a place to sit.

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
- The rail moves left-to-right in 520ms on one easing, and the arriving
  content settles up over 240ms. Nothing else moves on paper.
- Company is a sentence built from the earth (*Ana from Lisbon is meditating
  with you*), never a figure to compare; a number that was not read is left
  out.
- Every control is 44px to hit; the doors are 96px. A typed answer is a
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
- **Ink-3** (`#76604f`): captions, placeholders, the *Your usual* label.
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
- **Two grounds, one boundary.** Paper until the bowl is struck; dusk from
  the lift until Done. `Journey` transitions the frame's background over the
  lift and nothing else changes the ground.
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
  0.8125rem, the count line on the welcome and home.
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
  focus to it on arrival, so it is also the announcement.
- **Copy is a sentence.** *Strike the bowl to begin.* *Your own timer, and
  nobody shown.* Not a label with a colon, not a fragment.

## Layout

- **One left margin, and everything on the rail hangs from it.** The gutter
  grows with the window — 1.5rem on a phone, 6rem on a wide laptop — and the
  content is vertically centred against it. A question's measure is still
  28rem, because a field wider than that is harder to read, not easier; what
  changed on 14 September 2026 is that the column is anchored to the margin
  rather than floating in the middle of the window. The air is on the side
  the eye leaves. Nothing is laid out in two columns anywhere.
- **The rail is a track of viewport-wide panels.** `Rail` translates a flex
  row by `-index * 100%`; each panel is `h-dvh` and scrolls itself if it
  must; the page never does. Non-current panels are `inert`, `aria-hidden`,
  and `visibility: hidden` once the slide has settled.
- **The welcome is a title page, not a question.** `WelcomeScreen` is the one
  screen that does not use `Screen`: a 46rem column holding the count line,
  the wordmark at the size of the window, one sentence at a 40-character
  measure, and *Join a session* immediately under it. A question's Next
  answers something above it and belongs at the foot; the invitation is the
  end of the sentence that makes it and sits where the reading stops.
- **A question is title, lede, control, foot.** `Screen` puts the question and
  one line at the top of the column's vertical centre, the control under it,
  and a foot row on the safe-area inset: Back on the left, Skip (a quiet
  word) and Next on the right.
- **The bowl is the one screen that centres itself** (`align="center"`). The
  rail walks in from the margin and arrives in the middle of the frame, which
  is where the camera lifts from and where the sitting is.
- **The sitting is one frame.** `Sitting` is `h-dvh` dusk: the clock top
  right, the earth centred at its own 2.055 aspect and capped so the company
  line under it always fits, Sound and End on the safe-area inset. By
  yourself, the bowl stays faintly centred where the earth would be.
- **Home and the documents scroll.** Home is still a centred 28rem column —
  a page with a header, like the map's, rather than a panel on the rail:
  wordmark and menu in the header, greeting, the two doors, the *Your usual*
  card.
  Panels behind the menu replace the body of the column and keep the header.
- **The map's page is the column at `max-w-3xl`**, so the dusk panel can be
  as wide as a laptop allows while the caption stays a paragraph.

## Elevation & Depth

Flat, with two exceptions. **Surfaces** are a step lighter than paper with a
rule hairline: that is the whole depth model for fields, chips, cards and
doors. **The menu** is the one thing that floats, with a 12px soft brown
shadow, because it is the one thing that is over something else. The bowl's
ripples are opacity, not shadow. On dusk there is no elevation at all: the
Sound sheet mid-sitting is a light card on the dusk, which is contrast rather
than depth.

### Named rules
- **No shadow on a control.** A chip, a door, a button is flat on its
  surface. If it needs to look pressable, the border or the fill does that.
- **The lift is the only z-motion**, and it is the bowl panel scaling down
  and away while the sitting scales in.

## Shapes

- **Control radius 1rem** on fields, chips, the menu, the number field.
- **Card radius 1.5rem** on the doors, the *Your usual* card, the delete
  confirmation, the dusk panel around the earth.
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
- **Primary, large** (`PRIMARY_LG`): the same pill at 56px with 1.0625rem
  type and an arrow that travels 4px on hover, the way the rail travels when
  it is pressed. *Join a session* on the welcome, and nothing else.
- **Quiet** (`QUIET`): rule outline, ink-2 text, pill, 44px; ember outline
  and text on hover. Back, Finish, Delete account, the map's Back.
- **Quiet on dusk** (`QUIET_DUSK`): dusk-ink-2 at 55% outline, dusk-ink text;
  flame on hover. Sound and End during the sitting, Done and Finish on the
  ending.
- **Word** (`WORD`): ink-2 600 text, underlined in rule, ember on hover.
  Skip, Leave it out, Change on the bowl screen, the foot of the account
  panel.
- **Icon trigger** (`ICON`): 44px round surface with a rule hairline. The
  menu's three lines and the account's.

### Chips
Surface fill, rule outline, ink-2 600, control radius, 44px. **On**:
ember-soft fill, ember outline, ember text. The three bells; the *Until the
bell at 12:55, with everyone* stop under the slider; Keep it.

### Doors
Two stacked cards, surface on rule, card radius, at least 96px tall, title in
ink and one line in ink-2. The chosen door carries the ember outline. Pressing
one both answers and advances. The same `Doors` sits on the mode screen and on
Home.

### Fields
- **On the rail, a line** (`LINE`, through `LineField`): no box, a 2px line in
  ink-3 at 80% under 1.5rem type (1.75rem from `sm`), ink-2 under the pointer,
  ember with the caret in it — and that ember line is the focus indicator.
  The prompt, *Enter your name* or *Enter your town*, types itself out in
  ink-3 with an ember caret when the screen arrives. The name and the origin.
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
see Ana from Lisbon while you sit with them*, *Skip the questions and use
these*, *Full screen*.

### Slider
`.room-range`: a rule track with an ember thumb, 44px hit height, over the
timer's stops with `aria-valuetext`; a number field beside it snaps on blur
and says so in a status line.

### Cards
Surface on rule, card radius, 20px padding. *Your usual* on the welcome and
Home; the delete confirmation; the ending's fact rows are a list on dusk, not
a card.

### Menu
The icon trigger opens a surface panel under it, right-aligned, control
radius, with the one shadow. Items are 44px, ink-2 600, ember-soft on hover
and focus. Up and Down wrap, Home and End, Escape closes and returns focus.
Signed in: Account, Settings, Your practice, Sign out. Guest: Create account,
Sign in.

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
It is not the subject; it is never larger than this.

## Motion

- **Rail**: `--rail-ms: 520ms`, `--ease-rail: cubic-bezier(0.22,1,0.36,1)`.
  Only the arriving panel animates its content (`.screen-settle`, 240ms
  fade-up); the departing panel just slides.
- **Colour**: 200ms on every control.
- **Typed prompt**: `useTypedOut`, 55ms a character (45ms more after a
  space) starting 420ms after the screen arrives, once per arrival; the caret
  blinks on `type-caret`, 1.1s in steps, and is hidden when the field has
  focus. Under reduced motion the prompt is whole and the caret still.
- **Breath**: `live-breath`, 4s, the dot beside the count on the welcome —
  the only thing on paper that moves on its own, and it never goes out. The
  count itself fades in over 500ms into a line whose height is already
  reserved, so nothing under it moves when the number arrives.
- **Strike**: `bowl-wobble` 600ms, `bowl-ripple` 1400ms ×3 at 180ms.
- **Lift**: `--lift-ms: 1400ms`; `.lift-out` on the rail (scale to 0.55,
  down 28vh, fade), `.lift-in` on the sitting (from 1.06 / 0 to 1 / 1), the
  frame's background from paper to dusk on the same clock.
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
- **Do** keep paper for deciding and dusk for sitting, and change grounds
  only at the strike.
- **Do** set the question in Comfortaa 700 and everything a person presses in
  Nunito 600; every changing number in `tabular-nums`.
- **Do** put a new colour through `scripts/contrast.mjs` before using it,
  and never use glow as text or as a control's edge.
- **Do** keep every control 44px and every door 96px, on the safe-area inset
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
