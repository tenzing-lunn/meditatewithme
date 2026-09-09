# The product, as it is today

Standing knowledge: what the site *is* at the current commit, what was decided
to get it here, and what is still undecided. `VISION.md` is the idea;
`ARCHITECTURE.md` is how it runs; this is the thing in between. **When a commit
changes what a visitor sees, fix this file in the same commit.**

Last verified 7 September 2026 at `353aee0` (`dev`), which is what `main`
serves as of the release merge `cc712c6` the same day.

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
- The email now carries the six-digit code. With the default sender gone the
  template could be edited, and it was, the same evening, through the
  Management API: subject *Your code for Meditate With Me*, the code in large
  type, the link underneath as the alternative. Proved end to end: a real
  request from the live site produced an email with `754334` rendered where
  `{{ .Token }}` was, in Tenzing's inbox. The auth server's code length had
  been moved from eight digits to six earlier that day.
- The custom domain is unattached; Supabase Site URL points at the Vercel
  address. **This is now the one thing between visitors and a working
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

**Landing.** A photograph of a candle in a dark room, the words *Let’s begin.*,
one sentence saying what the place is, and one link to the world map. No title
and no settings. The candle is the one lit at the top of this UTC hour; its
flame is smaller and dimmer the further through the hour you arrive.

The sentence is live when it can be and standing when it cannot: *A candle was
lit at 12:00. 11 people are looking at the same one.* whenever two or more have
lit this hour, and otherwise the Open Graph card's own words, *A candle is lit
at the top of every hour. Everyone is looking at the same one.* One candle lit
is you, so it is never reported as company — the same rule the ring, the
ending, Home and `/world` all keep. With *Hide the room* set, the standing
sentence is the only one shown.

Added 7 September 2026, from the design audit in `docs/design-audit.md`. Until
then the screen carried the word alone, and the sentence explaining the site
existed only in `app/opengraph-image.tsx` and the meta description — served to
crawlers and withheld from visitors, so a link preview said more about the
product than the product did. The world map had exactly one link in the whole
codebase, on Home, which is signed in; a guest could reach the site's strongest
piece of evidence for its own claim only by typing the address.

The room and the words come up out of the dark together, over 2.6 seconds, while
the camera settles out of its opening push. Nothing is shown and nothing is said
before that — the page no longer holds a *Finding the hour…* line, and the
photograph no longer appears on its own the moment it finishes loading.

It read *Begin.* until now, which is an instruction. *Let’s* makes it an
invitation from someone sitting down with you — the premise of the whole site,
and it was being spent nowhere else on the one screen a first-time visitor reads
before deciding.

**Begin → three questions, one per screen.** *How long* (1 minute, then 5 to
55 in fives, or *until the bell*, which now rings at :55), *which bell* (singing bowl, gong, struck
bell — each can be auditioned), *any sound* — a switch, `No` by
default, and only when it is flipped to `Yes` do the five ambient beds appear,
as five named chips in a row: tap one and it plays at its stored level (or an
audition level if it has never been heard), tap again and it stops. The
faders — one per bed and a master named *Volume* (it was *All*, which read as
a sixth bed rather than as the master) — sit behind *Adjust levels* under the
chips, one tap away. Until the evening of 7 September 2026 the whole mixer
opened here, eleven controls on the last screen of a flow built on one thing
at a time. The five beds *were* the question until earlier that day, which
asked somebody who wanted to sit in silence to understand a mixer before they
could decline one.
Saying `No` silences the beds for real rather than hiding them, and saying
`Yes` again within the flow puts back what was there. Answers are
remembered. A back arrow leaves
from the first screen and steps back from the others. *Start* is at the foot of
the last screen. The audio context is unlocked on *Begin*, not on *Start* —
but it is unlocked **silent**, and nothing is audible until the background-noise
question is on screen. Until 7 September 2026 those were the same act, so a
returning visitor with a stored mix heard it start under the words *How long?*,
two screens before being asked whether they wanted any. That is the one thing
`VISION.md` says v1 must not become, and the fix is a master held at zero rather
than a change to anybody's stored levels: saying *No* still writes real zeros to
the beds, so raising the master on a declined mix plays nothing.

