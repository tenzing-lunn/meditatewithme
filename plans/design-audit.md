# Design audit — the whole site, 7 September 2026

Run with [Impeccable](https://github.com/pbakaus/impeccable) v4.2.2 (`audit` +
`critique`) against `dev` at `353aee0`. Two isolated assessments: a design
review from source, and a deterministic evidence pass. Neither agent edited
anything; **no UI change was made by this audit.**

Method: `dual-agent (A: design review · B: technical evidence)`. Impeccable's
bundled `detect` binary was **not** run here — it downloads at runtime and that
was declined. Its checks were reproduced by hand (grep, AST-ish tag tracking, and
a WCAG contrast calculator written for the run). See §7 for what that leaves
unverified.

Three of the sharper findings were checked by hand before publication; one of
them did not survive. §6 records that, because a plan that only lists what
survived is not honest about its own method.

---

## 1. The two scores

### Audit health — technical

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 2/4 | No `<h1>` anywhere on the room surface; four measured contrast failures the repo's own gate cannot see |
| 2 | Performance | 2/4 | `public/room-base.png` is 2.31 MB and is the LCP element on every visit |
| 3 | Theming | 3/4 | Full token system, deliberately single-theme; `#1c1410` hard-coded 4× with no token |
| 4 | Responsive | 3/4 | No `100vh` anywhere, `dvh` throughout — but `FOOT` controls are ~16 px tall |
| 5 | Implementation integrity | 3/4 | Coherent and product-specific; the §2A click-swallowing bug is verified dead |
| **Total** | | **13/20** | **Acceptable — significant work needed** |

### Design health — Nielsen's ten

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | The landing reports nothing: no hour, no count, no state |
| 2 | Match with the real world | 3 | One feature, three registers: *Any background noise?* / *Ambiance* / five bed names |
| 3 | User control and freedom | 2 | `Sit together until` is a one-way set in the flow and a toggle on Home |
| 4 | Consistency and standards | 3 | One preference, three labels (`Show who else is here` / `Hide the room` / `showCount`) |
| 5 | Error prevention | 3 | Delete-account is exemplary; no confirmation on Home's `Sit` |
| 6 | Recognition over recall | 3 | Strong inside the flow, nothing to recognise at the door |
| 7 | Flexibility and efficiency | 3 | The signed-in read-don't-walk path is a real win |
| 8 | Aesthetic and minimalist design | 4 | The best thing here. `LIFTED`/`QUIET` is a two-value system with a written rule |
| 9 | Error recognition and recovery | 3 | The spent-magic-link recovery is excellent; the room reports nothing |
| 10 | Help and documentation | 1 | There is none — no about, no "what is this", no privacy notice |
| **Total** | | **27/40** | **Acceptable** |

All ten heuristics genuinely apply; nothing renormalised.

**Read both numbers with this caveat.** Neither scale measures authorship, and
authorship is where this build is exceptional. The audit dimensions reward
lazy-loaded images and ARIA attributes; they have no column for *the ring*, which
is the best idea in the codebase. The scores are low in the places the product is
weakest at the door and highest in the places it is unusually good. Treat 13/20
as a to-do list, not a verdict on the work.

---

## 2. Design specificity verdict

**The room is authored for this product and nothing else. The landing is
authored for no product at all. Home could be swapped into a habit tracker
tomorrow.**

| Surface | Specificity | Note |
|---|---|---|
| The sitting (`SittingRing`) | **5/5** | Unfakeable. Not portable to anything. |
| The room's questions | **4/5** | `Sit together until 12:55` explains the product in five words |
| The world map | **4/5** | Real coastlines, real terminator, and it refuses to invent company |
| Home | **2/5** | Two authored details on a template |
| The landing | **1/5** | See P0 below |

### The thing this audit exists to say

For a guest, `/` renders a photograph, the words *Let's begin.*, and
`Create account`. That is the complete inventory (`components/Room.tsx:931-945`,
`:1126-1163`). No hour. No count. No sentence.

The sentence that explains the entire product **already exists in this
repository**:

> "A candle is lit at the top of every hour. Everyone is looking at the same one."
> — `app/opengraph-image.tsx:110-111`, and `app/layout.tsx:36-37`

