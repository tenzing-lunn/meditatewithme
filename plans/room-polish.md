# Room polish — dead controls, and the reason it looks generated

Active plan — **only §4 is still open** (the product model, and measurement).
Phases 1 and 2 landed in `5b6b239`; §4A–C were then overtaken by the
photographic room and the field's deletion in `8d59fba`, and are marked so
below. Read §1 and §4 for what remains; §2–§3 are kept as the record of what
was found and why.

Written 30 August 2026 against `dev` at `1da89f6`, from a rendered
audit rather than a code read: the room was served headless at 390×844 and
1440×900, screenshotted in every state, and every interactive element hit-tested
with `elementFromPoint`. Reproduce it with the harness in §6 before and after.

Revised the same day after a second review (Codex), which read the flow rather
than the pixels and found the frame this plan was missing. §1 is now that frame;
§4 is where it lands. Where the two reviews disagree — on whether polish should
wait for the product model to be resettled — the disagreement is written down
rather than averaged.

---

## 1. Why this exists

The room is feature-complete and it does not feel like the thing in the
proposal. That gap is usually treated as vague, so this plan refuses to treat it
that way. Everything below is either a control that fails a hit test, or a
pattern with a number next to it.

**The frame.** Three concepts are live in the codebase at once, and no document
ever chose between them:

1. Everyone gathers at the top of the hour. — the proposal
2. Nobody is ever told to come back later. — `8821de1`, and right
3. Everyone sets an independent timer. — what `SessionSetup` actually does

Each was a defensible decision at the moment it was made. Nobody rewrote the
end-to-end model afterwards, so the interface silently defaults to (3): the
first thing a visitor is asked is *how long do you personally want to sit*, and
the shared hour survives only as a candle height and a line of small text. That
is why the site reads as a private timer that other people happen to be near.

This matters for how the rest of the plan is read. §2 and §3 make the current
journey work and stop it looking generated. **They do not make it the right
journey.** Only §4 does, and §4 is a product decision with a client attached.

The uncomfortable half: some of what makes the room feel generated is work that
was specified carefully and built correctly. `presence-spec.md` argued for a
field of flames and was right about the product; the implementation renders as a
6×10 grid of identical shapes with half of them dark, which is a texture nobody
asked for. Being right in prose and wrong on screen is the normal failure here,
and it is why this plan is written from screenshots. Both reviews reached the
flames independently, which is the strongest signal in either of them.

---

## 2. Phase 1 — the broken things · ~2.5h · do first

Blocking. None of this is design work and none of it is negotiable.

### A · `.candle-glow` swallows clicks

`components/Candle.tsx` renders the glow as `absolute -inset-12` over a 256px
box with no `pointer-events-none`. It therefore overhangs roughly 48px past the
bottom of the candle, into whatever follows in normal flow. `elementFromPoint`
at the centre of these returns the glow div, on phone **and** desktop:

| Control | State | Result |
|---|---|---|
| `Sitting for 10 minutes` / `change` — the first setup row | idle | dead |
| `Sound` — the mixer toggle | sitting | dead |

Both are advertised affordances. The mixer toggle is the one the proposal
explicitly promises can be reached mid-sitting, and it cannot be reached at all.

Fix: add `pointer-events-none` to the glow. The floor-pool div two elements
below it already has it, which is what makes this an oversight rather than a
decision. Then check every other absolutely-positioned decorative layer in the
codebase for the same omission — `.presence-field-glow` is the other candidate.

### B · `Sit again` and `Finish` are the same button

`components/Room.tsx`, `Afterwards`: both `onClick={onAgain}`. Two buttons, one
handler, one behaviour. Offering a choice that isn't one is worse than offering
no choice.

Decide what Finish means before wiring it. The likely answer is that Finish
leaves the acknowledgement on screen and does *not* re-open the setup stack —
the person said they were done, and returning them to a duration picker argues
with them. If Finish and Sit again genuinely should do the same thing, then
there is one button and it says `Sit again`.

### C · `You sat for 1 minutes.`

Same component. Pluralise it.

### D · 16px tap targets

`Sound` and `End this sitting` during a sitting are 16px tall — under half the
44px minimum, on the one screen most likely to be used one-handed with the eyes
half shut. Give them vertical padding; do not give them a border, which would
undo Phase 2.

### E · `showCount` is a preference nobody can set

`lib/types.ts:103` declares it, `lib/preferences.ts` defaults it, parses it,
compares it in `equal()`, and **writes it to Supabase as `show_count`**.
`Room.tsx:267` gates the whole presence field on it. There is no control for it
anywhere in `components/` — no checkbox, no switch, nothing.

