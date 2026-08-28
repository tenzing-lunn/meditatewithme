# Presence — making "with someone" felt

Addition to v1. Not agreed with the client yet; `presence-change-order.md` is
the message that asks. Nothing here starts until that comes back yes.

---

## Why this exists

v1 as built does not deliver the thing the site is for.

Everyone sets their own timer, one to sixty minutes, starting whenever they
arrive. Two people "in the same session" might be sitting for five minutes and
forty-five, twenty minutes apart. They are not meditating together. They are
meditating *near* each other, on the same website, in the same wall-clock hour.

`8821de1` did this — "the candle burns down; nothing is gated" — and it was the
right call for the problem it solved. A meditation site that turns away a
quarter of its arrivals is absurd. But it bought hospitality with togetherness,
and nothing was put back in its place. What is on screen today amounts to
*someone else is also on this webpage*.

## The ladder

"Meditate with someone" is not one thing. It is about seven, and they get
stronger going down:

| | | v1 today |
|---|---|---|
| 1 | **Co-presence** — I know someone is there | a number |
| 2 | **Simultaneity** — we started together | same hour, nothing more |
| 3 | **Shared duration** — we will finish together | no |
| 4 | **Mutual awareness** — they know *I* am here | no |
| 5 | Identity — I know something about who they are | v2 |
| 6 | Address — we can acknowledge each other | v2 |
| 7 | Consequence — my being here changed their experience | no |

The client's 23-page brief tries to buy 5 and 6 with live video, which is why
they cost roughly £10,000 a year. **1 to 4 are nearly free and none of them are
built.** That is the whole opportunity, and it is a better answer than a camera.

---

## What gets built

### A · The field — rungs 1 and 4 · ~5h

One flame per person present, replacing the number entirely. Yours appears when
you arrive and goes out when you leave, so your presence visibly changes what
everyone else is looking at. That is rung 4 with no identity attached to it,
which is the only reason it is affordable.

- **Cap the rendered flames at around sixty.** Three hundred is a texture, not
  a room; past the cap the remainder becomes a glow and a count. A field that
  tries to be accurate stops being a room and becomes a chart.
- **Two flames on a wide page is honest and slightly sad.** Leave it. D covers
  the bottom end, and flattering somebody about how many people are present is
  the one lie this product cannot afford.
- **Your own flame has to be findable** — brighter, or ringed. Otherwise you
  are watching a crowd rather than standing in one.
- **A flame stays lit for the rest of the hour after its person leaves.** This
  is the piece that makes the whole feature mean something: you did not sit
  *with* the person who arrives at :25, but you left something they can see.
  It needs a second window over the same `heartbeats` rows — *here now* (90s,
  which already exists) and *lit this hour* (since `hourStart`).

**This does not fight §5.** The count is edge-cached because it is identical for
every viewer worldwide; the field is identical for every viewer too, so it
caches on the same entry, for the same ten seconds, at the same cost. Only
"which one is mine" is per-viewer, and that is answered client-side from the
anon id already in localStorage. Expensive in design time, free to run.

### B · "You began with 14 others" — rung 2 · ~2h

One line at the moment Begin is pressed, counting everyone who began within the
same short window. Simultaneity delivered as a sentence.

- `/api/heartbeat` currently records presence only. This needs to distinguish
  *here* from *began*, which is one nullable column and one narrow query.
- **It is a sentence at one moment, not a live number.** If it updates while
  somebody sits, it becomes something to watch. It says its piece and stops.

### C · Until the bell — rung 3 · ~4h

The strongest rung, and the one with the most ways to go wrong.

**It is not a mode.** It is one more stop on the end of the duration slider,
past the hour: `1 · 5 · 10 … 60 · until the bell`. Nobody has to understand a
concept — they drag one notch further than an hour, on a control they were
already dragging. The alternative is a second option on a page whose entire
virtue is that there is nothing to decide.

The presets row can carry it too: `1m · 10m · 30m · until the bell`, replacing
the `1h` chip.

- **Everyone who chooses it hears the same bell at the same second.** That is
  the payoff and there is nothing else in v1 that does it.
- **Arriving at :57 must not be refused.** The shared bell is three minutes
  away; offer the *next* one, or fall back to a duration. Copy problem, never a
  lockout — that is the mistake `8821de1` already fixed once.
- **The clock seam is the real cost, not the UI.** §6 keeps three clocks apart
  deliberately: `serverNow()` for which session is running, `performance.now()`
  for the personal timer, `AudioContext.currentTime` for when the bell fires.
  This feature is the first thing that needs an *absolute* target turned into a
  *monotonic* one. Convert once, at the moment of Begin, and keep the
  conversion in a single named function — if absolute time leaks into
  `lib/timer.ts` the monotonic guarantee is gone and the bug will look like a
  bell that drifts on a laptop that slept.
- **The stops array stops being all numbers**, which reaches further than it
  looks. `0005_timer_stops.sql` has just pinned `timer_minutes` to an `in` list
  for the second time. Do not make it chase a third time by encoding "bell" as
  a magic number — add a separate nullable flag on `preferences` and leave the
  minutes column meaning minutes.

### D · The empty room — rung 1 · ~1h

At 4am someone will arrive alone. Today that is a page about not being alone,
showing a 1.

- Dark. The room is unlit because nobody has lit it yet.
- **You light your own candle**, with the slowest animation on the site.
- *You are the first here this hour.* Not the person nobody joined — the one
  who lit it for whoever comes next. The client's own metaphor, finally doing
  some work.
- Your flame then persists for the rest of the hour, per A. The framing is only
  true if the thing it promises actually happens.

---

## Rules across all four

- **No sound.** The end bell stays the only thing this site plays that you did
  not ask for. An arrival that chimes is an interruption dressed as company.
- **Nothing moves quickly**, and everything respects `prefers-reduced-motion`.
- **"Hide the count" becomes "hide the room"** — the same switch, with more
  behind it. Anyone who finds other people distracting keeps the door.
- **Nobody is ever refused.** Unchanged, and C is the first thing that tempts
  us to break it.

## What it costs

Twelve hours. Quoted to the client as a one-off — see
`presence-change-order.md` — rather than as hours against the cap, because a
fixed price for a named thing is easier for a non-profit to budget than an open
count, and because it sets the pattern for every one of the remaining twenty
pages of the brief.

The cap is the real constraint: 55 hours agreed, step 05 only just landed, step
08 untouched, and a practice log already added off-scope. Twelve more does not
fit. Either the cap moves or something goes, and the client should be the one
choosing which.

## Sequence

**B and D first — three hours — before the message goes out.** They are the two
cheapest, and between them they make the whole idea obvious rather than
theoretical. A client who cannot picture a thing cannot fund it, and three hours
of unbilled work is a much better price than a paragraph of persuasion.

Then A, then C, if the answer is yes. **Both are now complete on `dev` after
approval to proceed:** A is the capped flame field and C is the persisted
“until the bell” option with a five-minute late-arrival roll-forward.

## Where this goes wrong

- **The field becomes a dashboard.** The moment somebody can count the flames
  to see how they are doing, it has become a metric. Cap it, blur the tail, and
  never label it with a precise number next to the flames themselves.
- **Arrivals become distraction.** A flame appearing during a sit is the point;
  a flame appearing *brightly* is an interruption. Slow, peripheral, and behind
  the same toggle as everything else.
- **C corrupts the timer.** Covered above and worth repeating: the absolute
  clock converts to monotonic once, in one place, and never leaks.
- **We build all four and the client says no.** Which is what B and D first,
  and asking before A and C, is for.
