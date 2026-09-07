# Timing — message to Jonny

Unsent. Move to `docs/` once it's gone out.

Jonny's 55-minute cap (7 September 2026) is built — `ARCHITECTURE.md` §6.3 —
and **live since the release merge `cc712c6` later that day**, on Tenzing's
word, before this message went out. This is the one thing left that he has to
decide, and it is small.

Say "the 55 minutes", not "55/5". The second was shorthand invented while
building it; it appears nowhere Jonny has ever seen, and it reads as a version
number or a ratio rather than as the thing he asked for.

**Scope, deliberately.** An earlier draft of this built the whole thing around
the house of lighters and asked whether sitting together should become the
primary path. Both are out: v1 is what we are finishing, and that question
already has a home in `plans/room-polish.md` §4, where it is parked as its own
conversation. Duplicating it here would have started it by accident, in a text
message, while v1 is unshipped. The house stays recorded in `PRODUCT.md` §5 as
something Jonny said — that record is just true — but nothing is being designed
around it.

**Kept out for the same reason:** the hours and the invoice, which
`launch-readiness.md` owes him separately; the launch blockers, already chased
in `docs/blockers-email-to-jonny.md`; and the streaming-cost and safeguarding
points, which are real but belong to a video conversation that is not happening
in v1.

**Not built ahead of the answer.** The `:50`–`:55` behaviour is unchanged in
the code. It is one small edit either way and it waits for him.

**Five questions, each with an answer attached.** Every one carries what I'd do,
so the cheapest reply available to him is "all fine" and the expensive reply is
correcting one line. A list of five open questions would get one answered.

Q1 is the one that matters. Moving the shared bell to :55 is the only part of
this he did not ask for in words — he set a cap on the slider, and the bell
moved because otherwise the shared path still produced a whole-hour sit and the
five minutes existed nowhere anyone could see them. That reasoning is sound and
it is still an inference. Better he confirms it now than finds it later.

Q4 and Q5 are not live problems; they are numbers a visitor meets before
anything else and nobody has ever put to him. They cost one line each here and
a rebuild of his expectations if they surface after launch.

---

Hi Jonny — the 55 minutes is done and live on the site.

Five things about the timing I'd like settled so we're not coming back to it. I've put what I'd do next to each — if you're happy with the lot, just say so and I'll crack on.

1. **The shared bell now rings at :55, not on the hour.** So the people who choose to finish together finish at :55, and the last five minutes of every hour are clear. That's how I read what you asked for — worth confirming, because it's the one thing here I decided rather than you.

2. **Arriving just before it.** Turn up in those last five minutes and we currently offer you the *next* hour's bell — a 63-minute sitting, over the cap you've just set. I'd stop offering the shared option in that window and just let them sit on their own timer.

3. **The five clear minutes.** Nothing happens in them — no screen, no message, the candle carries on and you can still start sitting. I'd leave it that way.

4. **The default length.** Someone who touches nothing gets 10 minutes. I'd keep 10.

5. **The shortest sitting.** The slider starts at 1 minute, then 5, 10, 15 and up. I'd keep the 1 — it's what people pick when they're not sure they want to sit at all.

---

## The detail behind question one, if he asks

`nextSharedBellAt` won't offer a shared bell less than five minutes away, so
nobody is handed a two-minute sitting they didn't ask for. That guard is right
and predates this change. The side effect is that an arrival between :50 and
:55 rolls to the following hour's bell — a wait of 60 to 65 minutes.

It is not new (before the bell moved, arriving at :56 gave 64 minutes) and it
is not strictly a hole in the cap: *until the bell* is a promise about
finishing with other people, not a duration. What changed is that Jonny has now
set a number, so offering 63 minutes reads as the site ignoring him.

The two options, both small:

- **Leave it.** No work. The option is offered, almost nobody takes it, they
  sit alone instead.
- **Hide the shared option between :50 and :55.** They get the normal timer and
  no dead choice. Costs them nothing they would have used.

Either is an edit to one function and its tests.
