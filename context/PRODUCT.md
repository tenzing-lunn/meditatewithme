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

**29 September 2026: How you sit, and the fish, go live.** Tenzing asked
for `dev` to be merged into `main` (release commit `Release: How you sit,
and the fish`) ahead of his own user tests, putting live everything in §2's
*How you sit, and the fish* paragraph: *by yourself* or *with a guide* as a
phrase in the arrival's sentence, the fish for the people here now on a
loose map of the water, the chevron back, the singing-bowl icon, the new
skim and rings, and Begin's sink and the ending's crossfade. **Jonny had not
seen it.** The live video is **not** on in production: `LIVE_HLS_BASE`,
`LIVE_HOOK_SECRET` and `LIVE_AUTH_SECRET` are set for `dev` previews only, so
production's `/api/live` answers *nobody live* and *with a guide* reads
*Nobody is guiding right now* until they are added for Production. Claude
never pressed Begin (a real sitting writes shared state). After the merge
the skim and rings were stepped frame by frame on the silent demo, desktop
and phone, on a frozen clock, and the sentence's sink, *Come back.* and the
minutes scrubbed through their animations: the landing train was softened
and the sink's fade made to lag its drift, on `dev`.
Rollback: redeploy `e515edb`, the Pale water release, or promote its Vercel
deployment again.

**23 September 2026: Pale water goes live.** Tenzing merged `dev` into
`main` (release commit `Release: Pale water`), putting live everything
§2's *On `dev`* paragraph describes: the pond, the one-sentence arrival with
its wheel pickers and play buttons, the skim, the nine recorded beds
(including the replaced hum and sea and the new singing bowl), and the
audit work on `dev` since 21 September. **Jonny had not seen it** before it
went live. Claude never pressed Begin in the new design (the preview was
checked silently); whether Tenzing walked a real sitting on the preview
before merging is not recorded. Home, Settings and Account took only
the new colours and type. Rollback: redeploy the previous release,
`7d0538c`, or promote its Vercel deployment again.

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

**Pale water, on `dev` since 22 September 2026 and live since 23
September.** Not shown to Jonny before it went live. The warm rail described below is replaced for the visit itself.
A guest lands on a pale grey-blue pond: one small stone for each person lit
this hour (up to 60, placed by a hash of their cell, not by geography), each
with slow rings spreading from it, and a name beside a stone for those who
chose to be seen. Over it, the name in Newsreader with the stone-in-rings
mark, the time, the menu, and one sentence: *Sit for [15 minutes], end with
[a singing bowl], in [silence].* Each bracket opens a short list: the
length (the twelve stops, or *until the bell at :55, with everyone*), the
three bells (picking one plays it), and silence or one of the eight beds
(picking one plays it for about four seconds and lets it fade, the way the
bell previews; it comes back at Begin — and fetches that recording, which
can take a moment the first time). **Begin** starts the sitting in that
click, as the bowl did: the sentence sinks into the water word by word,
and your stone is thrown from the button: it skims
across the water, slowing, and sinks at the centre, leaving its shadow and
its rings — then now and then a soft ring, never on a beat. The sitting's
words fade in once it has settled: the faint mark and the time left above,
the company line and *Sound* and *End* below. At the bell the other stones
go and one soft train of wide rings leaves yours; *Come back.* comes into
focus with it and is held for ten seconds, then the sitting fades and
*N minutes.* rises into the same line, with *The water is still again.* and
*Again* and *Done*. The name and place, when due after a first sitting, are
asked after Begin, and the last question's Next begins.

Gone from the visit on `dev`: the doors (with others, or on your own), the
time/bell/sound/bowl screens, the dawn and dusk toggle, the full-screen
switch on the bowl, the earth and its candles in the sitting, and *With
you this hour* on the ending. A guest can no longer choose *on your own*;
a member still can, from the doors on Home, which kept its old layout and
only took the new colours and type.

