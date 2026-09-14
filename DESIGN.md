---
name: Meditate With Me
description: A photograph of a lit candle in a dark room, one serif word on it, and nothing that competes with either. Type lives in the dark band above the flame; controls are bounded, quiet, and ember only when they start something.
colors:
  ember: "#e0a057"
  ember-soft: "#2c2117"
  ink: "#e9e7e3"
  ink-2: "#b5b2ad"
  ink-3: "#9a9792"
  rule: "#2a2e33"
  paper: "#131518"
  surface: "#1a1d21"
  panel: "#1c1410"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "3rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  display-lg:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "3.75rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "normal"
  title:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "normal"
  masthead:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  body:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  control:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "0.025em"
  label:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: "0.025em"
  numeral:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  control: "0.75rem"
  action: "9999px"
  cell: "2px"
spacing:
  xs: "0.5rem"
  sm: "1rem"
  md: "1.5rem"
  lg: "2rem"
  xl: "2.5rem"
  band: "39vh"
components:
  begin-word:
    backgroundColor: transparent
    textColor: "{colors.ember}"
    typography: "{typography.display-lg}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
  begin-word-hover:
    backgroundColor: transparent
    textColor: "{colors.ink}"
  sit-circle:
    backgroundColor: transparent
    textColor: "{colors.ember}"
    typography: "{typography.display-lg}"
    rounded: "{rounded.action}"
    size: "14rem"
  sit-circle-hover:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.white}"
  button-primary:
    backgroundColor: transparent
    textColor: "{colors.ember}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 1.5rem"
    height: "2.75rem"
  button-primary-hover:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.white}"
  button-quiet:
    backgroundColor: transparent
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.action}"
    padding: "0 1rem"
    height: "2.75rem"
  button-quiet-hover:
    backgroundColor: transparent
    textColor: "{colors.ember}"
  button-lifted:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.white}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 1.5rem"
    height: "2.75rem"
  button-lifted-icon:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    size: "2.75rem"
  settings-row:
    backgroundColor: transparent
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    height: "3.5rem"
  choice-chip:
    backgroundColor: transparent
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 0.5rem"
    height: "3rem"
  choice-chip-selected:
    backgroundColor: transparent
    textColor: "{colors.ember}"
    rounded: "{rounded.control}"
  choice-chip-filled:
    backgroundColor: "{colors.ember-soft}"
    textColor: "{colors.ember}"
    rounded: "{rounded.control}"
  text-input:
    backgroundColor: transparent
    textColor: "{colors.white}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "2.75rem"
  menu-item:
    backgroundColor: transparent
    textColor: "{colors.white}"
    typography: "{typography.control}"
    padding: "0 1.25rem"
    height: "2.75rem"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "1.25rem"
    width: "20rem"
  foot-link:
    backgroundColor: transparent
    textColor: "{colors.white}"
    typography: "{typography.label}"
    padding: "0 0.5rem"
    height: "2.75rem"
---

# Design System: Meditate With Me

## Overview

**Creative North Star: "The Shared Candle"**

There is one object on this site and everyone in the world is looking at it:
a candle, lit at the top of the hour, photographed in a dark room. Everything
else on screen is either the candle, a word about the candle, or a control
that stays out of its way. The visual system is what remains after that rule
has been applied to every screen. Type is set only in the dark band above the
flame, because the lit wax below it is not a surface anything can be read on.
Controls are allowed a surface where type is not, because a surface is what
tells you a thing is a button. Ember, the colour of the flame, is spent on the
one action that starts a sitting and on almost nothing else.

The room is always dark, whatever the visitor's system says, and the page is
one frame that does not scroll. Home, the signed-in page, is the single
exception: a flat dark ground with a masthead that scrolls, because it is a
person deciding whether to sit rather than a room they are already in. Nothing
built for Home is allowed back into the room. The photograph is provisional
(the client may license his own) and the design must survive its replacement;
what is fixed is the composition, not the picture.

Motion is slow and cinematic where the room is concerned, and nearly absent
everywhere else. The camera racks between six phases over seconds; the ending
takes thirty seconds to come back. Controls change colour in 300 to 500ms and
do nothing else. Nothing bounces, nothing springs, nothing reveals itself on
scroll, because there is no scroll.