It was lost in the progressive-setup redesign, and the redesign left its
tombstone behind: the palette comment in `globals.css` still says *"see the
switch in `SessionSetup.tsx`, which uses `ink-3` for its off state for exactly
this reason"*, referring to a switch that no longer exists. So a column
round-trips to the database for a preference no visitor can express, and a
design note in the stylesheet documents a component that was deleted.

This is not a product question — the plans require the room be hideable, and the
state to do it is fully plumbed. Restore the control, or delete the preference
and the column and the comment. **Do not restore it into the setup stack.** That
stack's whole argument is one question at a time, and "do you want to see other
people" is not a question to ask someone before they have seen any. It belongs
next to the field it governs, or in the same quiet register as `Your practice`.

Fix the stale `globals.css` comment either way — `CLAUDE.md` requires standing
knowledge be corrected in the commit that makes it wrong, and this one has been
wrong for a while.

### F · `scripts/contrast.mjs` passes a palette that fails

The script hand-duplicates the palette in a `THEME` constant instead of reading
`globals.css`, and the two have drifted. It checks light `paper` as `#fbfaf8`.
The stylesheet has said `--color-paper: #f4efe4` since before the current HEAD.

Against the colour the script uses, against the colour the page actually uses:

| | script's `#fbfaf8` | real `#f4efe4` | |
|---|---|---|---|
| `ink-3` | 4.51 | **4.10** | fails AA |
| `ember` | 4.53 | **4.12** | fails AA |

`node scripts/contrast.mjs` reports *"All pairs clear their threshold"* while the
light palette misses AA on two of them. Note that 4.10 is the exact figure the
`globals.css` comment cites as the *pre-fix* value for `ink-3` — the fix was
recorded as done against a paper colour the stylesheet never adopted.

A guard that reports green while the thing it guards is red is worse than no
guard, and this one is cited as authority: *"Check with `node scripts/contrast.mjs`
before changing any of these."* Make the script read the `@theme` block rather
than restating it. Palette values must exist in exactly one place.

Mitigating, and only mitigating: see the working-tree note below — light mode is
being removed, so nobody currently sees the failing pairs. That makes this less
urgent and not less wrong; the drift mechanism survives the removal of light
mode, and the dark palette is checked by the same hand-copied constant.

### G · Uncommitted work in the tree — decide before starting

`git status` shows `app/globals.css` and `app/layout.tsx` modified and
uncommitted. They are not trivial: together they make the room **always dark**,
independent of system preference — `:root` replaces the
`@media (prefers-color-scheme: dark)` block, and `layout.tsx` drops its
light/dark `themeColor` pair for a single value.

That is a product decision sitting in a working tree. It is not in
`ARCHITECTURE.md`, not in any plan, and not in a commit message. The same diff
deletes the comment recording why the light ink values are what they are, while
leaving those values in the `@theme` block — which is how §2F stayed invisible.

Whoever starts Phase 1 resolves this first: commit it with the reasoning written
into `context/`, or revert it. Do not build on top of an undecided tree, and do
not sweep it into a commit about something else.

---

## 3. Phase 2 — the signature · ~3h

Nothing here is a bug. Together it is why the room reads as generated, and each
item is countable rather than a matter of feel.

### The tally, as built

| Pattern | Count | Where |
|---|---|---|
| `font-mono uppercase tracking-[0.13em]` micro-labels | **15** | see below |
| `rounded-full` | 7 | chips, Begin, email field, both ending buttons |
| Native `<input type=range>` with `accent-ember` | 3 | duration slider, 5 mixer faders, master |
| `text-center` / `items-center` | 17 | everything except the mixer, which is left-aligned by accident |
| Type families | 3 | Instrument Serif, Plex Sans, Plex Mono, with no rule for which gets which |

### A · Cut the mono caps from 15 to at most 2

Tracked monospace capitals as the universal micro-label is the single loudest
generated-page tell in the file. `SITTING`. `SOUND`. `END THIS SITTING`.
`AND 13 MORE`. `SIT AGAIN`. `FINISH`. Nobody designing a meditation timer from
scratch labels it `SITTING` in tracked monospace.

Every instance:

```
components/Room.tsx:246   "Finding the hour…"
components/Room.tsx:307   endEarly — "End this sitting"
components/Room.tsx:415   SittingClock — "Sitting"
components/Room.tsx:482   Afterwards — "Sit again"
components/Room.tsx:489   Afterwards — "Finish"
components/Room.tsx:525   SoundDrawer toggle — "Sound"
components/Room.tsx:566   PracticePanel toggle — "Your practice"
components/Room.tsx:604   PresenceMessage — "You began with N others"
components/Room.tsx:615   PresenceMessage — "You are the first here this hour"
components/PresenceField.tsx:80   "and N more"
components/Practice.tsx:39  "Your first sitting will show up here."
components/Practice.tsx:65  "N sittings · N minutes"
components/Practice.tsx:73  "Longest N days"
components/SignIn.tsx:66    "Check your email. The link signs you in."
components/SignIn.tsx:121   "Send me a link"
```

Rules for the pass:

- **Sentence case, Plex Sans, `ink-3` is the new default** for all of these.
- **Delete rather than restyle where the label is redundant.** `SITTING` above a
  countdown says nothing the countdown does not; `remaining in your sitting`
  below it says it a third time. One of the three lines survives.
- **`AND 13 MORE` goes entirely** — see §4A.
- Mono survives only where the glyphs are doing mono's job: the `mmss` digits,
  and arguably nothing else. Keep `tabular-nums` on anything numeric; that is
  not the same decision.

### B · Style the sliders

Native range inputs with `accent-ember` are the visual equivalent of an
unstyled `<select>`, on the control the product is most often touched by. Thin
track, small warm thumb, `ember` fill behind the thumb, focus ring that matches
the rest of the page. ~30 lines in `globals.css`, `::-webkit-slider-thumb` and
`::-moz-range-thumb`. Keep the elements native — the accessibility work in
`SessionSetup.tsx` (`aria-valuetext`, the index-into-`TIMER_STOPS` trick) is
correct and must not be rewritten into a div.

### C · Move the countdown below the candle, and shrink it

`SittingClock` renders `text-6xl`/`text-7xl` above the candle, so the page says
"everyone is watching the same candle" and then puts a ticking number where the
eye lands first. The candle becomes decoration below the fold of attention. This
is the one item in Phase 2 that is a product contradiction rather than a style
one.

Below the candle, smaller, `ink-2`. If it can fade to `ink-3` after ten seconds
and return on tap or pointer move, better still — but ship the reposition first
and treat the fade as separate.

### D · One radius scale, one type rule, in `globals.css`

Seven `rounded-full` across chips, a primary button, a text input and two
secondary buttons means no radius decision was ever made. Pick a scale — a pill
for the primary action only, a small radius elsewhere, or the reverse — and put
it in `@theme` next to the palette, with the same "check before changing" note
the colours already carry. Same for type: write down which family does display,
which does body, which does numerals, so the next component is not invented
from scratch.

### E · Give `The bell` more weight than the personal presets

The one item in Phase 2 that changes the product rather than the look, and the
cheapest thing in this document by a distance.

`SessionSetup.tsx` renders `1 min · 10 min · 30 min · The bell` as four
identical chips of equal width, in a row, with the shared option last. Three of
those are private timers. The fourth is the only control in the entire product
that makes two strangers finish at the same moment — `presence-spec.md` §C, the
strongest rung on its own ladder — and it is dressed as a fourth preset.

Give it its own line, its own weight, and copy that says what it is: the label
`The bell` explains nothing to someone who has never used the site, whereas
*"End together, at 1:00 AM"* explains the entire product in five words. The
supporting sentence below the slider already says this correctly — it is simply
below the fold of attention while the chip that triggers it is not.

This does not resettle the product model (§4) and does not need Jonny. It
reweights an existing control. It also has a second-order effect worth naming:
`You began with N others` fires on a 30-second cohort window, so it currently
depends on strangers happening to press Begin at the same time with nothing in
the UI encouraging it. Anything that concentrates arrivals makes the room's one
sentence of togetherness fire more often.

### F · `Begin` falls below the fold on the sound step

Measured: the sound step is 994px of content in an 844px viewport at 390×844, so
the last question in the stack pushes the only button that matters off-screen.
The stack was built to stop exactly this — its own comment cites a 2,280px page
with Begin three screens down — and the mixer has quietly reintroduced a smaller
version of it. Five faders and a master is a tall control; either the mixer
collapses to something shorter by default, or `Begin` is pinned once `canBegin`
is true.

---

## 4. The product model — not authorised, and not polish

Everything in this section follows from §1: the interface defaults to the
private-timer concept, and no amount of §3 fixes that. These are not staged
polish items. They are the product.