It is served to Twitter's crawler and to Google's snippet, and withheld from the
person standing in the room. **A stranger who sees a link to this site is told
more than a stranger who types the URL.**

This confirms `plans/room-polish.md` §1 and moves it. That plan diagnosed the
*flow* defaulting to the private-timer concept, and §3E fixed a real part of it —
the shared bell now has its own line and its own weight
(`components/SessionSetup.tsx:304-318`). But nobody audited the screen *before*
the flow, and that screen has been optimised down until it carries no product
information at all. **The failure moved upstream.**

It also makes §4's own five-question comprehension test unrunnable: against the
current landing, four of the five questions have no available answer on screen, so
the test cannot fail informatively — it can only confirm that nothing was said.

---

## 3. Priority issues

### [P0] The landing does not say what the product is

**Where.** `components/Room.tsx:931-945`.

**Why it matters.** This is the whole comprehension surface and the whole
conversion surface, and it is empty. It makes `context/VISION.md:16`'s own test —
*"somewhere in the world, right now, someone is sitting with you"* — unmeetable on
the one screen that has to land it. And it is why every downstream argument about
the product model is unresolvable: you cannot tell whether people read this as a
private timer *because of the flow*, when the screen before the flow never
proposed anything else.

**Fix.** One line under *Let's begin.*, in the band, on the same
`booted` / `REVEAL_MS` / `REVEAL_EASE` gate so it is part of the same gesture and
not a second arrival — `Room.tsx:936-941` already has the pattern. `text-ink-2
text-sm`, `max-w-[34ch]`. Use the sentence already written, live rather than
static: *"A candle was lit at 12:00. Eleven people are looking at it."* — falling
back to the static OG sentence when `litCount === null`, per the never-invent-company
rule held everywhere else in the codebase. `useCount` is the right source;
`usePresence` must stay in `Room` (`:449-456`), and reading is not heartbeating.

**Cost.** About fifteen lines. **It does not reopen the product model and it does
not need Jonny.** It is strictly cheaper than the §3E change that already shipped.

---

### [P1] Sound starts two screens before the sound question

**Where.** `components/Room.tsx:573-577` (`openSetup` calls `unlockAudio()` and
`mix.ensure()`) → `components/useMix.ts:57-62` (`ensure` builds the graph at the
*stored* levels).

**Why it matters.** A returning visitor with rain at 0.6 hears rain the instant
they press *Let's begin.*, while the screen says **How long?** No indicator, no
mute, no control until step three. `context/VISION.md:78` lists this under what v1
must not become: *"Something that plays sound at you. The only sound you did not
ask for is the bell you chose."*

The tell that this is a liability rather than a decision: it has to be documented
as a hazard **to our own developers**, in `CLAUDE.md` — *"there is no silent path
through the setup flow."*

**Fix.** Separate unlocking from playing. The autoplay-policy reason for
unlocking at *Begin.* is sound; unlocking is not the same as starting the graph at
the stored mix. `mix.ensure()` at `openSetup`, but start at master 0 and ramp to
`prefs.soundMix[MASTER_KEY]` only when `step === 'sound'` is reached with
`noise === true`. `MixHandle` already has `fadeOut`/`restore` and
`set(MASTER_KEY, …)` — this is a call-order change, not new machinery.

---

### [P1] `prefers-reduced-motion` does not reach the camera, and the file says it does

**Where.** `components/CandleScene.tsx:235` reads the media query into `reduced`.
It is consulted at `:335` and `:408` only — both inside the flame simulation. The
camera transform at `:526` is unconditional:

```
transform: `translate(0%, …) scale(${(1 + (c.s - 1) * I)})`,
transition: `transform ${c.ms}ms cubic-bezier(0.22, 0.61, 0.24, 1), …`
```

With `CAM` at `:85-103` that is a **full-viewport scale 1.32 → 1.06 over 5,600 ms
on arrival**, **1.14 → 1.82 over 3,600 ms when a sitting starts**, and **1.82 →
1.02 over 30,000 ms at the end**.

**Why it matters.** A slow full-screen zoom of a photographic image is the
canonical vestibular trigger. This is a meditation site: the population that sets
reduced-motion for migraine or vertigo is *over*-represented among people seeking
calm, and the site's answer to them is a thirty-second push-in.