**Key Characteristics:**
- One serif display face at weight 400, one sans for everything a person
  reads or presses, one mono for the changing numerals of a clock.
- Ember (#e0a057) is the primary action and the flame; it appears on
  outlines and type, and fills a surface only on hover.
- Two secondary-control styles, chosen by what is behind them: quiet on a
  flat dark ground, lifted on the photograph. A third needs a written reason.
- Everything sits inside 39% of the viewport height, scaled to fit rather than
  scrolled.
- Company is shown as composition (dots on a ring, one sentence), never as a
  figure to be compared, and a number that cannot be trusted is left out
  rather than guessed.

## Colors

A warm near-monochrome: one accent the colour of a flame, three greys for
type, one hairline, and one warm dark for anything that has to sit on the
photograph.

### Primary
- **Ember** (`{colors.ember}`): the flame's colour and the primary action. The
  begin word, the Sit circle, the selected bell, the slider's filled track, the
  ring's arc and dots, the focus ring, and the border of a primary button. It
  fills a control only on hover, where it means "this one, now". Never used as
  a background at rest, never on body text.
- **Ember Soft** (`{colors.ember-soft}`): a barely-lit warm dark, the fill of a
  selected chip or an on switch, so a chosen thing glows faintly rather than
  shouting. Passes 4.5:1 with ember on top of it.

### Neutral
- **Paper** (`{colors.paper}`): the page ground under everything, and what
  shows if the photograph is late. Also the offset colour of every focus ring.
- **Surface** (`{colors.surface}`): a step lighter than paper for Home's
  cards. Rare.
- **Ink** (`{colors.ink}`): primary type, the masthead, the answer on a
  settings row, the strongest stat on the ending.
- **Ink 2** (`{colors.ink-2}`): the room's speaking voice. Row labels, the
  sentence under the begin word, the settings line, quiet controls, the ring's
  clock. The lighter of the two greys and therefore the stronger on a dark
  ground.
- **Ink 3** (`{colors.ink-3}`): the third tier, for captions and chevrons.
  Raised from #87847f when the ground became a photograph; it is now close to
  the point where it stops being distinguishable from Ink 2, and if the
  photograph is ever graded brighter the honest move is to retire it for the
  room rather than raise it again.
- **Rule** (`{colors.rule}`): the hairline. Dividers between settings rows,
  the empty half of a slider track, the outline of a quiet control at rest.
  Deliberately below 3:1 and therefore never the only thing carrying a
  control's state.
- **Panel** (`{colors.panel}`): the one dark that sits on the photograph. At
  65% under a lifted control so the room's own warmth comes through and the
  button reads as a shadow with a word in it; opaque under the account menu
  and panel so the begin word cannot show through. Warm on purpose: a neutral
  near-black over a brown photograph read as a chip of something else laid on
  top.
- **White** (`{colors.white}`): type on the photograph and inside the panel,
  where ink would not clear the lit wax. Measured at 6.6:1 against the
  brightest dish the ending shows through a lifted control at 65%.

### Named Rules
**The Scarce Ember Rule.** Ember is worth more while it stays rare. On any
screen it may outline or colour the one control that starts a sitting and the
one thing currently chosen; it fills a surface only on hover or when the
switch is on.

**The Never-Invent-Company Rule.** A count that cannot be trusted is omitted,
not zeroed and not guessed. One candle lit is you and is never reported as
company.

**The Composited-Contrast Rule.** AA is not optional and the flat palette does
not prove it. Anything set over the photograph is measured against the real
stack (camera, vignette, stop, flame) with `scripts/contrast-room.js`, and
`scripts/contrast.mjs` gates the flat pairs and the panel composites.

## Typography

**Display Font:** Instrument Serif (with Georgia, serif)
**Body Font:** IBM Plex Sans (with system-ui, sans-serif)
**Numeral Font:** IBM Plex Mono (with ui-monospace, monospace)

**Character:** a single-weight serif that reads as an invitation rather than
a headline, over a plain humanist sans that never raises its voice. The
serif is only ever one word or one short line at a time: *Let’s begin.*,
*Sit*, *Come back.*, the minutes sat, a page title. The sans does everything
else at two sizes. The mono exists for one job, numerals that change while
you watch them, and appears nowhere else.

### Hierarchy
- **Display** (400, 3rem rising to 3.75rem at `sm`, line-height 1): the begin
  word on the landing, *Come back.* and the minutes on the ending. Ember on
  the landing, ink elsewhere.
- **Sit circle** (400, 2.25rem rising to 3.75rem at `lg`, line-height 1): the
  one word inside Home's circle, ember.
- **Headline** (400, 2.25rem, line-height 1.25): the title of a reading page
  (privacy, terms) and the map's title.
- **Title** (400, 1.5rem, line-height 1.25): section titles on a reading
  page, the streak line on Home.
- **Masthead** (400, 1.25rem, line-height 1): the greeting on Home, the only
  place the site name is set in its own type.
- **Body** (400, 1rem, line-height 1.5, max 62ch): reading-page paragraphs,
  the settings line under the begin word, the answer on an open row.
- **Control** (400, 0.875rem, tracking 0.025em): every button, row, chip,
  input and the sentence under the word. The size the room speaks in.
- **Label** (400, 0.75rem, tracking 0.025em): quiet controls, the foot links
  in the account panel, captions and stat rows. One tracked uppercase label
  exists, on Home's *Your practice*, and it is the only one.
- **Numeral** (400, 34 SVG units, tabular): the ring's clock in Plex Mono.
  Everywhere else a changing number stays in the sans with `tabular-nums`.

### Named Rules
**The One Word Rule.** The display face is never given a sentence. If a line
needs more than about four words it is set in the sans.

**The No-Weight Rule.** Nothing is bold. Emphasis is size, colour (ember or
ink over ink-2) or the serif, never weight; the fonts load 400 only in use.

## Layout

The room is one viewport, `h-dvh overflow-hidden`, and the photograph is
cover-fitted behind it. `CandleScene` measures where the flame lands and
publishes it as `--flame-top`, about 39% of the height; the band above that
line is where all type goes and the column inside it is scaled down to fit
(`useFitToBand`) rather than allowed to overflow. When a panel is open the
band takes the full frame and the camera stops the picture down flat, flame
included, so the rows are read against a dimmed room rather than the flame.
The landing does the same for a visitor whose enlarged text no longer fits
the strip, so the fit never shrinks type below the size they asked for;
page zoom leaves the root font alone and never triggers it.
The column is centred, `max-w-md` for a panel and about 30ch for a sentence;
the horizontal rhythm is Tailwind's default 4px scale, with 1rem between a
label and its answer, 1.5rem around a control's text, and 2.5rem between
*Sound* and *End this sitting* so the one control that cannot be undone
stands apart. Two controls only may live below the band, at the foot of the
frame on the safe-area inset, and both are lifted buttons.

Home scrolls. Below `lg` it is one column of at most 42rem: masthead, the
bell time, the circle, the settings line and *Change*, the practice, recent
sittings, the world, the account. From `lg` the same order becomes a masthead
over two panes that together are exactly one viewport tall and each scroll
themselves, sitting on the left, practice on the right, so the circle never
moves while a long log does. The reading pages are one 62ch column.

Every control is at least 44px tall; rows are 56px. Breakpoints in use are
`sm` (640px) and `lg` (1024px) only.

## Elevation & Depth

There are no shadows. Depth is the photograph's own: the camera's blur,
brightness and vignette change per phase and the type sits in the darkest
band of the picture. On the flat ground of Home and the map, depth is a
hairline. The account panel and menu carry a `1px` border at white/20 and an
opaque panel fill; that border is the only edge in the product, and it exists
so the panel reads as a sheet over the room rather than a hole in it. The
slider's thumb is the one element with a shadow (`0 1px 3px rgb(0 0 0 / 0.5)`
and a hairline inner highlight), because it is the one thing meant to be
picked up, and it swells 6% while held.

