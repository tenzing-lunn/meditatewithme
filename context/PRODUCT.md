# The product, as it is today

Standing knowledge: what the site *is* at the current commit, what was decided
to get it here, and what is still undecided. `VISION.md` is the idea;
`ARCHITECTURE.md` is how it runs; this is the thing in between. **When a commit
changes what a visitor sees, fix this file in the same commit.**

Last verified 1 September 2026 at `8d59fba` (`dev`), which is also what
`main` serves.

---

## 1. Live status

**The room is live at meditatewithme.vercel.app.** `main` was merged from
`dev` at `626ef93` on 1 September 2026 (11:55 local), replacing the holding
page. Every push to `main` is now a release of the room, not of a placeholder.

Known open at the moment of launch, and still open:

- No privacy notice, terms, or age policy — waiting on Jonny's legal-entity
  and minimum-age decisions. The site sets a localStorage id, writes
  heartbeats, and now asks for a name and an email address, so this is not a
  cosmetic gap — and the name is a new category the inventory has to cover.
- Production SMTP is not configured: the account email will not arrive for an
  ordinary visitor. Everything works signed out.
- The account flow asks for a six-digit code, and the stock Supabase email
  template does not contain one — `{{ .Token }}` has to be added to it in the
  dashboard. Until then the panel's own note ("the link in that email works
  too") is the working path, and the link is still sent.
- The custom domain is unattached; Supabase Site URL points at the Vercel
  address.
- No favicon or Open Graph metadata; no real-device QA pass recorded.

Rollback candidate named in the launch commit: `defa583`.

## 2. What a visitor gets

**Landing.** A photograph of a candle in a dark room, and the words *Let’s
begin.* Nothing else — no title, no count, no hour, no links. The candle is the
one lit at the top of this UTC hour; its flame is smaller and dimmer the further
through the hour you arrive.

The room and the words come up out of the dark together, over 2.6 seconds, while
the camera settles out of its opening push. Nothing is shown and nothing is said
before that — the page no longer holds a *Finding the hour…* line, and the
photograph no longer appears on its own the moment it finishes loading.

It read *Begin.* until now, which is an instruction. *Let’s* makes it an
invitation from someone sitting down with you — the premise of the whole site,
and it was being spent nowhere else on the one screen a first-time visitor reads
before deciding.

**Begin → three questions, one per screen.** *How long* (1 minute, then 5 to
60 in fives, or *until the bell*), *which bell* (singing bowl, gong, struck
bell — each can be auditioned), *any ambiance* (five ambient beds, each with
its own fader and play button, over one master fader named *Volume* — it was
*All*, which read as a sixth bed rather than as the master). Answers are
remembered. A back arrow leaves
from the first screen and steps back from the others. *Start* is at the foot of
the last screen. The audio context is unlocked on *Begin*, not on *Start*.

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
rolls forward to the hour after. Nobody is refused.

**The ending, thirty seconds long.** Ten seconds of *Come back.* with the
bowl still ringing and the mix receding; then the minutes sat at display size
and a table of facts (streak and total, shown only when they say something;
how many you sat with, read once at the bell); then the controls — sit again,
your practice, hide/show the room — and, alone at the foot of the frame, the
account offer.

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

**Accounts.** Optional. `Create account` sits at the top right of the landing
and alone at the foot of the frame after a sitting; both open the same panel,
which drops from the control that opened it in 150ms and takes no other part of
the picture. It asks one thing at a time — your name, then your email, then the
six-digit code from that email, with `Confirm and enter` under it. `I already
have one` skips the name. Nothing is asked for that is not used: the name is
what Home's masthead greets you by.

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
made. The proposal promised a candle plus two other visuals *chosen by Jonny*,
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
buying the real thing. **The beds have not been touched and are still four
filtered-noise variants plus a drone** — rain, wind, waterfall and night are one
generator with different filters, everything is mono, dry, and on linear
faders. That is the next thing to fix if the recordings stay blocked.

**The other two focus loops.** Only `candle` exists. `Focus()` in `Room.tsx`
is where the others go when Jonny chooses them.

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