`globals.css` disables `.room-drift` (`:235-239`), `.glow` (`:207-212`) and the
slider thumb (`:182-187`) under reduced motion. The intent is clearly there. The
camera is the one that escaped — and it is the largest motion in the product.

**The comment is the second defect.** `CandleScene.tsx:30-32` states: *"REDUCED
MOTION — Honoured: the camera stops moving and the flame is drawn once, still."*
The first half is false, and it will stop the next reviewer from checking.

**Fix.** Read the query into a ref alongside `reduced` at `:235`; when set, hold
`s` at 1.03 for every phase and clamp `ms` to 0 for the transform, leaving `blur`,
`br`, `dim`, `stop` and `opacity` alone — those carry all the meaning of the phase
changes and none of the vestibular risk. Correct the comment in the same commit;
`CLAUDE.md` requires it.

---

### [P1] The world map has no door for guests

**Where.** One `href="/world"` exists in the entire codebase:
`components/Home.tsx:726`. `Home` renders only when signed in
(`components/Entry.tsx:144-147`).

**Why it matters.** `context/VISION.md:75-77`: *"A site that turns people away…
Nobody is refused; nothing is gated. This was decided once, in `8821de1`, and it
holds."* It does not hold. A map of strangers' candles on the real earth, with a
real terminator, is the strongest evidence this product has for its central claim
— and it is shown only to people who have already been convinced enough to make an
account. **The persuasion asset is behind the conversion.**

It isn't gated by a permission check; it's gated by having no door, which is worse,
because nobody will ever file it as a bug. `World.tsx:42` already sends `Back` to
`/`, so the return path works — only the outbound one is missing.

**Fix.** One `QUIET`-styled link in the landing band, under the P0 sentence,
reading its count from the same `useCount`: *"See where the candles are — 11 lit
this hour."* `QUIET` not `LIFTED`, because the band is flat dark
(`components/controls.ts:19-27`). This gives P0's sentence somewhere to lead, which
turns two small additions into one coherent front door.

---

### [P1] `public/room-base.png` is 2.31 MB

**Where.** `public/room-base.png`, loaded as a CSS `background-image` at
`components/CandleScene.tsx:539`.

**Why it matters.** It is the LCP element on every single visit. Because it is a
CSS background rather than an `<img>`, it gets no `next/image`, no `loading`
attribute, no responsive `srcset`, and no modern format. The second-largest asset
in the project is `public/earth/relief.jpg` at 220 KB — this one file is ten times
everything else combined. On the 4am phone-on-cellular case that
`context/VISION.md:21` names as the product's own scenario, this is the experience.

**Fix.** AVIF with a WebP fallback, and a `srcset` at 2-3 widths. Expect
200-400 KB at visually identical quality. The scene already fades in on
`sceneReady`, so a decode-aware swap costs nothing in perceived quality.

---

### [P1] The room surface has no `<h1>`, and the new menu has no keyboard

Two separate accessibility defects with the same root: the room was built as a
picture, and picture-shaped code skips document structure.

- **No `<h1>` anywhere on `/`.** Guest landing, setup flow and the ending render
  zero. The only headings are two `h2`s (`SessionSetup.tsx:228`,
  `Account.tsx:415`). `Home.tsx:171` and `World.tsx:58` are correct — the room is
  the exception. A screen-reader user landing in `<main>` (`Entry.tsx:121`) finds
  two buttons, *Let's begin.* and *Create account*, and heading navigation yields
  nothing. There is no way to establish what this site is without pressing an
  unexplained button.
- **`role="menu"` with no arrow-key handling.** The menu added in `353aee0`
  (`Account.tsx:353`, items at `:362`, `:370`) implements the ARIA menu pattern,
  which promises Up/Down/Home/End. `onKeyDown`, `onKeyUp` and `tabIndex` appear
  **zero times in the entire codebase**. Only Tab moves. Either wire the keys or
  drop to plain buttons in a `role="group"` — the pattern you name is the contract
  you owe.

---

### [P1] `FOOT` controls are about 16 px tall

**Where.** `components/Account.tsx:82` (definition), used at `:556`, `:569`,
`:582` — *"I already have one"*, *"Back"*, *"Send it again"*.