### The sequencing disagreement, written down

The second review's recommendation was: settle the shared-hour journey before
starting Phase 2 or step 08. Specifically, adopt a decision along the lines of
*"a shared meditation begins at the top of every hour; joining it is the primary
path, sitting immediately is always available as the secondary path"*, prototype
that flow, and test it on five people unfamiliar with the project.

**The diagnosis is right and the sequencing is not.** Three reasons, and whoever
picks this up should weigh them rather than inherit the conclusion:

- The model it proposes replacing was chosen deliberately in `8821de1`, argued
  in `ARCHITECTURE.md`, extended by `presence-spec.md`, and built as the
  presence work — **which Jonny has not yet been told about**: the change
  order in `plans/presence-change-order.md` was never sent. Reopening the model
  is still a client conversation, now a harder one, because the work exists
  before the conversation has happened. Not a prerequisite an agent clears on
  its own before touching typography.
- The cap is 55 hours with step 08 — legal copy, real-device QA, auth SMTP,
  domain, security advisors — still entirely open, and several of those are
  blocked on Jonny rather than on us. Spending the remaining hours re-deciding
  the product model is how v1 does not ship.
- Phase 2 is not wasted work under the new model either. Mono caps, slider
  styling, radius tokens and countdown placement survive any journey the
  gathering could take. §3E is the exception and it points the same direction
  the second review wants to go, for about an hour.

So: **Phase 1 now, §3E next, the rest of Phase 2 in parallel, and §4 raised with
Tenzing and then Jonny as its own conversation.** The one part of the second
review's proposal to take immediately and cheaply is the comprehension test —
five people, five seconds, four of these five answered correctly:

> What is this site? · When are people meditating together? · What should I do
> next? · What do the small flames represent? · What happens at the next hour?

That is worth running against the *current* build before anything is redesigned,
because it produces evidence for the Jonny conversation instead of an opinion.
Question four is the one to watch; both reviews expect it to fail.

### Items

### A · The presence field — resolved 1 September, deleted in `8d59fba`

Tenzing made the call looking at it live. The field is gone; the dots on the
sitting ring carry the same fact in the middle of the frame, keeping the
lit-but-gone distinction. Unbilled, as this section required. The text below
is the finding as written.

It renders as a 6×10 grid of identical teardrops with visible rows and columns,
half of them dark brown, captioned `AND 13 MORE`. It reads as a sprite sheet
that failed to load, or a skeleton state. The ring on slot zero reads as a
selection artifact rather than as *you*.

`ARCHITECTURE.md` §2 says the count is approximate by nature and nobody can tell
43 from 45. If that is true — and it is — then one honest sentence is both truer
and quieter than sixty synthetic flames. If a visual survives, it cannot be a
grid: varied scale and opacity, no rows, no cap message.

**Why it was not authorised at the time.** The field is `docs/presence-spec.md`
§A and it was built as part of the presence work. Reworking it is defensible as
quality; describing it to Jonny as scrapped is not — he has not seen it, so
there is nothing to describe, but the hours it cost still happened and still
have to be accounted for somewhere. It was raised with Tenzing, who decided.

### B · The ending — resolved in `5b6b239`

The masthead is gone from the ending; the bell is followed by ten seconds of
*Come back* before anything is read, then the facts, then the controls. See
`ARCHITECTURE.md` §16, *The ending is thirty seconds long*.

The bell rings, and the masthead returns at full brightness — title, tagline,
`Lit at 12:00 AM · next at 1:00 AM` — before the acknowledgement fades in
underneath it. The 2.6s delay in `Afterwards` was written so nothing lands on
top of the bell, and then the marketing header lands on top of the bell. The
gentlest moment in the product is its most jarring transition.

Fix is small — hold the masthead back, or fade it in with the acknowledgement
rather than instantly — but it changes the shape of a moment the proposal is
specific about, so it gets decided rather than assumed.

### C · The candle's dark palette — moot since `5b6b239`

`Candle.tsx` is deleted. The room is a photograph (`CandleScene.tsx`) and the
burn is spent on the flame's scale and glow rather than the wax. Whether the
photograph is itself the stand-in for a licensed loop from Jonny, or the thing
that ships, is an open question for `context/PRODUCT.md`.

`--color-wax-lit` is `#6b5133`, darker than the glow behind it, so the wax reads
as a brown tube with a glowing egg balanced on top. The melted pool is
invisible at render size and the flame is ~36×50px against a 58px body — far
too wide. Three of the four things `Candle.tsx` names as making it read as a
candle do not survive the dark palette.

