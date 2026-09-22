# Meeting with Jonny — Sunday 13 September 2026

Prep for Tenzing, not for sending — parts of it are about how to say things.
After the meeting, write his answers in under each item, fold them into
`context/PRODUCT.md`, and `git mv` this to `docs/`.

Three things only he can answer — the domain, the timing, the legal pages —
then money, which has to be said before any invoice, then his own doc, which he
has put on today's agenda himself.

---

## 1. The domain

**Two things from him.**

1. **A yes to pointing `meditatewithme.com` at the new site.** Today it forwards
   to Susan Taylor's page (checked 13 September: `302 →
   susantaylor.org/meditate-with-me/`). Switching ends that. Susan may want a
   heads-up.
2. **A way into Cloudflare**, where the domain's settings live. Either the login,
   or he pastes a few lines in on a five-minute call.

**The IONOS login in his doc does not reach this domain.** Checked 13 September
by `whois` and `dig`: `meditatewithme.com` is registered at **GoDaddy** (expires
26 February 2027) and its DNS is served by **Cloudflare**
(`bruce`/`kim.ns.cloudflare.com`). IONOS may hold his other domains; none of the
records needed are there. So ask:

- Who set up the forward to Susan's page? They have the Cloudflare account.
- Does he have the GoDaddy login? If Cloudflare's owner can't be found, GoDaddy is
  where the nameservers can be moved from.
- Is auto-renew on at GoDaddy? Asked in the blockers email, never answered.
- Does anything at IONOS matter to this project — a `.co.uk`, a mailbox?

His IONOS password is written in plain text in that Google Doc. Worth suggesting
he changes it and takes it out of the doc.

**Found in his IONOS account, 13 September (Tenzing signed in):**
`meditatewithme.info`, `.online` and `.store`, all registered 10 August 2026
and renewing 10 August 2027, all *Domain not in use*. Also there:
`ifidiedtomorrow.com`, `ifyouabsolutelyhaveto.com`, `monkwithoutamonastery.…`
(the account lists 40+). `.online` has IONOS mail records (MX, SPF,
DMARC, DKIM); Resend's sit on `send.` and leave them alone. These need no one else's yes and no
Cloudflare login — so the question becomes which name he wants the site on,
and whether `.com` is still worth chasing.

**Why it matters, in his words-sized version:** sign-in emails currently arrive
only in Tenzing's own inbox, and in spam. Nobody else can make an account until
this is done.

**After his yes, nothing more is needed from him:** Vercel's A/CNAME and
Resend's DKIM/SPF/DMARC in Cloudflare (DNS only, grey cloud), verify in Resend,
switch the Supabase SMTP sender to `signin@meditatewithme.com`, update the
Supabase Site URL and redirect allow-list, and test sign-in from a second
device. Detail in `plans/launch-readiness.md`, the domain row.

**Answer:**

---

## 2. Timing — five questions, unanswered since 7 September

The 55 minutes is live. `plans/timing-message-to-jonny.md` was drafted and never
sent; take it into the room instead. Each question carries what we'd do, so "all
fine" settles the lot.

1. **The shared bell rings at :55, not on the hour.** His doc answers this in
   spirit — 55-minute shifts, five to switch over. Confirm rather than ask.
2. **Arriving between :50 and :55** currently offers the *next* hour's bell, a
   63-minute sitting over the cap he set. Suggest: hide the shared option in
   that window. One function and its tests.
3. **The five clear minutes.** Nothing happens in them. Suggest: leave it for
   v1. His house plan makes it the moment the candle changes hands, which is a
   conversation for §5, not a v1 change.
4. **The default length** is 10 minutes. Suggest: keep.
5. **The shortest sitting** is 1 minute. Suggest: keep.

Also say, so it isn't discovered: the proposal said the timer went to 45
minutes; it goes further now.

**Answer:**

---

## 3. The legal pages

Built and waiting on four answers. `/privacy` and `/terms` exist on the site,
unlinked and hidden from search, with gaps where these go:

1. **Who is responsible for the data** — him personally, or a company? The name
   exactly as it should appear. Asked in the blockers email; unanswered.
2. **A contact email** for privacy requests — asking what's held, asking for it
   to be deleted. An address he will actually read.
3. **Minimum age.** The proposal recommended 18. Suggest 18 — and live video of
   real people, if §5 happens, only strengthens it.
4. **Which country's law.** Everything assumes England and Wales and nobody has
   said so. Where is he, or the company, based? With the house in Thailand this
   needs saying out loud.

**Why now:** the site is public, counts visitors, stores a rough location for
the globe, and asks for names and email addresses — with no privacy notice.
Once answered: fill the gaps, link both pages from Home and the ending, unhide
them. Small. Before the notice goes live, check the prune job on the live
project (`plans/privacy-data-inventory.md`, notes).

**Answer:**

---

## 4. Money — has to be said before any invoice

The proposal promised nothing on an invoice he wasn't expecting.

- **The practice log** is in v1 and counted inside the 55 hours.
- **The presence work is quoted at £300, one-off**, on top of the hourly.
  Decided 13 September. Description and price together, one number, no
  apology, then stop. Something like:

  > While building it I added a few things so it feels like sitting with people
  > rather than next to a counter: a dot on the ring for everyone who's sitting,
  > a line telling you how many began when you did, the option to sit until the
  > bell so everyone finishes on the same sound, and a note when you're the first
  > one there that hour. They weren't in what we agreed, so it's £300 on top, as
  > a one-off. No pressure either way — they stay in regardless.

  No hours figure in it: "about twelve hours" was the spec's estimate, and no
  hours are confirmed. If he says he can't afford it, let him say so first.

- **The $500.** Tool costs come off first: $100 for Claude Max, and Supabase Pro
  at $25 a month for as long as it runs (the project was still on the Free plan
  when checked on 13 September). Ask what he wants done with the rest: a payment
  towards the hours, or kept separate. Don't decide it for him.
- **"Where are we against the 55?"** will be his first question. There is no
  confirmed figure — every `Engaged` cell in `TIMELOG.md` is empty. Either run
  `npm run timelog` before the meeting, or say the number comes with the
  invoice. Don't give one on the call.

**Answer:**

---

## 5. His doc — Chiang Mai, from 9 November

He wrote "we can discuss Sunday", so expect it. His words are in
`context/JONNY-IDEAS.md`. Nothing about it is scoped; the useful thing to leave
with is answers, not a design.

- **9 November is 57 days away.** What does a visitor see that day — live video
  in place of the candle photograph? All day, or alongside it?
- **It is new work.** None of it is in the v1 proposal or the 55 hours. It gets
  described and priced before it is built, like everything else.
- **Streaming.** He's asked for a recommendation for the thirty days and for
  after. The running cost is ongoing and his — what's the budget?
- **Safeguarding.** Identifiable people, broadcast from the house they live in,
  to anyone. No audio helps; it doesn't settle it. Worth a solicitor before a
  developer. Who is Lilian, and does interviewing candlelighters involve the
  site?
- **Order.** Suggest v1 is finished first — the domain and the legal pages above
  — so the launch he's planning lands on a site people can sign in to.

**Answer (13 September, as Tenzing relayed it):** two options on the site.

1. **The timer, and people on the map.** Sit for as long as you like. Shared
   with everyone on the map: your session time, your name if you want, your
   location if you want. Otherwise only your presence — *You are meditating
   with X people live*.
2. **The live video.** You join at :55 and wait until the hour, with a
   notification saying someone is going to join soon.

**Not clear yet — settle before anything is specced:**

- **"Someone is going to join soon"** — an on-page line during the handover,
  or a notification to people who aren't on the site? The second needs
  permission, and on iPhone web notifications only work once the site is added
  to the home screen.
- **The video's hour.** Does the meditator sit :00–:55, so :55 is the handover
  a visitor waits through? Can someone join mid-hour, or only at :55?
- **Does *until the bell* survive in option 1**, or does "as long as you like"
  replace the shared bell at :55?
- **"Session time"** — the length they chose, or how long they've been
  sitting so far?
- **"Location if wanted"** — the same ~100 km square the map uses now, with a
  name on it, or a precise point? Anything finer rewrites the privacy page and
  makes the minimum age matter more.
- **Names need somewhere to come from.** Only account holders have one today.
  Can a guest type a name just for the map?
- **"X people live"** is a different number from today's, which counts candles
  lit this hour, not people sitting now.
- **Priced before it's built.** Option 2 is new work outside the proposal;
  option 1 extends the earth and the room, and is new work too.
