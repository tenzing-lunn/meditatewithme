# Change order — Presence

**Decided 13 September 2026: quoted as a one-off, £300**, on top of the hourly —
Tenzing's call. Raised at the meeting that day, in the words in
`plans/meeting-with-jonny.md` §4, which describe what was actually built rather
than the flame field the message below proposes, and which drop "about twelve
hours": that was the spec's estimate, and no hours are confirmed. Move this file
to `docs/` once Jonny has heard it and answered.

**Status, 1 September 2026: never sent.** Tenzing told Jonny he would show the
work first rather than quote it up front. The scope in
[`../docs/presence-spec.md`](../docs/presence-spec.md) was then built on `dev`
on Tenzing's own decision: B, C and D are live; A (the flame field) was built,
judged wrong on screen, and deleted in `8d59fba` in favour of the dots on the
sitting ring. **None of it has been quoted to, approved by, or invoiced to
Jonny.** Until he has said yes to a number, the presence hours sit inside the
55-hour cap like everything else, and nothing here reaches an invoice as a
one-off. See `TIMELOG.md` › *Money* and `context/PRODUCT.md` › *Commercial*.

This lives in `plans/` because it is still a decision, not a record. The message
below was written to be sent *before* building. It now has to be re-tensed —
"I've built…", with the work visible on the preview link — or replaced by a
paragraph in an ordinary status update. Either way the same rules apply:
description and price in the same message, one number, no apology, a real way
out. The way out is now "leave it in, no charge" rather than "v1 ships
without it", which is a weaker position than the one this was drafted from —
that is the cost of building before asking, and worth knowing before choosing
it again.

What it asks for is specified in `../docs/presence-spec.md`. Read that first;
this is only the version of it Jonny sees.

## Record before the decision

1. [ ] **Reconstruct the hours.** ~~Working estimate: about 43 of the agreed
   55 hours.~~ Superseded: that figure was a reconstruction from the build
   plan, not measured time, and `TIMELOG.md` now exists with every `Engaged`
   cell still unfilled. Do not say "roughly 43" or any other number until the
   log is confirmed by Tenzing. "Where are we against the 55?" is the first
   thing Jonny will ask when this message lands.
2. [x] **Build B and D first** — "you began with 14 others" and the first-here
   empty room. Three hours, unbilled, deliberately. They make this message
   obvious instead of theoretical. Implemented as the bounded proof: a
   server-stamped start cohort and a first-arrival cue. A and C were then
   built as well, without the message going out — see the status at the top.
3. [x] **Prepare it with a link that actually opens.** A Vercel Shareable Link for
   the `dev` preview has been created and externally verified. Keep its signed
   query parameter out of git; retrieve it from Vercel when sending rather than
   putting it in this document.

## How this one is written, and why

- **The number and the description are in the same message.** That breaks the
  usual rule of keeping money out of scope documents, and it should. If he says
  yes to the idea and *then* gets a price, he'll feel sold to.
- **No apology anywhere.** No "sorry to bring this up", no "I hope that's ok",
  no "I know it's extra". Each one says you think you've done something wrong.
- **One number, then stop.** No options, no pre-discount, no negotiating
  against yourself before he's answered.
- **He is given a real way out**, in writing, and it's true — v1 ships without
  this. That sentence is what makes it read as confident rather than braced for
  an argument.
- **"Paid", never "compensated".** Compensation is for harm.
- **"It would be £300", never "I would need £300".** The first is a fact about
  the work. The second is a fact about you, and invites him to weigh whether
  your needs are reasonable.

If he says he can't afford it, let *him* say so — then offer to split the
payment or trim to two of the four. Never discount before you're asked.

---

**Subject:** One thing I found while building

Hi Jonny,

Something's come up that I want to put in front of you.

The site works — you arrive, the candle's burning, you choose how long, you sit, a bell ends it. On screen it tells you how many other people are there. A number.

Building it, I've come to think the number is the weakest thing on the page. It tells you other people exist. It doesn't make you feel you're sitting with them, which is the entire reason the site exists.

What I'd rather do is give every person a flame. You arrive and yours appears among the others. When you leave, it goes out. If you're the first one there at four in the morning you light the candle yourself — and it stays burning for the rest of the hour after you've gone, so whoever comes next finds it. And one extra option on the timer: sit *until the bell* instead of for a set time, so everyone who chooses it finishes together, on the same sound, at the same second.

That's the difference between a website with a counter on it and the thing you described to me.

It's about twelve hours of work and it isn't in what we agreed, so it would be £300 on top — a one-off, separate from the hourly. If you'd rather leave it, version one ships exactly as planned.

Tenzing

---

## If £400 instead

Swap one sentence; nothing else changes. £300 is twelve hours at the agreed
rate and defensible in a breath. £400 prices the deliverable rather than the
time, is still below market for the work, and is a rate rise in effect — worth
choosing deliberately rather than drifting into.

## Alternative closings, firmer

Keeps an out (**recommended**, as written above):

> It's about twelve hours of work and it isn't in what we agreed, so it would be £300 on top — a one-off, separate from the hourly. If you'd rather leave it, version one ships exactly as planned.

No out, assumes yes:

> This sits outside what we agreed, so it would be charged separately: £300 as a one-off, on top of the hourly. Say the word and I'll start on it.

Firmest:

> It falls outside the work we agreed, so it would need to be paid for separately — £300 as a one-off, on top of the hourly rate.

## The forty-word version

If the full message feels like too much of a production, this is the whole
conversation at the bottom of an ordinary status update:

> There's more of this I'd like to do — a flame for every person who's there, and an option to sit until the bell so people finish together. It's about twelve hours and it isn't in what we agreed, so it'd be £300 on top. No pressure either way, v1 ships fine without it.

Short is fine. Unspecific is not — that's the distinction. A price he has to
guess at is a price he'll guess low, and the gap turns into a conversation
about trust rather than money.