**Measured ≈ 120 × 16 px.** No padding, no `min-h`. WCAG 2.5.8 asks 24×24 minimum;
44×44 is the touch target everything else in this codebase already hits.

**And there is a multiplier nobody has screenshotted.** The band's fit scaler has
no floor, by explicit decision (`Room.tsx:126-128`, *"Not floored"*), and the whole
column is `transform: scale(band.scale)` at `:879`. So every `min-h-11` and
`min-h-12` in the band is a **nominal** minimum. In landscape on a phone
(844×390), the sound step's ~600 px of content into a ~390 px band gives roughly
`scale(0.65)`: a 44 px `Start` becomes ~29 px of real touch area, and a 44 px play
button becomes ~29 px. `plans/room-polish.md` §2D fixed 16 px tap targets and
ticked its acceptance box; the transform reintroduces the same class of failure,
silently, in a geometry nobody measured.

Related, same family: `Room.tsx:1209` puts the sitting's two controls at
`absolute inset-x-0 bottom-0 … pb-7`. 28 px is inside the iOS home-indicator zone —
`End this sitting` sits where the system swipe-up gesture lives, and
`env(safe-area-inset-bottom)` appears nowhere in the codebase.

---

### [P2] Four measured contrast failures the repo's own gate cannot see

`npm run contrast` passes 12/12 — but `scripts/contrast.mjs` only checks six flat
palette pairs. It does not cover the `Account` panel (`bg-[#1c1410]/95`), the
`LIFTED` surface, or `ember-soft`. Composited and computed:

| Pair | Ratio | Needs | |
|---|---|---|---|
| `white/35` placeholder on panel (bright ground) | **3.20:1** | 4.5 | fail |
| `white/35` placeholder on panel (dark ground) | **3.22:1** | 4.5 | fail |
| `border-white/25` on `FIELD` input boundary | **2.28:1** | 3.0 (1.4.11) | fail |
| `border-ink-3/50` on Room secondary buttons | **2.49:1** | 3.0 (1.4.11) | fail |

`--color-rule` at 1.34:1 is **not** in this list: `globals.css:12-15` declares it
decorative and never the sole state carrier, and every control pairing it was
checked against text or an explicit pressed state. That exemption holds.

Everything else passes, some comfortably: `white/50` `FOOT` at 5.11, ember on
ember-soft at 6.98, ink on ember-soft/50 at 13.83. The source comment at
`Room.tsx:270` claims 6.9 for white on `LIFTED`/65 over a bright dish; the measured
figure is 7.76, so the written claim is conservative and safe.

**Extend `scripts/contrast.mjs` to cover the composited surfaces.** A green gate
over a partial set is the same failure mode as the mono-caps guard below.

---

### [P2] Four cases of one thing wearing several faces

Each is small. Together they are the "it looks generated" signal
`plans/room-polish.md` §3 set out to remove, reappearing in code written **after**
that pass.

- **`Sit together until` is a one-way set in the flow** (`SessionSetup.tsx:306`,
  `update({untilBell: true})`) **and a toggle on Home** (`Home.tsx:640`,
  `update({untilBell: !prefs.untilBell})`). Both carry `aria-pressed`. In the flow,
  a screen-reader user is told they have pressed a toggle that cannot be
  un-pressed, and a sighted user must discover that moving an unrelated slider is
  the way out.
- **One preference, three labels:** `Show who else is here` (`Home.tsx:696`),
  `Hide the room` / `Show the room` (`Room.tsx:1063`), `showCount` in the schema.
- **One feature, three registers:** `Any background noise?`
  (`SessionSetup.tsx:54`), `Ambiance` (`Home.tsx:685`, `SoundMixer.tsx:65`), and
  five bed names. "Noise" is a pejorative for the thing being offered.
- **The mono-caps regression guard does not fire.** `plans/room-polish.md:436`
  accepts on `grep -rn "tracking-\[0\.1[35]em\] uppercase" components/` returning
  ≤2. It returns **0**. Home, written after that pass, uses `tracking-[0.14em]
  uppercase` at `Home.tsx:454` and `:891` — eight tracked-uppercase micro-labels on
  one page. The guard was written against the literal values it was deleting, so
  the pattern came back one hundredth of an em to the side. Replace it with
  `grep -rn "uppercase" components/` and a stated budget.