**The bell rings twice.** The one you chose sounds at *Start* as well as at the
end, so a sitting is bounded at both ends by the same sound rather than
beginning in silence. The opening strike has a shorter tail — around 60% of the
closing one — because it marks the threshold and then gets out of the way, and
it is clamped so it can never still be ringing when the closing bell lands.
Stopping early silences it.

**The sitting.** A ring. The arc drains clockwise; the dots just outside it
are the candles lit this hour, one each, spread evenly, yours at twelve with a
halo. Dots for people still here are full strength; people who lit a candle
and left are dimmed. Underneath, one sentence at the start: *You began with N
others* or *You are the first here this hour*. At the foot of the frame:
*Sound* (opens the mixer mid-sitting) and *End this sitting*. *Hide the room*
turns the dots off for anyone who finds them distracting.

**Until the bell.** Everyone who chooses it hears the same bell at the same
second, at the top of the next hour. Arriving with under five minutes to go
rolls forward to the hour after. Nobody is refused. Over the last minute
before that bell — and only for sittings that end on it — the ring's dots
brighten to full and draw in toward twelve from both sides, so that at the
bell the room is a small bright cluster around your own light. It is the one
moment strangers do something at the same second, and until 7 September 2026
nothing on screen marked it. A sitting on its own timer gets none of this.

**The ending, thirty seconds long.** Ten seconds of *Come back.* with the
bowl still ringing and the mix receding; then the minutes sat at display size
and a table of facts (streak and total, shown only when they say something;
how many you sat with, read once at the bell); then the controls, and, alone
at the foot of the frame, the account offer. Signed in, the controls are *Sit
again* and *Done* and nothing else — the practice log and the room switch are
on Home. A guest has no Home, so their ending keeps *Your practice* and
*Hide the room* as well: it is the only place they can reach either. *Sit
again* starts another sitting on the same settings in one tap, guest or not;
a guest's *Finish* returns them to the landing, where *End this sitting*
already went. Until 9 September 2026 a guest's *Sit again* sent them back
through the landing and the three questions, and *Finish* only removed the two
buttons and left them on the ending with no way off it.

**The practice log.** Every sitting is recorded locally; a streak is computed
in local time and not sitting today does not break it. With an account it
syncs across devices. Not in the proposal — see §4.

**This hour, on the earth.** `/world`, reached from Home, is a flat map of the
planet with a light where a candle was lit this hour. It was a globe you turned
with your finger until 6 September 2026, when Jonny asked for a 2D map; the
projection is Equal Earth, so the whole world is visible at once without the
north being given more room per person than the south. The night side is the
real one, from the same corrected clock the candle uses. Under it, the count of
candles this hour, and — said on the page rather than only in a privacy notice —
that each light is placed to within about a hundred kilometres and nobody is
asked for their location. On localhost the map is correctly empty: the edge
headers it places people from do not exist in `next dev`.

**Accounts.** Optional. A three-line menu button sits at the top right of the
landing and opens two choices, `Create account` and `Sign in` — Jonny's ask on
7 September 2026, replacing a single `Create account` button that carried the
other case as a footnote. `Create account` alone still sits at the foot of the
frame after a sitting. All of them open the same panel, which drops from the
control that opened it in 150ms and takes no other part of the picture. It asks
one thing at a time — your name, then your email, then the six-digit code from
that email, with `Confirm and enter` under it. `Sign in`, and `I already have
one` inside the panel, skip the name. Nothing is asked for that is not used:
the name is what Home's masthead greets you by.

**Signing in once is enough.** The session is stored in the browser and renews
itself, with no expiry and no inactivity cutoff, so somebody who signs in is
remembered across tabs, restarts and days — confirmed against the live project,
where a session created on 3 September was still refreshing itself on the 7th.
`Sign out` now ends the session **on that device only**; until 7 September 2026
it quietly ended every session the account had, so signing out on a laptop
signed you out on your phone as well.

