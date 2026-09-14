# The product, as it is today

Standing knowledge: what the site *is* at the current commit, what was decided
to get it here, and what is still undecided. `VISION.md` is the idea;
`ARCHITECTURE.md` is how it runs; this is the thing in between. **When a commit
changes what a visitor sees, fix this file in the same commit.**

Last verified 14 September 2026 on `ui-warm`, the branch carrying the UI
rebuild (`docs/ui-rebuild.md`). `main` still serves the photographic room
from the release merge `cc712c6` of 7 September; §2 describes the rebuild,
and §3's history says what it replaced.

---

## 1. Live status

**The room is live at meditatewithme.vercel.app.** `main` was merged from
`dev` at `626ef93` on 1 September 2026 (11:55 local), replacing the holding
page. Every push to `main` is now a release of the room, not of a placeholder.
The latest release is `cc712c6` on 7 September 2026, which put live the
three-line account menu, in-app account deletion, the 55-minute hour with the
shared bell at :55, the loudness-matched beds, the icon and share image, and
per-device sign-out. **The 55-minute hour went live before Jonny answered the
timing questions** in `plans/timing-message-to-jonny.md`; Tenzing's call.

Known open at the moment of launch, and still open:

- No privacy notice, terms, or age policy — waiting on Jonny's legal-entity
  and minimum-age decisions. Both pages are built on `dev` (8 September
  2026): `/privacy` with the controller and contact as unfilled gaps, and
  `/terms`, which carries the age policy as a section, with those two plus
  the minimum age and the governing law as gaps. Nothing links to either
  until they are filled. The site sets a localStorage id, writes
  heartbeats, and now asks for a name and an email address, so this is not a
  cosmetic gap — and the name is a new category the inventory has to cover.