### Named Rules
**The Type-Has-No-Surface Rule.** A sentence you have to scrim in order to
read is a panel pasted on a picture. Type gets the band or gets cut; only a
control may carry a fill on the photograph, and only at button size.

## Shapes

Two radii and a pill. Controls, rows, inputs, chips, the account panel and
menu share one soft corner, 0.75rem; the begin word carries the same corner
for its focus ring alone. The pill (9999px) is for the circle you press to
sit, the quiet secondary controls on flat ground, the switch and its thumb,
and the slider's thumb, which is a 2.75rem by 1.5rem grip rather than a dot
so it reads as a thing you slide. Practice-grid cells are 9px squares with a
2px corner. Borders are 1px everywhere; there are no 2px strokes except the
ring's arc and the focus ring. The ring itself is a 176-unit viewBox, arc
radius 74, dots at 82, at most 36 of them, yours at twelve with a halo.

## Components

### Buttons
Quiet by default, bounded always. A control whose only affordance is being a
word is not a quiet control, it is an invisible one; every control is
outlined, filled or underlined.

- **Shape:** soft corner (0.75rem) on the photograph and in panels; pill on
  flat ground.
- **Begin word** (`{component.begin-word}`): the display face in ember with
  no border, 3rem to 3.75rem, padding 1rem either side so the focus ring has
  room; ink on hover over 500ms. The only unbounded control, allowed because
  it is the largest thing on the screen.