**How you sit, and the fish, on `dev` since 27 September 2026 and live since
29 September.** Not shown to Jonny; drawn first on the redesign canvas (*Two ways
in · the fish*) and built from it at Tenzing's word. A guest now lands on
the arrival as before, its sentence now opening with how you sit — *Sit
**by yourself** for …* or *Sit **with a guide** until the bell at …*, a
phrase picked like the length, the bell and the sound — and, with a
guide, a line saying *Live now*, *The next session starts at …*, or
*Nobody is guiding right now*; a chevron in the corner of a sitting
goes back to the start. The tab and home-screen icon is the old singing
bowl in blue on the pale water, in place of the flame (the shared-link
card still shows the flame).
Everyone else sitting right now (not everyone who sat this hour) is a
small grey fish that swims nose first, its head, body and tail bending
through its turns and with the wave of its swimming — never
one for yourself, so sitting with nobody else is an empty pond. Each
swims in its person's part of the world on a loose map (west left, north
up), with their place written beside it only if they chose to share it;
each
wanders alone while the pond is quiet and they gather into milling swarms
once it is crowded; touching the water scatters the nearby ones, and a
skimmed pebble scatters them where it lands. *By yourself* leads to the
sentence and Begin as before, and the sitting is your stone among the
fish. *Guided meditation* starts the sitting in the click: whoever is on
camera, framed on the water (fading in only once it plays, held through a
blip of under 20 seconds, started by any tap in Low Power Mode), no fish,
ending with everyone at the shared bell at :55; between two people on
camera the line says when the next session starts, and with nobody live
it is the water. A member still reaches the sitting through Home's older
doors, which have not been changed and do not offer the guided sitting
yet. Production shows none of it until `dev` is merged, and even then no
video until its env names a video server.