- Mail leaves through Resend, not Supabase's shared sender, since the evening
  of 7 September 2026: Tenzing set custom SMTP in the dashboard (host
  `smtp.resend.com`, sender name *Meditate With Me*), which also lifted the
  hourly send limit from 2 to 30. **The sender address is still Resend's test
  one, `onboarding@resend.dev`**, because there is no domain yet. That address
  delivers only to the Resend account's own inbox, and Gmail filed the first
  message from it as spam ("similar to messages identified as spam in the
  past" — the domain's reputation, not the message). So sign-in mail is still
  not reaching ordinary visitors. Before Resend, the shared Supabase sender
  had already cost a real sign-up: of the four accounts on the project, one,
  created 4 September at 13:50, never confirmed and never signed in.
- The email now carries the six-digit code — **for a returning address only,
  until the Confirm signup template gets it too** (found 13 September 2026: a
  new address is sent that template, which was never edited). With the default sender gone the
  template could be edited, and it was, the same evening, through the
  Management API: subject *Your code for Meditate With Me*, the code in large
  type, the link underneath as the alternative. Proved end to end: a real
  request from the live site produced an email with `754334` rendered where
  `{{ .Token }}` was, in Tenzing's inbox. The auth server's code length had
  been moved from eight digits to six earlier that day.
- The custom domain is unattached; Supabase Site URL points at the Vercel
  address. **13 September 2026: going with `meditatewithme.online`** — in
  Jonny's own IONOS account. The same day it was pointed and certified
  (`https://www.meditatewithme.online` serves the site), verified in Resend,
  and made the Supabase Site URL and the SMTP sender
  (`signin@meditatewithme.online`); a second-device sign-in test is what's
  left (`plans/launch-readiness.md`, the domain rows).
  What follows about `.com` still stands for whenever that is sorted. **This is now the one thing between visitors and a working
  sign-in email.** The domain is **`meditatewithme.com`** — looked up 7
  September 2026: registered February 2013 at GoDaddy, DNS served by
  Cloudflare, and at present it **302-redirects to
  `susantaylor.org/meditate-with-me/`**, so pointing it at this site takes
  that redirect away and Jonny has to say yes to that. No MX records exist,
  so no mailbox at the domain is disturbed by adding Resend's. Tenzing added
  `meditatewithme.com` and `www` to the Vercel project the same evening
  (apex redirecting to `www`); both read *Invalid Configuration* until the
  records go in at Cloudflare. Then: verify it in Resend (DKIM, SPF, DMARC),
  change only the sender email in Supabase's SMTP page to an address at it,
  and the spam placement and the own-inbox restriction both go.
- No real-device QA pass recorded. *(The favicon and Open Graph card landed 7
  September 2026 — see §2.)*

Rollback candidate named in the launch commit: `defa583`; in the latest
release, `7026657`.

## 2. What a visitor gets

**Rebuilt on 14 September 2026** (`docs/ui-rebuild.md`, on `ui-warm`). The
photographic room, the landing word, the settings panel and the ring are gone;
what follows is the site as it is now. The functionality underneath — the
shared hour, the bell at :55, the three bells, the five beds, the practice
log, accounts, the earth — is the same, and the history of each is in §3 and
in `ARCHITECTURE.md`.

**Welcome.** A warm, light screen, set like a title page: everything hangs
from the left margin and is centred against the height of the window, and the
wordmark grows with the screen it is opened on — the size of a title on a
laptop, not a heading in an app. *Meditate with me* in the rounded face, one
sentence under it — *A session begins at the top of every hour, and everyone
in it sits together. Join this one, or sit on your own.* — and *Join a
session* immediately beneath that sentence, an arrow on it pointing the way
the screens move. When two or more people are sitting, one ember line above
the wordmark says so, with a dot beside it that breathes; the line keeps its
height whether or not the count has arrived, so nothing moves when it does.
Nothing is in the background. The three-line menu at the top right opens
`Create account` and `Sign in`. A returning guest also sees a card, *Your
usual: 10 minutes · singing bowl · in silence*, with a switch, *Skip the
questions next time*; with it on, *Join a session* goes to the doors and then
straight to the bowl. **Rewritten 14 September 2026**, replacing a 28rem
column centred in the window with the invitation stranded at the foot of it.

**The questions, one screen each.** Each slides in from the right as the last
slides out, hanging from the same left margin as the welcome so the rail
reads as one page whose content moves, with a small *Back* on the left and a
small *Next* on the right, and the question itself is what a screen reader is handed on
arrival. Escape is *Back*. The
questions, in order:

1. *What should we call you?* — the screen is a line and nothing else: no
   visible question, no explanation, only the small foot. *Enter your name*
   types itself out on the line in a pale brown with a caret after it, and
   goes on the first key; what you type is in full ink. Optional, *Skip*.
   Signed in, never asked: the account's name is used. A name already given
   shows on the line instead of the prompt.
2. *Where are you sitting?* — the same bare line, *Enter your town*; typed,
   then chosen. The letters search about 33,000 towns of 15,000 people or
   more and every country (GeoNames, searched in the browser, so nothing
   typed is sent anywhere), and the matches open under the line — *Lisbon ·
   Portugal* — with the arrows and Enter to take one. A town too small for
   the list is still an answer: the last choice is always *Keep "…" as you
   typed it*. Clicking the empty line offers the town and country the server
   sees from the connection as the one choice — *Lisbon, Portugal · near
   you*. *Leave it out*. Once something is typed, a switch appears under the
   line, off by default: *Let others
   see Ana from Lisbon while you sit with them*, and one line saying nothing
   is kept on our side until you say yes. Asked once; changeable from the
   account.
3. *With others, or by yourself?* — two doors. *With others: sit until the
   bell at 12:55 with everyone, and see them on the earth.* *By yourself:
   your own timer, and nobody shown.* Pressing a door answers and advances.
4. *How long will you sit?* — a slider over the stops (1, then 5 to 55 in
   fives) with a number field beside it that snaps to the nearest stop and
   says so (*17 became 15*). With others, a chip above the slider: *Until the
   bell at 12:55, with everyone*, chosen by default; a private length under
   with-others is allowed and survives the door.
5. *How should it end?* — singing bowl, gong, struck bell, each sounding when
   chosen.
6. *Any sound?* — a switch, *In silence* by default. On, the five beds appear
   as chips, and *Adjust levels* opens the faders and a master.
7. *When you are ready.* — a drawn singing bowl over *Strike the bowl to
   begin.* and the line of what the sitting will be (*Until 12:55 · singing
   bowl · rain*) with *Change* beside it. On a Mac, a *Full screen* switch,
   remembered.

**The bowl is the only thing that starts a sitting.** Striking it wobbles
the rim and sends three rings out; the bell you chose sounds; the light goes
down from paper to dusk over 1.4 seconds while the bowl screen drops away and
the sitting rises into place — the camera lifting to your seated view. Until
this rebuild a signed-in visitor's sitting started on arrival; nothing starts
now without the strike, because a sitting should begin with a gesture.

**The sitting.** Dusk. *With others:* the earth, full width, with a candle for
every place somebody lit one this hour; the ones still here are bright, the
ones who left are dim; your own is a little larger with a soft ring. Under it,
one line: *Ana from Lisbon is meditating with you*, *Ana from Lisbon and 3
others are meditating with you*, *4 others are meditating with you*, *You are
the first here this hour*, or nothing when the count could not be read — never
a guess. Names are only the ones people chose to share, at most three per
place and sixty in all, and when there are several they take turns every
twenty seconds. The clock is small in the top right. At the foot, *Sound*
(opens the mixer as a sheet) and *End*. *By yourself:* the same dusk, no
earth, no line, the bowl faintly centred, the same clock and the same two
controls.

**Until the bell.** Everyone who chooses *with others* hears the same bell at
the same second, at :55. Arriving with under five minutes to go rolls forward
to the next hour's bell. Nobody is refused. The bell you chose sounds at the
start as well as the end, the opening strike with a shorter tail.

**Afterwards.** Ten seconds of *Come back.* with the bowl still ringing and
the mix receding; then the minutes sat at display size; then the rows that
say something — days in a row, *With you this hour · 3 others* for a
with-others sitting, altogether — and *Sit again* with *Done* (signed in,
back to Home) or *Finish* (a guest, back to the welcome). A guest's ending
carries the account offer at the foot. Full screen is left on the way out,
and the ground lifts back to paper.

**Home, signed in.** *Meditate with me* small, the three-line menu, *Hello,
Ana.*, the two doors, and under them *Your usual: until 12:55 · singing bowl ·
rain* with the switch *Skip the questions and use these*. A door goes to the
questions the account has not answered — origin, once — then time, bell,
sound, the bowl; with the switch on, straight to the bowl. The switch turns
itself off when anything changes, on this device or another, so it never
skips a question whose answer moved. When two or more are sitting the count
is said above the doors. The menu: *Account* (email, the name, where you are
from and the switch that shows it, *Delete account* with its confirmation),
*Settings* (the three questions, ending at Home rather than the bowl), *Your
practice* (the streak, the totals, the recent sittings), *Sign out*.

**The practice log.** Every sitting is recorded locally; a streak is computed
in local time and not sitting today does not break it. With an account it
syncs across devices. Not in the proposal — see §4.

**This hour, on the earth.** `/world`: the same earth as the sitting, in a
dusk panel on the paper, with the count under it and — said on the page rather
than only in a privacy notice — that each light is placed to within about a
hundred kilometres and nobody is asked for their location. The projection is
Equal Earth; the night side is real. On localhost the map is correctly empty:
the edge headers it places people from do not exist in `next dev`.

**Accounts.** Optional. The menu opens `Create account` and `Sign in`; both
open the same panel under the trigger, asking one thing at a time — your
name, then your email, then the six-digit code, with `Confirm and enter`.
Nothing is asked for that is not used: the name is *Hello, Ana* and, if you
chose to be seen, the name on the earth. Signing in once is enough; the
session renews itself. `Sign out` ends it on that device only.

**Closing an account.** *Delete account*, in the account panel, opens a
confirmation naming what goes — the email address, the name, where you are
from, the settings and the sittings, counted — and saying the practice log on
this device stays. `Keep it` carries the chosen treatment and the destructive
control does not. Deletion is immediate and total.

**A link that does not work says so.** A spent magic link bounces to the
welcome signed out, with the reason in the URL fragment; the panel opens
itself on the address step carrying the reason, and the fragment is cleaned
off.

**Light until the strike, then dusk. The questions and the sitting never
scroll.** One palette regardless of system setting. Supabase down still
leaves a bowl, a timer and a mix — nothing shows an error screen. Reduced
motion is honoured: the rail jumps, the strike is one pulse, the lift is a
crossfade, the earth holds still.

**Before a visitor arrives.** A shared link unfurls into a card — the flame
mark, *Meditate with me* in the rounded face on the warm paper, and *A candle
is lit at the top of every hour. Everyone is looking at the same one.* The
tab and the iPhone home screen carry the same flame on dusk. The mark is
drawn (`components/FlameMark.tsx`) and provisional: if Jonny licenses his own
imagery (§5), it is one file to replace.

## 3. Decisions that shaped it, in order

| When | Decision | Where argued |
|---|---|---|
| `8821de1` | Nothing is gated; the candle burns down across the hour; no interlude | `ARCHITECTURE.md` §16 |
| `e657ec1` | Timer is 1, then 5–60 in fives — the superset of what the proposal promised (1–45) | `lib/timer.ts` |
| `75fb359` | Practice log added, off-scope, by Tenzing's decision | `TIMELOG.md` |
| `9bb2506`→`b60b335` | Presence: began-with cohort, first-here, *until the bell*, flame field | `docs/presence-spec.md` |
| `5b6b239` | The room is a photograph; landing is one word; three questions; the ring; the return | `ARCHITECTURE.md` §16, `docs/photographic-room.md` |
| `5b6b239` | Always dark | `ARCHITECTURE.md` §1 |
| `626ef93` | Launched | §1 above |
| `8d59fba` | Flame field deleted; the ring's dots are the room | `ARCHITECTURE.md` §16 |
| `ui-warm`, 14 Sept 2026 | The photographic room, the landing word, the settings panel and the ring replaced by the warm rail: one question per screen, a bowl to strike, the earth with names | `docs/ui-rebuild.md`, `DESIGN.md` |
| same | Every sitting starts from the bowl; the signed-in auto-start is gone | `ARCHITECTURE.md` §16 |
| same | A name and an origin, opt-in, shown on the earth for the length of a with-others sitting | `ARCHITECTURE.md` §16, `plans/privacy-data-inventory.md` |

## 4. Commercial — what Jonny holds, and what he has not been told

**What Jonny has.** `docs/v1-proposal-for-jonny.md` (scope), and the terms in
`docs/payment-message-to-jonny.md`: £25/hr, estimated 45–55h, **capped at
55**, £300 to start, balance within a couple of weeks of go-live; anything
outside the proposal is described and priced *before* it is built. He has paid
the £300 deposit and, separately, $500 — see `TIMELOG.md` › *Money*.

**What he has not been told, and must be before an invoice:**

1. **The practice log** (~4h) is in v1 and counted against the cap.
2. **The presence work** exists. The change order in
   `plans/presence-change-order.md` was never sent; Tenzing chose to show the
   work first. **Decided 13 September 2026: it is quoted as a £300 one-off**,
   raised at the meeting that day (`plans/meeting-with-jonny.md` §4). Until
   Jonny answers, presence hours sit inside the 55-hour cap.

Both go in one status update, with a preview link, before any number is asked
for. The rules for how are in `plans/presence-change-order.md` and the project
memory on client money: description and price together, one number, no
apology, a real way out, never discount before being asked.

**Timer note.** The proposal says 1–45 minutes. The build is 1–60. Say so in
the same update; it is a gift, not a deviation, but it should not be discovered.

## 5. Still undecided

**The product model.** Three concepts coexist and the interface defaults to
the weakest: (1) everyone gathers at the top of the hour — the proposal; (2)
nobody is told to come back later — `8821de1`, and right; (3) everyone sets an
independent timer — what the first question does. The ring and *until the
bell* pull toward (1) without reopening (2); whether that is enough, or whether
joining the shared hour should become the *primary* path, is
`plans/room-polish.md` §4 and it is a Jonny conversation. The cheap evidence to
bring to it is the five-question comprehension test in that section, run on
the current build.

**Jonny's direction, 13 September 2026 (meeting):** split them into two
options. (a) The timer and people on the map — sit any length; session time,
and a name and location if the person chooses, are shown to others on the
map; otherwise only presence, *You are meditating with X people live*. (b) The
live video — join at :55, wait for the hour, told someone is about to join. So
(3) becomes an option in its own right and (1) becomes the live video. A
direction, not a spec: nothing is scoped or priced, and the open questions
are in `plans/meeting-with-jonny.md` §5.

**Measurement.** v1 exists to learn whether people gather and whether they
return, and nothing records either — `heartbeats` is discarded on purpose.
Retaining anything is an architecture change and cannot be designed
privacy-safely before Jonny names the data controller. `room-polish.md` §4D.

**The candle itself.** The photograph the project made as its candle is
deleted with the room it was in (14 September 2026). The proposal promised a
candle plus two other visuals *chosen by Jonny*, licensed in his name; what
that means now is an open question about the sitting — whether anything
besides the earth, or the faint bowl under by-yourself, sits behind a person
while they meditate — and it has not been asked. Tenzing's earlier view, that
the candle is the main thing on the screen and wants a better still, was
overtaken by the rebuild: the main thing on the screen is the earth, and the
candles are on it.

**The sounds.** All five beds and three bells are synthesised in
`components/audio.ts` / `lib/noise.ts`. They are the stand-in for licensed
recordings Jonny buys; the interface they drop into is already there. This is
the one item the blockers email calls time-sensitive.

The bells have since been rebuilt as three separate instruments — their own
modes, a mallet, beating twins, and bloom on the gong (`ARCHITECTURE.md` §7).
That was worth doing because `strike()` is thrown away wholesale when
recordings arrive, so none of it is debt; it does **not** reduce the case for
buying the real thing.

Two of those three were wrong and were rewritten again on 8 September 2026,
after Tenzing said the gong and the struck bell sounded weird. They did. The
gong's ten partials were a ladder of minor thirds — a diminished seventh chord,
arpeggiated upward by the bloom — and the struck bell had the five tuned
partials at near-equal weight with nothing above them, so it settled into a
sustained minor triad. Both are defects rather than matters of taste and both
were found by rendering the tables offline and measuring the intervals, the way
the beds were (`ARCHITECTURE.md` §7). The gong now runs fourteen deliberately
irregular partials and the bell seven short inharmonic ones above the nominal.
The three published pitches did not move.

**The chord versions are what is live.** `397171a` is an ancestor of `main` and
went out with the launch, so anyone who has chosen the gong or the struck bell
since 1 September has been ending their sittings on one. The fix is on `dev`
and needs a release. Jonny has not been told about either version — no client
document mentions the bells beyond the line in the proposal offering three of
them — and these are still the placeholders his recordings replace. **The beds are still four filtered-noise variants plus a
drone** — rain, wind, waterfall and night are one generator with different
filters, and everything is mono and dry. That is the next thing to fix if the
recordings stay blocked.

One fault in them has been fixed, on 7 September 2026, and it was a defect
rather than a matter of taste. Rendered offline and measured K-weighted
(ITU-R BS.1770), the five sat 12.5 dB apart — rain at −7.84 LUFS against
waterfall at −20.33 — so a fader at half meant about four times as much sound
under rain as under waterfall. Rain also peaked at 1.34, above full scale:
at the top of its fader it was distorting, not getting louder. Each bed now
carries a fixed trim to −16 LUFS, the loudest common target at which nothing
clips. Re-measured after: 0.12 dB apart, worst peak 0.933.

**The faders are still linear**, which is the other half of what that
paragraph used to say and is deliberately not fixed here. Mapping the position
through a taper is a change to how everybody's stored mix sounds, and it is a
judgement no measurement settles — it needs somebody to listen. The
loudness-matching did not need ears and could be proved.

**The other two focus loops.** `focusSlug` is still a preference and still
`candle`; nothing renders it since the rebuild, and where Jonny's loops would
go is the same open question as the candle above.

**A house of lighters in Thailand.** Said by Jonny on 7 September 2026, for
"later on", around the app launch: several meditators living in one house and
leading the hours in rotation, switching off on the hour. That is his answer to
the staffing problem that deferred the live Candle Lighter — 8,760 sessions a
year is impossible for one volunteer and merely hard for a household — and it
is the reason the timer's ceiling moved to 55 the same day. **It is a stated
intention, not a plan**: nothing about it is scoped, costed, or in the v1 cap,
and the two things that deferred the Candle Lighter besides staffing are
untouched by it. Streaming still costs real money annually, and broadcasting
identifiable people to an anonymous audience is still a safeguarding question
that needs a solicitor before it needs a developer — more so, not less, if the
volunteers live at the address they broadcast from.

**Made concrete on 13 September 2026**, in a doc of his: six meditators in a
house in Chiang Mai, 24 hours a day for thirty days from 9 November 2026, each
sitting 55 minutes with five to hand over, live video with no audio, then
volunteer candlelighters. Still not scoped, costed or agreed. His words,
unreviewed, are in `context/JONNY-IDEAS.md`.

What was built for it is only the gap: the last five minutes of every hour are
now clear of the shared bell (`ARCHITECTURE.md` §6.3). That is the cheap half
of the preparation and it is worth having whether or not the house happens —
it costs one number and it is the kind of thing that is expensive to retrofit
once people have habits built on a bell at :00. Nothing else should be built
ahead of the decision: no rota, no lighter accounts, no handover UI.

**An iPhone app, possibly.** Raised 6 September 2026. Not decided, not
planned, not scoped, and **not mentioned to Jonny** — it would be a new
commercial arrangement, not a v1 remainder, and it does not fit inside the 55
hours. The web app remains the work.

One thing was done about it and it is the only thing worth doing yet:
`tests/portability.test.ts` fails the build if a browser-only global reaches
`lib/`. All ten files there are portable today — about 1,370 lines including
the whole shared-hour scheduler — and that is only cheap to keep while
something enforces it. `ARCHITECTURE.md` §12 has the reasoning. Nothing else
has been built and nothing else should be: no storage adapters, no audio
wrappers, no monorepo. The audio graph would be rewritten natively whichever
route is taken, so an abstraction over it is work thrown away twice.

The route, if it happens, is Expo — same TypeScript, `lib/` moves unchanged,
the UI and the audio engine are rebuilt. The risk sits entirely in one
question: whether a bell reliably rings on a locked phone forty-five minutes
later. That is a day's throwaway spike and it should be the first thing done,
before any plan is written, because a bad answer reshapes all of it.
