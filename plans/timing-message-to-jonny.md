# Timing — message to Jonny

Unsent. Move to `docs/` once it's gone out.

Jonny's 55/5 decision (7 September 2026) is built — `ARCHITECTURE.md` §6.3.
This is the one thing left that he has to decide, and it is small.

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

**Not built ahead of the answer.** The `:50`–`:55` behaviour below is unchanged
in the code. It is one small edit either way and it waits for him.

---

Hi Jonny — the 55/5 is done and on the test site. Slider stops at 55, the shared bell rings at :55, so every hour has five clear minutes at the end.

Two small things, no rush.

If someone turns up in the last few minutes before :55, we currently offer them the *next* hour's bell instead — over an hour away. So they'd either sit for 63 minutes, which is the thing you've just capped, or more likely give up and sit on their own. I'd rather we quietly drop the shared option in that five-minute window than offer one that contradicts the cap. Fine either way, just say which.

And nothing happens in the five minutes themselves — no screen, no message, the candle just carries on. I think that's right. Say if you pictured something there.

Nothing else changes.

Tenzing

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