Left alone deliberately: `Candle.tsx` is a stand-in for a licensed video loop
Jonny is sourcing, and repainting a component that is scheduled for deletion is
the wrong hour to spend. Revisit only if the loop slips past launch.

### D · Measurement

v1 exists partly to learn whether people gather and whether they return, and
there is no way to answer either question. `heartbeats` is discarded hourly by
design and carries no retained shape; nothing records arrival-by-hour, Begin
rate, shared-bell participation, or return visits.

Named here rather than scheduled, because it is blocked twice over. The
`heartbeats` table is deliberately ephemeral and retaining anything from it is
an architecture change, not an addition. And a privacy-safe measurement plan
cannot be written before Jonny supplies the legal entity, data-controller name
and minimum-age decision — all outstanding on `launch-readiness.md`, all already
chased. Whoever raises §4 with Jonny should carry this in the same conversation:
the questions v1 was meant to answer need one small decision from him to become
answerable at all.

---

## 5. Acceptance

Phase 1 is done when, on 390×844 and 1440×900:

- [x] No interactive element fails the `elementFromPoint` hit test in §6.
- [x] `Sound` opens the mixer mid-sitting, by tap, on a phone.
- [x] `Finish` and `Sit again` do different things, or there is one button.
- [x] A one-minute sitting reports `You sat for 1 minute.`
- [x] Every control is ≥44px tall.
- [x] `showCount` either has a control or no longer exists — including its
      Supabase column and the `globals.css` comment describing its switch.
- [x] `scripts/contrast.mjs` reads the palette from `globals.css` rather than
      restating it, and its verdict is trustworthy again.
- [x] The always-dark change is committed with its reasoning in `context/`, or
      reverted. The tree is clean before Phase 2 starts. (`ARCHITECTURE.md` §1,
      *The room is always dark*, in `5b6b239`.)

Phase 2 is done when:

- [x] `grep -rn "tracking-\[0\.1[35]em\] uppercase" components/` returns ≤2.
- [x] The countdown sits below the candle.
- [x] Range inputs are styled in `globals.css` and still carry their
      `aria-valuetext`.
- [x] Radius and type rules exist in `@theme` as tokens.
- [x] The shared-bell option is visually distinct from the personal presets and
      its label says when the room ends together.
- [x] `Begin` is reachable without scrolling at 390×844 on every step.
- [x] `node scripts/contrast.mjs` still passes — the mono-caps pass moves text
      to `ink-3` in places, which is a contrast change. This criterion is only
      worth anything once §2F is done; until then the script is not evidence.

Throughout: `npm run typecheck`, `npm test`, `npm run build` on `dev`. Branch
off `dev`, merge back into `dev`. Nothing here goes near `main`.

---

## 6. The harness

Reproduce the audit rather than trusting this document. With the room running:

```js
// hit-test every interactive element in a given state
const rows = await page.$$eval('button, a, input, [role=button]', els =>
  els.map(el => {
    const r = el.getBoundingClientRect();
    if (!r.width) return null;
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return {
      label: (el.textContent || el.type || el.tagName).trim().slice(0, 30),
      height: Math.round(r.height),
      blocked: top && !el.contains(top) && top !== el ? top.className : '',
    };
  }).filter(Boolean),
);
```

Run it idle, mid-sitting, and after the bell, at both widths. Seed
`localStorage` with `mwm.settled = '1'` for the returning-visitor path and
`mwm.preferences` for a one-minute sit; stub `/api/count` to render the presence
field without Supabase. A `blocked` value that is not empty is a dead control,
and it is the check that would have caught §2A the day it was written.

---

## 7. Hours

| | |
|---|---|
| Phase 1 — dead controls, `showCount`, contrast guard, tree, grammar, tap targets | ~2.5h |
| §3E — shared-bell hierarchy | ~1h |
| Phase 2 — the rest | ~3h |
| Comprehension test against the current build | ~1h |
| §4 | not estimated, not authorised |

Against a 55-hour cap with step 08 still open, Phase 1 is not optional and
Phase 2 is the cheapest available improvement to how the room feels. §4 is
where an unbounded design pass would start, which is exactly why it is fenced —
and why §3E exists: it is the one change that moves the product toward the
gathering without reopening what the gathering is.

`TIMELOG.md` now exists, with every hours cell unfilled. Confirming it is a
prerequisite for the §4 conversation, because *"where are we against the 55?"*
is the first thing Jonny will ask.