- **Sit circle** (`{component.sit-circle}`): a 1px ember ring 10rem to 14rem
  across with the word inside in the display face; hover fills ember and
  turns the word white over 500ms. Home's echo of the sitting ring.
- **Primary** (`{component.button-primary}`): 1px ember outline, ember text,
  2.75rem tall, 1.5rem side padding; hover fills ember with white text over
  300 to 500ms. *Sit again*, *Send me a code*, *Keep it*. Disabled is 50%
  opacity.
- **Quiet** (`{component.button-quiet}`): rule outline, ink-2 text at label
  size with wide tracking, pill, 2.75rem tall, 1rem side padding; ember
  outline and text on hover. *Change*, *Sign out*, *Back*, the world door.
  Only on flat dark ground or in the band.
- **Lifted** (`{component.button-lifted}`): panel at 65% with a white/20
  hairline and white control-size text, 2.75rem tall; hover deepens the fill
  to 85% and the hairline to white/40. *Sound* and *End this sitting* during
  a sitting, *Create account* after one. Only on the photograph. The square
  variant (`{component.button-lifted-icon}`) holds the three-line menu icon.
- **Hover / Focus:** hover changes colour and nothing else. Focus is one
  2px ember ring offset 2px in the page colour, defined once in
  `components/controls.ts`; the account panel offsets its ring in the panel
  colour instead.

### Chips
- **Style** (`{component.choice-chip}`): soft-cornered, 3rem tall, rule
  outline with ink-2 text; the bells share a row with `flex-1`, the sound beds
  sit in a wrapping row.
- **State:** selected is ember outline and ember text
  (`{component.choice-chip-selected}`); a bed that is playing, and the
  *Sit together until* button, add the ember-soft fill
  (`{component.choice-chip-filled}`). `aria-pressed` throughout.

### Settings rows
- **Style** (`{component.settings-row}`): a full-width button 3.5rem tall
  with the question at the left in ink-2, the current answer at the right in
  ink, and a 14px ink-3 chevron that turns 180° in 300ms when the row opens.
  Rows are divided by rule hairlines; one is open at a time and the open
  row's controls appear beneath it.

### Switch
- **Style:** a 3.5rem by 2rem pill outline with a 1.25rem round thumb.
  Off: rule outline, ink-3 thumb. On: ember outline, ember-soft fill, ember
  thumb slid 1.5rem right over 300ms ease-out. The word beside it, *Yes* or
  *No*, takes the same colour.

### Slider
- **Style:** a 4px track, ember to the thumb and rule beyond it, under a
  2.75rem by 1.5rem ember pill thumb with a vertical ember-to-lighter
  gradient and a 1px ember border. Twelve stops, not a continuous range, with
  `aria-valuetext` saying the minutes; the last stop is *Sit together until*
  the bell and has its own chip.

### Cards / Containers
- **Corner Style:** 0.75rem.
- **Background:** the panel colour, opaque, for the account panel and menu
  (`{component.panel}`); Home's cards use surface on paper with a rule
  hairline.
- **Shadow Strategy:** none. See Elevation.
- **Border:** 1px white/20 on the photograph, 1px rule on flat ground.
- **Internal Padding:** 1.25rem in the account panel, 1.5rem in Home's
  cards.

### Inputs / Fields
- **Style** (`{component.text-input}`): transparent fill, 1px white/40
  outline, white centred text at control size, placeholder white/50, 2.75rem
  tall. The code field is larger (1.25rem, tracked) and numeric. Both opacities
  are the lowest that clear their contrast targets on the panel colour.