**The account corner, live since 30 September 2026 (`48eab12`, merged so a
friend of Tenzing's could test the flow), not shown to Jonny** (`plans/account-corner.md`). The old Home is gone:
everybody, signed in or not, lands on the pond, and the only difference is
the top-right corner. A guest sees *Sign in* there, which opens the panel
straight away — *Continue with Google* (live since the same day, under
Tenzing's Google account), or an email code — with *Don't have an account?
Create one* at its foot turning it to *Create account*, name first. **On
`dev` since 30 September 2026**, both that panel and *Would you like to be
remembered?* carry an unticked switch above *Continue with Google*, *Email
me when the app is ready* (*And now and then, news of the site.*), which
applies to Google and the email code alike and lands in
`profiles.email_updates` once signed in. Nothing sends mail to that list,
there is no unsubscribe yet, and the privacy notice that has to cover it
is still unpublished; Jonny has not been asked. Signed
in, the corner is your first name; pressing it fades the name and slides
*Account · Settings · Layout* out of its place (on a phone the wordmark and
clock fade for them), and pressing elsewhere slides them back. *Account*:
your name and email (a new address is confirmed by email), your practice,
*Sign out*, *Delete account*. *Settings*: for now privacy — where you are
from and whether others see your name while you sit with them; animations,
sound and your own sounds to come. *Layout*: themes, coming soon. A
sitting's *Done* returns everybody to the pond. The descriptions of Home,
its doors and its drawer below are history: production no longer shows them.

**Rebuilt on 14 September 2026** (`docs/ui-rebuild.md`, on `ui-warm`). The
photographic room, the landing word, the settings panel and the ring are gone;
what follows is the site as it is now. The functionality underneath — the
shared hour, the bell at :55, the three bells, the five beds, the practice
log, accounts, the earth — is the same, and the history of each is in §3 and
in `ARCHITECTURE.md`.

**The front page is the doors.** A guest lands on this hour's earth, full
screen, with the doors at the bottom over the dusk veil: *Meditate with me*
in the rounded face where the mode question would be, one line above it
saying who else is here right now, and the two doors beside it — *Sit with
everyone* (everyone finishes together at the next :55 — or, for somebody
who already sits with others for a length of their own, *Your own length,
with everyone*) and *Sit on your own*.
Choosing a door is the first click on the site. A returning guest also sees a
quiet line at the foot — *Your usual is 10 minutes · singing bowl · in
silence* — with a switch, *Skip the questions next time*; with it on, a door
goes straight to the bowl. The switch turns itself on once, when the first
sitting completes, with what was just sat; turned off, it stays off. A
first visit asks nothing personal: the questions about the sit, then the
bowl. The visit after a first completed sitting asks a guest their name and
place, once, just after the door (**changed 22 September 2026**; until then
both were the first thing a first-timer met, before any question about the
sit, for a name and a place that by default nobody sees). There are no step
marks here: it is the way in, not one of the questions. The sun-and-moon and the three-line menu (`Create account`,
`Sign in`) sit at the top right and stay there, still, until the bowl is
struck. **Changed 19 September 2026**: until then a paper title page came
first — the wordmark, one sentence and *Come and sit*, with the earth pale
beside it — and the doors were the screen after it. Two front doors, and the
second showed the thing itself, so it became the only one.

**The questions, one screen each.** Moving on is a quick, short vertical
switch — the last question lifts away and the next rises into its place —
not a page sliding sideways; going back runs it downward. Every question
hangs from the same left margin, so the rail reads as one page
whose content changes, with a small *Back* on the left and a small *Next* on
the right, and the question itself is what a screen reader is handed on
arrival. Escape is *Back*. **Changed 14 September 2026** from a full-width
slide left to right. The questions, in order:

1. *What should we call you?* — asked once, on the visit after a first
   sitting, never on the first. The question, one line under it — *Your
   first name, if you'd like to be seen.* — and the line, with the small
   *Back* at the foot. Until 22 September 2026 the question and its reason
   were for a screen reader only and the line was all a sighted person saw.
   The line draws itself out as
   *Enter your name* types on it in a pale brown with a caret blinking at the front of the line; the
   prompt goes on the first key, and what you type is in full ink. The line
   is ready for typing the moment the screen arrives, no click. *Skip* is
   under the left end of the line, arriving last, once the prompt has typed itself out; *Next* appears under the right end once
   something is typed, and Enter does the same. Signed in, never asked: the
   account's name is used. The line always arrives empty, even when a name
   was given on an earlier visit.
2. *Where are you sitting?* — asked once, on the same visit as the name;
   a member is asked this alone, the name having come with the account. A
   bare line, *Enter your city*, and nothing else visible; typed,
   then chosen. The letters search about 33,000 towns of 15,000 people or
   more and every country (GeoNames, searched in the browser, so nothing
   typed is sent anywhere), and the matches open under the line — *Lisbon ·
   Portugal* — with the arrows and Enter to take one. A town too small for
   the list is still an answer: the last choice is always *Keep "…" as you
   typed it*, and while the list is still downloading the first row says
   *Looking up places…* and cannot be chosen (since 22 September 2026; until
   then *Keep …* was the only row for those seconds). Clicking the empty line offers the town and country the server
   sees from the connection as the one choice — *Lisbon, Portugal · near
   you*. *Back*, *Next* and *Skip* are where they are on the name (one word
   for skipping on both, since 22 September 2026; the origin's said *Leave it
   out*): *Skip* under the line once the prompt has typed,
   *Next* appearing to the right of it once something is typed. With it, a
   switch appears below them, off by default: *Let others
   see Ana from Lisbon while you sit with them*, and one line saying it is
   saved on this device and to your account if you're signed in, and shown to
   others only while the switch is on. Asked once; changeable from the
   account.
3. *How would you like to sit?* — the whole screen is this hour's earth at
   night, the same map and candles as the sitting, with a light for everyone
   sitting this hour and a dashed ring marked *You* where you are (the edge's
   guess, never kept). On a phone it shows the part of the earth around you;
   on a laptop, all of it. At the bottom, *● 43 others are here right now*
   (the count less you; *Nobody else yet. Yours will be the first light.*
   when nobody is), the question, and two doors of the same size: **Sit with
   everyone**, lit in the candle's colour — *Everyone finishes together at
   12:55*, or *Your own length, with everyone* when a private length chosen
   under with-others will survive the door — and **Sit on your own**,
   outlined — *Your own length, the same sky*. Pressing either answers and advances; neither is shown as chosen
   on arrival. Back is in the foot as on every question. Home is the same
   scene under *Hello, Ana.*, with the usual and its switch below the doors.
   **Redrawn 15 September 2026** from a map in a card over a small row, after
   a mockup Tenzing approved (*Under one sky*).
4. *How long will you sit?* — two different screens, by door. **By
   yourself**, since 15 September 2026, one large sentence, *You're sitting
   for 10 minutes.*, over *11 others are here right now.
   They'll come and go; your time is your own.* (with nobody else there,
   *Others will come and go while you sit; your time is your own.*), and a
   lit candle on a dark stage whose height is the length: dragging it up or
   down, or the arrow keys, sets any stop from 1 to 55, and the minutes ride
   beside its rim. Around it, far off, a small breathing light for each other
   person on the site right now — the count only, placed for looks, never
   where anyone is and never a name. Nobody is joined here, so the length is
   free; the lights are company. The idea: meditating by yourself is still
   meditating at the same time as other people. It replaced the slider on
   this path. **With others**, since 15 September 2026, the screen is one
   large sentence and a timer dial: *You're sitting for 10 minutes with 11
   people.* — the live count less you — or, with nobody else there, *You're
   sitting for 10 minutes, with anyone who joins.* No names: those are shown
   only to people already sitting. The dial is a round timer face beside the
   sentence on a laptop and under it on a phone; dragging its ember knob round
   the ring (or the arrow keys) turns through every length, with the shared
   bell as a marked stop where it falls in time, and the sentence changes as
   it turns — on the bell, *until 12:55*. A
   private length under with-others is still allowed and survives the door.
   The settings drawer on Home keeps a slider for both.
5. *How will it end?* — the singing bowl, the gong and the struck bell as
   three drawn cards, each with what it sounds like under its name; tapping
   one rings it and sends two rings out of the drawing.
6. *Any sound while you sit?* (*Anything underneath?* until 22 September
   2026, which meant nothing without the room's vocabulary) — six tiles: silence and the five beds, silence
   chosen to begin with. Tapping a bed plays it; a *Volume* row appears under
   them once one is on. **One at a time since 22 September 2026**, on the
   client's instruction that the sounds are individual: the six are an
   exclusive choice like the three bells, choosing one silences the rest, and
   the single *Volume* is how loud whichever is on plays. Until then each
   tile was a toggle with a fader of its own and the beds stacked, with
   *Volume* a master over the lot; a mix stored from those days keeps its
   loudest bed, at full, and drops the others.
   **Rebuilt 17 September 2026** from a lone switch that revealed a card of
   pills and a second page called *Adjust levels*. Since **20 September
   2026** it is the same control in all three places it appears — here, in
   *Underneath* in the settings drawer, and in the sheet during a sitting —
   where before, the drawer's tiles had no level on them at all and the
   sitting had a different mixer again.
7. *When you are ready.* — a drawn singing bowl over the line of what the
   sitting will be (*Until 12:55 · singing bowl · rain*) with *Change* beside
   it. On a Mac, a *Full screen* switch, remembered. The caption *Strike the
   bowl to begin.* went on 22 September 2026: the screen said "begin" four
   ways, and the title and the bowl's own label are enough.

**Every question says where it is.** Since 17 September 2026 a short row of
marks in the bar across the top of each question shows which one of them it is, the current one lit,
and a returning guest asked fewer questions is shown the shorter rail rather
than a fixed count. The last mark is the bowl, and it is read to a screen
reader as *The bowl*, not as a numbered question (since 22 September 2026;
it was *Question 6 of 6*). On a laptop each question now sets its control beside it
rather than under it, and Back and Next sit with the control instead of at
the bottom of the window.

**The bowl is the only thing that starts a sitting.** Striking it wobbles
the rim and sends three rings out; the bell you chose sounds; the light goes
over 1.4 seconds while the bowl screen drops away and
the sitting rises into place — the camera lifting to your seated view. Until
this rebuild a signed-in visitor's sitting started on arrival; nothing starts
now without the strike, because a sitting should begin with a gesture.

**Dawn or dusk.** From *How would you like to sit?* to the ending, and on the
signed-in Home, the screens are the room rather than paper, and the room
follows the visitor's own day: dawn — the paper's light, a pale earth, ember
controls — from six in the morning, dusk — the dark earth and flame — from six
in the evening. A sun or moon beside the menu switches it, and the switch
lasts until the next six o'clock, on that device only. **Added 16 September 2026**, at Tenzing's request; shown to Jonny by 21 September 2026.

**The sitting.** The room. *With others:* the earth, full width, with a candle for
every place somebody lit one this hour; the ones still here are bright, the
ones who left are dim; your own is a little larger with a soft ring. Under it,
one line: *Ana from Lisbon is meditating with you*, *Ana from Lisbon and 3
others are meditating with you*, *4 others are meditating with you*, *You are
the first here this hour*, or nothing when the count could not be read — never
a guess. Names are only the ones people chose to share, at most three per
place and sixty in all, and when there are several they take turns every
twenty seconds. The clock is small in the top right. At the foot, *Sound*
(opens the same tiles as the sound question, without its *Volume*, as a sheet
laid over the foot of the earth; Escape or a tap outside closes it) and
*End*. *By yourself:* the same room, no
earth, no line, the bowl faintly centred, the same clock and the same two
controls. Sound, End, the dawn or dusk switch and the clock fade after four
seconds and come back at a tap anywhere, so the sitting is the earth.

**Until the bell.** Everyone who chooses *with others* hears the same bell at
the same second, at :55. Arriving with under five minutes to go rolls forward
to the next hour's bell. Nobody is refused. The bell you chose sounds at the
start as well as the end, the opening strike with a shorter tail.

**Afterwards.** At the bell the earth stays: the clock goes, the controls
rest for good, and *Come back.* sits over the candles for ten seconds while
the bowl is still ringing and the mix recedes — someone who sat until the
bell finishes in sight of everyone they sat with. Then the minutes sat at
display size, one row — *With you this hour · 3 others*, for a with-others
sitting, when it is known — and *Done* (signed in, back to Home) or *Finish*
(a guest, back to the doors) as the lit button, with *Sit again* quiet
beside it. No streak and no total here; those stay on Home. **Changed 22
September 2026**: until then the earth vanished at the bell, a number
counted the ten seconds down, *Days in a row* and *Altogether* were rows,
*Sit again* was the lit button, and a guest's ending carried the account
offer at its foot. The guest's offer is the three-line menu on the doors,
where Finish returns them. Full screen is left on the way out, and the
ground lifts back to paper.

**Home, signed in.** *Meditate with me* small, the three-line menu, *Hello,
Ana.*, the two doors, and under them one bar: *Your sitting* with the three
answers as pills — *Until 12:55*, *Singing bowl*, *Rain* — and *Change*, which
opens the settings drawer, and beside it the switch *Go straight to the
bowl*. A door goes to the questions: time, bell, sound, the bowl — and, on
the visit after a first completed sitting, where you are sitting, once,
before them; with the switch on, straight to the bowl (still by way of that
one question, the once it is owed). The switch turns itself on once, after the first sitting completes,
and off when an answer changes on the rail or on another device, so it never
skips a question whose answer moved; a change made in the drawer keeps it on,
because the drawer is where the answers are being chosen, and so does a door,
because choosing how to sit is not a changed answer. **The drawer, 19
September 2026:** one page sliding in from the right over Home with every
setting on it — how long (a slider whose last stop is always *Until the
bell*; choosing it chooses *with everyone* too), the bell (three cards;
tapping one rings it), and the sound underneath (silence or one of the five
beds, with its *Volume*; not played there). The switch is on the
bar alone since 22 September 2026; the drawer had a second copy of it. The
three lines open the same drawer as a menu — *Account*,
*Settings*, *Your practice*, *Sign out* — with Settings opening in place.
Shown to Jonny by 21 September 2026. When two or more are sitting the count
is on the *With others* door, the same door as on the rail. The menu: *Account* (email, the name, where you are
from and the switch that shows it, *Delete account* with its confirmation),
*Settings* (the drawer's own settings, opening in place), *Your
practice* (the streak, the totals, the recent sittings), *Sign out* — which
asks once more in its row, *Sign out?* with *Stay* and *Yes, sign out*,
before it acts (since 22 September 2026; it sat one press under *Your
practice*).

**The practice log.** Every sitting is recorded locally; a streak is computed
in local time and not sitting today does not break it. With an account it
syncs across devices. Not in the proposal — see §4.

**This hour, on the earth.** The earth is seen in two places: as the ground
of Home and of the *How would you like to sit?* question, and as the sitting's
view with others, where your own candle wears a flame ring. The projection is
Equal Earth; the night side is real. It had a page of its own, `/world`, with
the count under it and the hundred-kilometre precision said on the page; that
route was deleted on 22 September 2026 as an unlinked third copy, so the
precision is now stated in the privacy notice alone. On localhost the map is
correctly empty: the edge headers it places people from do not exist in
`next dev`. A count or an earth that cannot be read for two polls in a row
goes quiet rather than staying old — Home's line included, since 22
September 2026.

**Accounts.** Optional. The menu opens `Create account` and `Sign in`; both
open the same panel under the trigger, asking one thing at a time — your
name, then your email, then the six-digit code, with `Confirm and enter`.
Nothing is asked for that is not used: the name is *Hello, Ana* and, if you
chose to be seen, the name on the earth. Signing in once is enough; the
session renews itself. `Sign out` ends it on that device only.

After a guest's sitting, before Again/Done, a centered question asks
*Would you like to be remembered?* Yes opens name → place → email →
six-digit confirmation, one question at a time, then the signed-in Home.
No (or *Not now* during the questions) continues to Again/Done. The
place is saved with the profile; creating an account does not change the
visitor's choice about sharing their name and place.

**Closing an account.** *Delete account*, in the account panel, opens a
confirmation naming what goes — the email address, the name, where you are
from, the settings and the sittings synced to it — and saying the practice log on
this device stays. `Keep it` carries the chosen treatment and the destructive
control does not. Deletion is immediate and total.

**A link that does not work says so.** A spent magic link bounces to the
front page signed out, with the reason in the URL fragment; the panel opens
itself on the address step carrying the reason, and the fragment is cleaned
off.

**Paper for who you are, then the room. The questions and the sitting never
scroll.** One palette regardless of system setting. Supabase down still
leaves a bowl, a timer and a mix — nothing shows an error screen. Reduced
motion is honoured: the rail jumps, the strike is one pulse, the lift is a
crossfade, the earth holds still.

**Before a visitor arrives.** A shared link unfurls into a card — the flame
mark, *Meditate With Me* in the rounded face on the warm paper, and *Everyone
sitting this hour is a candle on the earth, and one bell at five to the hour
ends it for all of them* — the one sentence the page description and the terms
also use. The tab and the iPhone home screen carry the same flame on dusk,
and the browser's theme colour is dusk to match. The mark is
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
| 22 Sept 2026 | The name and the place are asked on the visit after a first sitting, not on the first; the skip turns itself on after that sitting | `docs/ui-ux-fixes.md` commits 5 and 6, `docs/audit-2026-09-21.md` M1 and H4 |
| 22 Sept 2026 | Every size is a named role and nothing is under 12px; tile names, the drawer's rows and its headings are Nunito, not the display face; the dawn/dusk toggle is only in the room; the count in the time sentence is plain ink; the drawer's bells are radios like the rail's; one shadow, one curve | `docs/ui-ux-fixes.md` commit 9, `DESIGN.md` |
| 22 Sept 2026 | The landing arrives at once instead of in pieces: the ground is right in the first frame rather than turning over after dark, the earth is asked for with the document, the first screen does not animate itself in, a guest no longer waits for an account they do not have, and everything past the doors is a separate chunk fetched while the doors are read | `ARCHITECTURE.md` §16, `DESIGN.md` |

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

**29 September 2026, Tenzing's own downloads, on `dev`:** the gong is a
steel tongue drum (CC0), and three beds were swapped — the waterfall for a
small creek (CC BY 4.0, kevp888), the sea for long rolling swells (CC0,
bassimat) and the crickets for a park in the evening, birds and insects
(CC BY 4.0, klankbeeld). **The two CC BY recordings reached `main` on 30
September 2026 without a visible credit, and are owed one**: `/credits` exists and is built from
`lib/beds.ts`, but nothing links to it yet, same as the privacy notice and
the terms. The creek is very quiet at source and was raised about 27 dB, so
listen for hiss. Not listened to by an agent; Jonny has not heard any of it.

**The beds are real recordings since 23 September 2026, on `dev`.** The
synthesised beds were first reworked (a lighter rain) and extended (ocean,
fire, chimes), and Tenzing listened and found them bad. All eight are now
CC0 field recordings from Freesound — public domain, free for a commercial
site, no credit owed — chosen by Claude from the most-downloaded CC0
recordings of each kind and approved by Tenzing. **Jonny has not been asked
and has not heard them**; the list of sounds, and whether to buy the
licensed recordings he was going to, are still his. The eight, with
recordists and the stretch used, are in `lib/beds.ts`: rain (jmbphilmes),
wind and night crickets (felix.blume), a waterfall in Estonia (nsmusic), the
Baltic shore (pulswelle), a fireplace (martats), a tanpura for *hum*
(sankalp) and wind chimes (giddster). The files were taken from Freesound's
public HQ previews (128 kbps MP3), not the originals, which need an account.

**Same day, after listening on the preview:** *hum* sounded like "some
alien noise" and the sea "like you're on a boat". Replaced: *hum* is now a
warm, low (about 110 Hz), almost motionless pad (bassimat / Mantice, "Warm
Pad Essentials Drone"), and the sea is waves breaking softly on sand
(ralph.whitehead, "Waves On The Beach (Sand Wash)"). A ninth bed was added
at Tenzing's ask, **a singing bowl that keeps singing** (`bowl`, shown as
*a humming bowl*): a bowl played round the rim the whole way (hollandm,
"Singing Bowl, long without reverb"), the steadiest of five long bowl
recordings measured. It replaced a ringing gong (a stretch of a real gong
bath) the same evening, before anyone but Tenzing had heard it. All three CC0, chosen by measuring the recordings (steadiness, pitch,
no gaps or spikes), not by ear: Tenzing has to listen. The sea recording is
very quiet at source, so it was raised about 25 dB to meet the others, and
its hiss came up with it; the Priory Bay recording (richwise, 848039) is
the fallback if that is audible.

`scripts/build-sounds.mjs` cuts each into a seamless loop of 60 to 108
seconds, matches them to −20 LUFS with a limiter on their rare spikes, and
writes `public/sounds/` (12 MB in all; a visitor fetches only the bed they
choose, when they choose it). **Fire sits 5.4 dB
under**: its recording is pops over near-silence, so the pops are its
loudness and limiting them only made it quieter. A steadier fire (a wood
stove, `wwstudioswastaken`) is the proposed replacement. The beds are
quieter overall than the synthesised ones were (−20 against −16), so the
same *Volume* is about 4 dB softer. The bells are unchanged. **Not listened
to by Claude; Tenzing has to.**

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