---

### [P2] Performance, theming and duplication — the rest

- **`will-change` left on at rest** on two always-mounted full-viewport layers,
  promoting them for the life of the page (`CandleScene.tsx:522`, `:547`).
- **Animated `height`, a layout property**, over 700 ms (`Room.tsx:850`). The
  comments at `:152-177` record that this exact animation drove a ResizeObserver
  feedback loop; the workaround is in place, the layout animation is not.
- **`CandleScene` re-renders 4×/second** — `burn={candleBurn(now)}` off a 250 ms
  tick (`Room.tsx:486`, `:819`) and it is not `React.memo`. Its animation
  deliberately lives outside React, so every one of those renders is waste.
- **Dead CSS: `.glow` and `@keyframes breathe`**, 24 lines at `globals.css:189-212`,
  complete with a reduced-motion override. No component applies
  `className="glow"` — `CandleScene` has a `glow` *ref*, which is what makes this
  easy to miss.
- **`sentenceList` duplicated verbatim**, identical body and identical doc-comment
  (`Home.tsx:79`, `SessionSetup.tsx:58`). **`localTime` duplicated** with divergent
  signatures — `Date | number` vs `Date` (`Home.tsx:84`, `Room.tsx:1401`). The
  duration-slider block is near-duplicated across ~55 lines ×2
  (`SessionSetup.tsx:261-318`, `Home.tsx:607-655`), which `Home.tsx:601-606` already
  acknowledges: *"two controls for one preference must not disagree."*
- **`#1c1410` hard-coded 4× across two files with no token**; `Home.tsx:148`,
  `:202` hard-code ember and paper as raw `rgba` where tokens exist. The other 27
  colour literals are defensible — canvas and satori cannot read CSS variables, and
  `FlameMark.tsx:16` says so.
- **The focus-ring incantation is hand-repeated 22×** across five files, despite
  `controls.ts` existing precisely to house shared control styles.

---

## 4. What is working

Three things, and they are the reason the low scores above should not be read as a
verdict on the build.

