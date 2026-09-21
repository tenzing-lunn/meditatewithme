# Flow audit — the site as a visitor walks it, 9 September 2026

Written against `dev` at `b28ef08`, after walking every screen in the browser
at 390×844 and 1440×900: the guest landing, the three questions, a one-minute
sitting, the ending, the guest `Finish`, Home signed in, Home's settings, and
`/world`. The one-minute sitting ran on the second origin (`127.0.0.1`), so its
entry landed in that origin's own practice log, not Tenzing's.

`docs/design-audit.md` (7 September) scored the surfaces. This one asks a
different question, the one an investor asks after five minutes with the
product: **does it flow, what is said twice, and does the interface argue the
same thing the vision does?** The answer is: the surfaces are careful and the
journey between them is not. Most of what follows is about the guest, because
the guest is nearly everybody — sign-in email still reaches only the Resend
inbox (`PRODUCT.md` §1), so the signed-in path that got the one-tap treatment
is the path almost nobody is on.

Status column filled in as each item lands on `dev`.

---

## 1. The verdict in three sentences

The signed-in person presses one circle and is sitting. The guest presses
*Let’s begin.*, is asked three questions on three screens, presses *Next*,
*Next*, *Start*, and is sitting — and after the bell, *Sit again* sends them
back to do all of it again, while *Finish* leaves them on a photograph with no
way off it. Two settings interfaces, four words for "start", and two different
clock times for the one shared moment — the product's whole claim — are what
the redundancy looks like from the outside.

---

## 2. The items

### [P0] A · A guest who presses `Finish` is stranded

`Afterwards` in `Room.tsx`: `Finish` for a guest calls `setFinished(true)`,
which removes *Sit again* and *Finish* and leaves `activity` at `finished`.
What remains on screen is *Hide the room*, *Your practice*, *Next candle at
2:00 PM* and *Create account*. There is no *Let’s begin.*, no back, nothing that
returns to `idle`. Verified: the only way to sit again after `Finish` is to
reload the page. The file's own comment says sending them to *Begin.* "would
read as the site asking them to go again the instant they said they were done"
— but leaving them nowhere is worse, and it is the last thing a first-time
visitor experiences.

**Fix.** `Finish` for a guest returns to the landing (`setActivity({kind:
'idle'})`, mix restored), the same place `End this sitting` already goes. The
`finished` local state and the branch that hides the buttons go with it.

### [P0] B · `Sit again` for a guest is not again

Signed in, `onAgain` calls `begin()` — one tap, same settings, sitting. A guest
gets `setActivity({kind:'idle'})`: the landing, then *Let’s begin.*, then three
questions they answered ten minutes ago, then *Start*. Five taps, for a button
whose label promises one. Same fix as the signed-in branch: `begin()` in the
click, for everybody. The questions are still reachable from the landing.

### [P0] C · The guest walks three screens the signed-in person reads in one line

This is the flow finding, and it is the one the rest hang off.

Home answered the "no skip path" argument in `SessionSetup.tsx` (lines 43–47)
by printing the settings under the button and letting *Change* open them: *the
question is still put every time; it is read instead of walked*. That argument
was accepted for the daily user and withheld from the guest — who is the
person deciding whether to come back at all. Six taps to the first sitting,
against one.

**Fix.** The landing takes Home's model. Under *Let’s begin.*, one line in the
same words Home uses — *10 minutes · singing bowl · in silence* — and a *Change*
beside it. *Let’s begin.* starts the sitting, inside the click (audio unlock,
`mix.ensure()`, `mix.restore()`, exactly as `begin()` does now). *Change* opens
the questions in the band, as now, with *Start* at the foot; nothing about the
questions themselves changes in this item. A first-time visitor gets the
defaults, and is told what they are before they get them, which is what Home
does. The standing sentence and the `/world` link stay.

`SessionSetup.tsx`'s header, `Room.tsx`'s `openSetup` and `BeginWord` comments,
`ARCHITECTURE.md` §16 and `PRODUCT.md` §2 all describe the old path and must be
corrected in the same commit.

### [P1] D · Two settings interfaces for four preferences

`SessionSetup.tsx` (452 lines) and `Settings` in `Home.tsx` (~200 lines) both
edit `timerMinutes`, `untilBell`, `endBell` and `soundMix`. They share `lib/`
helpers and nothing else: the wizard has *How long? / How should it end? / Any
sound?* on three screens with folded summary rows and *Next*; the panel has
four rows *How long / How it ends / Sound / The room*, one open at a time. The
sound step differs too — chips then *Adjust levels* in the flow, the full
eleven-control mixer on Home. Two behaviours for one preference is the
definition of redundant, and every fix so far has been made twice.

