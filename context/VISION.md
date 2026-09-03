# The idea, and where v1 sits in it

Standing knowledge. Read this before deciding what v1 is *for*, and before
telling Jonny anything is "later".

**Source.** Jonny Knowles' brief — about 23 pages — is not in this repository.
Everything below is reconstructed from what `docs/v1-proposal-for-jonny.md`
and `docs/presence-spec.md` say about it. Where the brief itself would say more,
it is marked *(brief not on file)*. Do not present anything here to Jonny as a
quotation of his own document.

---

## 1. The idea in one sentence

*Somewhere in the world, right now, someone is sitting with you.*

That is the proposal's reading of the brief and it is the test every feature
is held to. Not "a meditation timer with a counter", not "a meditation site
with a community" — the specific feeling that you are not meditating alone,
delivered to somebody who arrived at 4am with no account and no instructions.

## 2. What the brief asks for

As summarised in the proposal, in the brief's own words where they are known:

| Feature | What it is | Where it stands |
|---|---|---|
| **The session** | One shared meditation at the top of every hour, worldwide, on one clock | **v1**, built |
| **The candle** | Something to rest the eyes on; the shared object | **v1**, built — a photograph, see `PRODUCT.md` |
| **Sounds** | Layered ambient beds, each with its own volume; a choice of closing bells | **v1**, built on synthesised stand-ins pending Jonny's licensed recordings |
| **The personal timer** | Each person chooses how long they sit | **v1**, built (1–60 min, or *until the bell*) |
| **Others present** | Knowing how many are sitting alongside you | **v1**, built — as dots on the ring, not a number |
| **Accounts** | Optional; preferences remembered across devices | **v1**, built; sign-in email not yet deliverable in production |
| **The live Candle Lighter** | A volunteer on camera lighting and tending the candle, every hour of every day | Deferred — cost (streaming, potentially thousands a year), safeguarding (broadcasting volunteers to an anonymous audience), and staffing 8,760 sessions a year. Needs a solicitor before it needs a developer. |
| **Dharma Circles / the Waiting Room** | People gathering before and around a session; a small social layer | Deferred — a social network with moderation questions, its own phase |
| **Distant Blessings Now** | A photograph or video of someone unwell, for others to hold in mind | Deferred — private medical data about a person who may not be able to consent; solicitor first |
| **Donations** | Support the site | Deferred until a registered organisation exists to receive them; then about a day's work |
| **Other languages, calendar reminders, social sharing, a mobile app, streaks** | | Deferred; easier once real usage is visible. (Streaks quietly arrived with the practice log — see `PRODUCT.md`.) |
| **Mandalas, yantras, Buddha figures with a sentence each** | Imagery with context, not decoration | Waiting on Jonny's images and words |

*(brief not on file)* — the brief's own ordering, its language, and whatever it
says about who the site is for and what "Candle Lighter", "session" and
"circle" mean to Jonny are not recoverable from the proposal. The proposal
explicitly asks him to correct the wording; whether he did is not recorded.

## 3. Why v1 is shaped the way it is

Three arguments the proposal makes, which still bind:

**Learn before spending.** The live feed is the expensive, legally exposed part
of the brief. v1 exists to find out whether people show up and come back
*without* it. If they do, that is the evidence for funding it; if they don't, a
camera would not have saved it.

**Togetherness is nearly free; identity is expensive.** `presence-spec.md`
lays out the ladder — co-presence, simultaneity, shared duration, mutual
awareness, then identity, address, consequence. The brief buys the top rungs
with video at roughly £10,000 a year. The bottom four cost nothing to run and
are what v1 is built around: you can see who lit a candle this hour, you know
who began with you, and *until the bell* makes strangers finish on the same
second. Whether that lands is the open product question in `PRODUCT.md`.

**Zero to run.** Free tiers, Jonny's own domain, one-off purchases for sound
and imagery bought in his name. Nothing here should ever be a monthly bill to
a non-profit that does not exist yet.

## 4. What v1 must not become

- A private timer other people happen to be near. That is the failure mode
  named in `plans/room-polish.md` §1, and the ring is the current answer to it.
- A dashboard. The moment the room shows a number to be compared, it stops
  being a room. Counts are approximate by nature (`ARCHITECTURE.md` §2) and
  are shown as composition, not figures.
- A site that turns people away. Nobody is refused; nothing is gated
  (`ARCHITECTURE.md` §16). This was decided once, in `8821de1`, and it holds.
- Something that plays sound at you. The only sound you did not ask for is the
  bell you chose.

## 5. What is still Jonny's to decide

These are his, not ours, and they are already chased
(`docs/blockers-email-to-jonny.md`): the domain and its renewal; the licensed
sounds and three visuals; who is legally behind the site; minimum age
(recommended eighteen); the mandala imagery and its sentences; and a written
yes on the scope. Everything in step 08 that is not code is waiting on one of
those.