**1. The ring is a genuine invention, and it collapses two problems into one
object.** `Room.tsx:1397-1428`, `:1453-1611`. The insight — that "how long is
left" and "who is here" are *the same fact*, because both are properties of this
hour — is what lets a meditation screen have exactly one thing on it and still say
two things. The even-spread-not-fixed-slots decision (`:1410-1421`: *"three people
in sixty slots is not a quiet room, it is a broken one"*), the dots set 8 viewBox
units outside the arc so the room doesn't only become visible as your own time runs
out, the dash-offset argument at `:1520-1541` choosing `1 + left` so the *gap*
opens at twelve, and the 2000 ms `cubic-bezier(0.22, 1, 0.36, 1)` on each dot's
angle so the ring *opens up* for an arrival rather than snapping — that is a
designer noticing what an arrival should feel like. It works because it is not
decoration bolted to a timer. It is the timer.

**2. `controls.ts` — a two-value system with a written rule, born from a diagnosed
failure.** `controls.ts:1-37` records that `Change`, `Sign in`, `Sign out`, `Hide
your practice` and `Back` were each independently written as bare `text-ink-3`
words, each reasonable alone, all invisible. The rule that emerged — *type can be
quiet, a control cannot* — plus the surface test (photograph → `LIFTED`, flat dark
→ `QUIET`) plus the explicit *"a third style needs a reason that is not 'this one
felt different'"* is how design systems should be written: from a real failure, at
the smallest scale that solves it, with the anti-growth clause included. It works
because it is falsifiable in one glance.

**3. Refusing to invent company, consistently, at every scale.**
`Room.tsx:1786-1789` (*"a missing number costs far less than a wrong one"*),
`:1713` (`withOthers === null` → row absent, not guessed), `Home.tsx:733-744`
(absent rather than zero), `World.tsx:99-113` (*"nobody is meditating anywhere on
earth" is a much worse thing to say wrongly than "we cannot see"*),
`WorldMap.tsx:38-40`. Four components, four separate temptations, one rule held
every time. On a product whose entire value is a claim about other people, never
faking one is what makes the real ones worth believing.

**And the ending.** `Come back.` held for ten silent seconds while the bowl decays
(`ComingBack`, `Room.tsx:1627-1652`) is one of the best endings in any product I
have reviewed. The reasoning at `:1613-1626` — *"a meditation has no OK button…
landing straight on a stat block is being handed a receipt while the bowl is still
sounding"* — is correct, and the small quiet countdown so it reads as a held beat
rather than a failed load is exactly the right compromise. **Peak-end is in
excellent shape.** The problems are at the door, not at the exit.

---

## 5. Cognitive load — 3 of 8 failures

Passes: chunking, grouping, working memory, progressive disclosure (the mixer is
*unmounted* rather than hidden when the switch is off, `SessionSetup.tsx:390-397` —
correct, because a collapsed mixer is still five sliders in the tab order).

**Fail — visual hierarchy, at the point it matters most.** On every surface, the
*shared* fact is set smaller and dimmer than the *personal* fact. Landing: the
shared fact is absent entirely. Home: `Next candle at` (`Home.tsx:215`) and
`N lit this hour` (`:736`) at `text-xs text-ink-3`, beneath a `size-56 text-6xl`
**Sit**. Ending: `Next candle at` at `text-xs` (`Room.tsx:1088`) under
`{minutes} minutes.` at `text-6xl` (`:1726`). The two facts that make this product
distinct are set at the size normally reserved for a legal footnote. **The
hierarchy consistently says: this is about you.**

**Fail — one thing at a time, in the mixer. Fail — ≤4 options, three times:**

1. **The sound step with the switch on** (`SessionSetup.tsx:349-399`): back arrow,
   2 summary rows, the switch, then 5 play buttons + 5 faders + 1 master
   (`SoundMixer.tsx:68-155`), then `Start`. **≈15 interactive elements**, in a flow
   whose entire stated argument is one thing at a time (`:27-46`). The switch was
   the right fix and it fixed the *first* decision; the second is still "assemble
   an atmosphere from eleven controls while standing in the doorway of a
   meditation."
2. **Home's settings panel** (`Home.tsx:566-706`): **17 controls in one
   disclosure**, on top of the 5 already on the page. The file's defence
   (`:551-564`) is fair about *why it is one panel* and silent about *why it is
   seventeen controls*.
3. **The ending at `reveal === 2`**: five controls, thirteen seconds after a
   meditation bell — and the two secondary ones (`Hide the room`, `Your practice`)
   are the two nobody came back for.

---

## 6. Where the two assessments disagreed

Recorded because a method that hides its own misses cannot be trusted on what it
found.

**The six-digit code — the design review was wrong, and the finding is
withdrawn.** It flagged `Account.tsx:504-505` (`maxLength={6}`,
`pattern="[0-9]{6}"`) against a live project issuing eight-digit codes, and called
it a guaranteed unexplained failure at the last step of signup. Checked against
`plans/launch-readiness.md:90-100`: item 4c was completed **today**, via the
Management API (`mailer_otp_length: 6`), re-read afterwards, and proved end to end
with a throwaway user. The decision is explicitly recorded as *"moving the project
rather than the UI, so the six-digit copy, pattern and placeholder in `Account.tsx`
all stay as written."* The code is correct. This also removes it from the Casey
persona walkthrough, where it was the sharpest item.

**Reduced motion — the technical pass was too generous, and the design review was
right.** Assessment B reported reduced-motion "present, and implemented well",
counting three CSS blocks and two JS `matchMedia` gates. That counts *existence*.
Assessment A checked *coverage* and found the camera excluded. Verified by hand:
`reduced` is read at `CandleScene.tsx:235` and used only at `:335` and `:408`.
Kept as P1.

**The `menu` prop — the tree moved mid-audit.** The design review flagged
`Account.tsx:49-56` as documenting a three-line menu trigger that did not exist in
the prop signature. It was being written at that moment: `353aee0` landed during
the run, and the prop is now at `Account.tsx:94`. The observation is stale and is
dropped — but the new code arrived with the `role="menu"` keyboard gap in P1
above, so the newest commit carries the newest accessibility defect.

**A near-miss worth keeping.** At 12:45 the tree did not typecheck —
`Account.tsx(310,8): error TS2304: Cannot find name 'menu'` — and **`npm run build`
completed green while `tsc` was failing.** Fixed at 12:48; not a standing defect.
But it means `npm run typecheck` is the only gate catching that class of error, and
`CLAUDE.md`'s pre-merge checklist is right to name it separately from the build.

---

## 7. What this audit did not check

- **The bundled detector did not run.** Its checks were reproduced by hand.
  Interestingly, the real detector *has* run in this repo, from another session:
  `.impeccable/hook.cache.json` records a clean pass on `Account.tsx` and a single
  `layout-transition:850` on `Room.tsx`, which someone deliberately ignored with a
  written reason citing `ARCHITECTURE.md` §16. That corroborates the P2 above and
  suggests the hand-run checks did not miss much.
- **No browser was opened**, deliberately — opening the room plays audio out of the
  speakers and there is no silent path through the flow. So: nothing here is
  verified as *rendered*. Specifically unverified —
- ~~**Text contrast over the photograph.**~~ **Measured 7 September 2026 — see
  §10.**
- **The band-scale touch-target multiplier** in P1 is computed from the CSS, not
  measured on a device. The arithmetic is straightforward; the exact scale at a
  given viewport is not.

---

## 8. Recommended order

Nothing below has been done. The first four are cheap, self-contained, and none of
them reopens the product model in `plans/room-polish.md` §4.

| | Work | Command |
|---|---|---|
| 1 | **[P0]** The landing sentence, live from `useCount` | `/impeccable clarify` |
| 2 | **[P1]** The guest door to `/world`, under it | `/impeccable shape` |
| 3 | **[P1]** `room-base.png` → AVIF/WebP with a `srcset` | `/impeccable optimize` |
| 4 | **[P1]** Reduced motion reaches the camera; fix the false comment | `/impeccable animate` |
| 5 | **[P1]** Separate unlocking audio from playing it | `/impeccable harden` |
| 6 | **[P1]** `<h1>` on the room surface; keyboard on the menu; `FOOT` target height | `/impeccable harden` |
| 7 | **[P2]** The four contrast failures, and extend `scripts/contrast.mjs` to reach them | `/impeccable colorize` |
| 8 | **[P2]** One vocabulary: one label per concept, across all four surfaces | `/impeccable distill` |
| 9 | **[P2]** `will-change`, the `height` animation, the 4 Hz re-render, dead `.glow` | `/impeccable optimize` |
| 10 | | `/impeccable polish` |

**Items 1 and 2 are the ones that matter.** They are about fifteen and about five
lines respectively, they land on the same screen, and together they are the
cheapest available answer to the question `room-polish.md` §4 has been holding open
since 30 August — *does anybody understand that this is shared?* — without
reopening the product model or needing a client conversation to start.

---

## 9. Questions worth sitting with

1. **If the OG card can say what this is in eighteen words, why can't the
   landing?** What is the argument that the crawler deserves the sentence and the
   visitor does not? If the answer is *"a picture with anything else on it stops
   being a picture"* (`Room.tsx:912-916`), then the picture is currently costing
   the product its entire premise, and that trade has never been written down as a
   trade.
2. **`Sit together until 12:55` is the best control in the product. Why is it the
   fourth thing you read on the first question, and the only place it appears?**
   Absent from the landing, absent from the ending, and on Home it is one button
   inside a collapsed disclosure. The one control that makes this not-a-timer is
   reachable from exactly two places, both behind a decision to sit alone.
3. **What happens at :55 for someone who chose *until the bell*?** The arc drains,
   the bell rings, `Come back.` appears. Nothing in the sixty seconds before
   acknowledges that this is the moment strangers converge. The product's whole
   claim gets no crescendo — and if it did, that would be a very cheap answer to
   §4's product-model question without reopening the model at all.
4. **`showCount` defaults to showing the room, but `Hide the room`
   (`Room.tsx:1063`) is one tap.** A person who uses it gets a plain timer with a
   photograph — precisely the failure mode `VISION.md:70-71` names. Is that a
   preference, or an escape hatch we should be curious about people using?
5. **The signed-in user gets the least ceremonial entry.** Guests get three screens
   and a camera move; the daily user gets a circle that fires `begin()` from an
   effect (`Entry.tsx:77-81` → `Room.tsx:651-661`) — no confirmation, no threshold,
   and on a cold cache the sitting starts while the room is still invisible, because
   `begin()` gates on `now !== null` while the reveal gates on
   `hasTime && sceneReady` (`Room.tsx:542-546`). Whose experience was optimised, and
   is it the one we will be judged on in month three?

---

## 10. Text over the photograph — measured

The one thing §7 said could not be settled statically. Sampled in the browser on
7 September 2026, against `dev` at `09edbdd`.

**Method.** The scene's own `/room-base.avif` drawn to a canvas through the
browser's real CSS filter pipeline, then the layers that darken it composited in
the order `CandleScene` stacks them: the camera's
`blur() brightness() saturate(1.04)` and `scale` per phase, the vignette
(`radial-gradient … at 50% 42%`, at `CAM.dim`), the top gradient, and the flat
stop at `CAM.stop`. Sampled in ten horizontal strips across the central 64% of
the width — where every word in the room is set — at 390×844 and 1440×900. The
figure taken per strip is the **95th-percentile** luminance, not the single
brightest pixel: one specular highlight under a descender is not what a reader
sees.

**The band is the top 39% of the viewport** (`Room.tsx:862`,
`height: var(--flame-top, 39vh)`), so strips 0-3 are the ones that carry text.
The exception is `open`, where the band is `100%` and every strip counts.

Worst `--color-ink-3` (`#9a9792`) contrast per phase, within the strips that
actually hold text, at 390×844:

| Phase | Strips that matter | Worst ratio | |
|---|---|---|---|
| `load` | 0-3 | **5.59** | pass |
| `idle` | 0-3 | **4.43** | marginal — 0.07 under AA |
| `quiet` | 0-3 | **4.57** | pass |
| `open` | 0-9 (full frame) | **4.00** | **fail** |
| `sitting` | 0-3 | **4.96** | pass |
| `finished` | 0-3 | **3.70** | **fail** |

The laptop viewport tracks within ±0.1 of these throughout.

**Two real failures, and they are the two phases the palette comment did not
anticipate.**

`finished` is the worst and the reason is legible in `CAM`: it is the only phase
that turns the vignette almost off (`dim: 0.04`) *and* brightens the photograph
past unity (`br: 1.14`). The device that makes cream type readable on a lit
photograph is deliberately withdrawn at exactly the moment `Afterwards` puts its
quiet stat rows on screen. `globals.css:55-63` records the last fix here —
raising `ink-3` from `#87847f` after an on-composite reading of 4.03:1 — and it
was the right move, but it was measured against a sitting, not against the
ending. The ending is darker in intent and brighter in fact.

`open` fails only in the lower half, which is the half the band reaches into
when the questions take the full frame. `SessionSetup`'s folded summary rows sit
there.

**What this does not model, and which way it errs.** The flame canvas and the
`mix-blend-screen` glow are excluded — both brighten, both are local to the
flame, and no text is set on the flame. Excluding them makes the figures
slightly *optimistic* in a band immediately around the flame and correct
elsewhere. The lit wax in the lower half of the frame, which is where the
brightest sampled values come from, is in the photograph itself and is modelled.

**Recommended, and not done here — it is a look decision, not a defect fix.**
Three options, in increasing cost:

1. Raise `CAM.finished.dim` and `CAM.returning.dim` from `0.04` to about `0.18`.
   One number each, no palette change, and it buys roughly 1.2 of ratio. It
   costs the ending some of its openness, which is the whole point of that
   phase — so this is Tenzing's call, not a fix to be applied quietly.
2. Set `Afterwards`' quiet rows in `ink-2` rather than `ink-3`. `ink-2`
   (`#b5b2ad`, relative luminance 0.447 against `ink-3`'s 0.311) is the
   *lighter* of the two and therefore the stronger one on a dark ground — which
   is why the new landing sentence uses it. Narrow, and it puts two greys in the
   ending.
3. Extend `scripts/contrast.mjs` to run this composite check in CI, so the next
   camera change cannot quietly re-break it. This is the §3 P2 item and it is
   the one worth doing whichever of the above is chosen — the gate currently
   reports twelve green pairs while two phases are red.