**Fix, after C.** One `Settings` component (`components/Settings.tsx`),
extracted from Home's, used by both: Home's *Change* and the landing's
*Change*. The sound row takes the flow's better answer — the switch, then
chips, then *Adjust levels* — in both places. In the room it opens in the band
with the camera at `open`, and closes with *Done changing*, back to the landing
word. `SessionSetup.tsx` is deleted. The bell stops being a screen of its own
without anybody having to argue it: it is a row, the way it already is on Home.

The room row (*Show the room*) reaches guests for the first time this way,
which is what lets E happen.

### [P1] E · The ending has six things on it thirteen seconds after a bell

Guest ending: *1 minute.*, the table, *Sit again*, *Finish*, *Hide the room*,
*Your practice*, *Next candle at 2:00 PM*, *Create account*. The design audit
called the second row "the two nobody came back for" and it was kept for guests
only because they had nowhere else to find either. After D they do.

**Fix.** *Hide the room* leaves the ending. It is the one control in the product
that turns the room into the private timer `VISION.md` §4 names as the failure
mode, and it should not be offered at the moment the room has just shown
itself. It stays as a settings row. *Your practice* stays on the ending for
guests — Home has the log, the room has nowhere else for it.

### [P1] F · The shared moment has two clock times

Home and the ending say *Next candle at 2:00 PM*. The questions say *Sit
together until 1:55 PM* and *You’ll finish with everyone else at 1:55 PM*.
Since the 55-minute hour those are different minutes, and a visitor is told
about both on adjacent screens with nothing relating them. This is the
product's central mechanic and it is named twice.

**Fix.** One moment, one name, everywhere it is stated to a person: the bell,
because the bell is the thing people do together (the candle is what they look
at). Home's line and the ending's line become *The next bell is at 1:55 PM*
(`nextSharedBellAt`, not `nextHourStart`). The `/world` caption and the
landing's *A candle was lit at* stay — they describe the candle, correctly.

### [P2] G · The account menu drops over the landing word

At 390×844 the menu panel (`bg-panel/95`) opens across *Let’s begin.* and the
word shows through it. Two things in one place, one of them the largest thing
the product says. **Fix:** the panel is opaque (`bg-panel`), and it opens
below the word's line, or the word yields. Measured, the cheapest is opacity
plus a top offset so the panel clears the display type.

### [P2] H · Four words for one act

*Let’s begin.* (landing) · *Start* (last question) · *Sit* (Home) · *Sit again*
(ending). After C the guest's ordinary path uses only the first, and *Start*
survives only inside *Change*; after D it is *Done changing*, and *Start* goes.
Recorded so that nobody reintroduces a fifth. No separate work.

---

## 3. Not built, and why

**The shared hour as the primary path.** `Sit together until 1:55 PM` is still
a button under a slider that defaults to a private timer, and item C does not
move it — it leaves the default where it is. Whether joining the hour should
be the first thing offered is `plans/room-polish.md` §4 and `PRODUCT.md` §5,
and both say it is a Jonny conversation. Nothing here reopens it. It is the
largest remaining gap between the vision and the interface and it needs a yes,
not an agent.

**Home's masthead `Sign out`.** The most prominent control on the page you
came to sit from is the exit. `PRODUCT.md` records the decision to keep it
away from *Delete account*, so it stays; noted only.

---

## 4. Order, and status

| | Item | Status |
|---|---|---|
| 1 | A · guest `Finish` returns to the landing | done, `d035427` |
| 2 | B · guest `Sit again` sits again | done, `9f688ba` |
| 3 | C · the landing reads the settings; *Let’s begin.* starts | done, `f085b68` |
| 4 | D · one `Settings` for both surfaces; `SessionSetup` retired | done, `2f094c5` |
| 5 | E · *Hide the room* leaves the ending | done, `70fae01` |
| 6 | F · one time for the shared moment | done, `456fcac` |
| 7 | G · the menu clears the word | done, `646f363` |

Each lands as its own commit on `dev` with typecheck, tests, contrast and
build green, and with `PRODUCT.md` §2 corrected wherever the visitor's
experience changed. Nothing goes to `main` without being asked.