- **Focus:** the outline turns ember and a 1px ember ring is added; no offset,
  because the field is inside the panel.
- **Error:** a reserved three-line slot under the submit, `role="alert"`, in
  white/60, so an error never moves the field.

### Menu and panel
- **Menu item** (`{component.menu-item}`): full width, 2.75rem tall, white/85
  text, white/10 fill on hover and on focus. Arrow keys, Home and End move
  between items; Escape returns focus to the trigger.
- **Panel** (`{component.panel}`): 20rem or the viewport less 1.5rem,
  dropping from its trigger in 150ms (opacity and a small translate, disabled
  under reduced motion). One question at a time; quiet foot links
  (`{component.foot-link}`) underlined in white/25 under white/50 text, never
  bare.

### Navigation
Three lines at the top right of the landing open a two-item account menu.
*Back* on the map and the reading pages is a quiet pill with a chevron. There
is no nav bar and no footer; the site has four routes and the room links to
one of them.

### The Sitting Ring
The signature component and the room itself. An ember arc at 85% opacity
drains clockwise from twelve as your time runs out; the gap opens at twelve.
Just outside it, one ember dot for every candle lit this hour, spread evenly
around the circle (never fixed slots: three people in sixty slots is a broken
room, not a quiet one), yours at twelve at 3.25 units with a faint halo, the
rest at 2.5. Dots for people still here are full; those who lit a candle and
left are at 38%. Each dot's angle eases over 2s with
`cubic-bezier(0.22, 1, 0.36, 1)` so the ring opens for an arrival rather than
snapping. In the last minute before a shared bell the dots brighten and draw
in toward twelve from both sides. The clock inside is Plex Mono at 34 units in
ink-2, tabular. The whole thing is one SVG sized against the band so the clock
grows with the ring.

### The Camera
Not a component but the largest motion in the product. Six phases (`load`,
`idle`, `quiet`, `open`, `sitting`, `returning`/`finished`) each set scale,
blur, brightness, vignette, a flat stop and the flame's brightness, and the
transform eases with `cubic-bezier(0.22, 0.61, 0.24, 1)` over 1.5s to 30s.
The room and the copy come up together over 2.6s on
`cubic-bezier(0, 0, 0.2, 1)`. A 23s drift breathes the photograph at rest.
Under reduced motion the camera pins at scale 1.03 with no transform
transition and the drift stops; blur, brightness and dim still change because
they carry the phase's meaning and none of the vestibular risk.

## Do's and Don'ts

### Do:
- **Do** put every word in the band above the flame, and cut copy before
  letting the band scale below legibility.
- **Do** choose the control style by what is behind it: quiet on flat dark,
  lifted on the photograph, and nothing else without a written reason in
  `components/controls.ts`.
- **Do** keep ember for the one thing that starts a sitting and the one thing
  currently chosen; let it fill a surface only on hover or when a switch is
  on.
- **Do** set every changing number in `tabular-nums`, and the ring's clock in
  Plex Mono.
- **Do** measure anything new on the photograph with
  `scripts/contrast-room.js` before trusting the palette; the flat gate cannot
  see the picture.
- **Do** omit a number rather than guess it, and never report one candle as
  company.
- **Do** give the display face one word or one short line, at weight 400.
- **Do** keep every control 44px tall and every row 56px, on the safe-area
  inset when it sits at the foot of the frame.

### Don't:
- **Don't** put a scrim, a card or a block-sized fill on the photograph to
  make text readable. If it needs a surface it is a control or it moves to
  the band.
- **Don't** add a shadow, a gradient background, a scroll-reveal or a spring.
  The only motion is the camera, the ring, and colour changes of 300 to
  500ms.
- **Don't** use bold, a second serif, or a second accent colour. There is one
  weight, one serif, one ember.
- **Don't** use tracked uppercase labels; Home's *Your practice* is the one
  and it is a budget of one.
- **Don't** raise ink-3 again if the photograph is regraded; retire it for the
  room instead.
- **Don't** show a count as a figure to compare, and don't let a dashboard's
  vocabulary (cards, stats, badges) back into the room. Home is the only
  screen allowed not to be the room.
- **Don't** let the page scroll, except Home and the reading pages.