**Closing an account.** *Your account* is the last thing on Home, under the
practice log, showing the email the account is held under and a `Delete
account` control. Pressing it opens a confirmation naming what goes — the email
address, the name, the settings and the sittings, counted — and saying that the
practice log on this device stays, because it does. `Keep it` carries the ember
treatment and the destructive control does not: the emphasis belongs on the
safe answer. Deletion is immediate and total; `profiles`, `preferences` and
`sittings` all cascade from the auth row, and nothing is soft-deleted.

Deliberately nowhere near `Sign out` in the masthead. The two are close enough
in meaning that putting them close together in space invites the wrong one.

**A link that does not work says so.** Magic links are single-use and a new one
kills the last; clicking a spent one bounces you back to the landing signed out,
with the reason in the URL fragment and nothing on screen. The panel now opens
itself on the address step carrying *"That link had already been used, or a
newer email replaced it"*, and the fragment is cleaned off the URL.

It used to say `Sign in`, which described the API call rather than the act —
`signInWithOtp` has always created the account on first use — and asked a
first-time visitor for credentials they did not have. It also used to take over
the whole frame like a setup question, which is what made opening it feel like
the page lurching; `ARCHITECTURE.md` §16 has the mechanism.

**Always dark, never scrolls, always works.** One palette regardless of system
setting. One viewport; all type in the band above the flame. Supabase down
still leaves a candle, a timer and a mix — nothing shows an error screen.

**Before a visitor arrives.** A shared link now unfurls into a card — the
flame, the name in Instrument Serif, and *A candle is lit at the top of every
hour. Everyone is looking at the same one.* The tab and the iPhone home screen
carry the same flame. It is drawn (`components/FlameMark.tsx`), not the
photograph: `flame.png` is a composite that turns to a smudge below about
200px, and a favicon is 32.

The card deliberately shows a **full** flame rather than this hour's. Crawlers
fetch it once and cache it, so an image that burned down would freeze at
whatever height the first crawl caught and show a half-spent candle to everyone
thereafter — the opposite of an invitation. The mark is ours and provisional:
if Jonny licenses his own candle imagery (§5), it is one file to replace.

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

## 4. Commercial — what Jonny holds, and what he has not been told

**What Jonny has.** `docs/v1-proposal-for-jonny.md` (scope), and the terms in
`docs/payment-message-to-jonny.md`: £25/hr, estimated 45–55h, **capped at
55**, £300 to start, balance within a couple of weeks of go-live; anything
outside the proposal is described and priced *before* it is built. He has paid
the £300 deposit and, separately, $500 — see `TIMELOG.md` › *Money*.

**What he has not been told, and must be before an invoice:**

1. **The practice log** (~4h) is in v1 and counted against the cap.
2. **The presence work** exists. The change order in
   `plans/presence-change-order.md` — £300 as a one-off for ~12h — was never
   sent; Tenzing chose to show the work first. Until it is raised and Jonny
   answers, presence hours sit inside the 55-hour cap.

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

**Measurement.** v1 exists to learn whether people gather and whether they
return, and nothing records either — `heartbeats` is discarded on purpose.
Retaining anything is an architecture change and cannot be designed
privacy-safely before Jonny names the data controller. `room-polish.md` §4D.

**The candle itself.** `public/room-base.png` is a photograph the project
made, and is now the master the served `.avif` and `.jpg` are built from. The proposal promised a candle plus two other visuals *chosen by Jonny*,
licensed in his name. Whether this photograph ships as the candle, or is the
stand-in until his loop arrives, has not been asked. The burn — flame scale and
glow across the hour — is linear and `ARCHITECTURE.md` notes it may want a
curve.

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

**The other two focus loops.** Only `candle` exists. `Focus()` in `Room.tsx`
is where the others go when Jonny chooses them.

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
