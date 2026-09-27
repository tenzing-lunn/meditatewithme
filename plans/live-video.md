# Live video — meditate with others

Active plan, started 26 September 2026. This is the Candle Lighter that v1
deferred (`context/VISION.md` §2), and option 2 of Jonny's two-option
direction of 13 September (`context/PRODUCT.md` §5,
`plans/meeting-with-jonny.md` §5). The first people on camera are the house in
Chiang Mai from 9 November (`context/JONNY-IDEAS.md`); volunteer
candlelighters follow. Until this file, no plan held any of it.

**It is new work.** Nothing here is in the v1 proposal or the 55-hour cap. It
is described and priced to Jonny before any of it is built.

**Platform: self-hosted MediaMTX, built and proven locally, 26 September
2026.** Tenzing chose Vimeo that morning; research the same day (below) found
Vimeo's self-serve plan cannot do three things this design depends on, and
nothing purpose-built beat running MediaMTX ourselves. Tenzing then asked for
it built and proven, with the house set aside. **Jonny has not been told any
of this** — the platform, its running cost and the price of the work are
still his to agree (Phase 0).

---

## The goal

> **The site hosts live video. A visitor can choose to meditate with others
> and sit with whoever is live — silent, in place of the earth — and when
> nobody is live, the site says so gently and they sit with the earth
> instead, never an error. Any number of collaborators can go live from a
> phone or camera with a stream key we give them; we can add or cut off any
> one of them without touching the others, and without a deploy. It runs
> around the clock at a flat, predictable cost Jonny agreed to before it was
> built, and it is live for the house in Chiang Mai on 9 November 2026.**

Done means every box in Phases 0–4 is ticked.

44 days from today. Working back: a 48-hour soak test at the house from 2
November, build finished by 30 October, platform and price agreed by 3
October. If Phase 0 slips past 10 October, say so to Tenzing. The date is
Jonny's (the new moon) and it will not move.

---

## What the finished product is

### For a visitor

- **Two ways in**, Jonny's two options. *Sit on your own* is the rail as it
  is today. *Meditate with others* is the live video.
- **When someone is live**, their video takes the place of the earth: a
  candle, a person sitting, silent. **No audio, ever** (Jonny's words). The
  visitor's own bed and bell still play, exactly as now.
- **When nobody is live**, the door still works. It says nobody is on camera
  right now, and they sit with the earth, as today. Nobody is turned away
  (`8821de1`).
- **Joining** is allowed at any moment. The handover at :55 is the intended
  door: the bell already rings then (`ARCHITECTURE.md` §6.3), one person
  finishes, the next lights their candle, and the page says so in one line.
- **When the feed drops** mid-sitting, the earth fades back in and the video
  returns by itself. The timer and the bell never stop. Nothing shows an
  error screen (`ARCHITECTURE.md` §10).
- **Playback starts on the bowl strike.** iPhones in Low Power Mode refuse
  to autoplay video (WebKit, *won't fix*), and the strike is already a tap,
  so calling `play()` there covers it. A timer on `playing` catches anything
  else and shows a quiet tap-to-start.
- **Phones get 480p.** A dim candle loses nothing at that size, and 55
  minutes at 720p is about 600 MB of someone's data plan.

### For a collaborator

- **No site account and no platform login.** They get a key, ideally as one
  QR code that loads the server, the key and every encoder setting into a
  phone app (Larix *Grove* links do this; the free Larix stops after 30
  minutes, so the app is still to be chosen — see the volunteer guide).
  They frame the candle, lock exposure, press go.
- A one-page guide (drafted below).

### For us

- **Each collaborator has their own key**, so one can be cut off alone.
- **The site finds whoever is live itself.** Nobody updates a rota for the
  video to appear.
- Adding a collaborator is a row or a click, not code.

---

## The platform — research, 26 September 2026

Eight research passes in two rounds, primary sources where they could be
fetched.
Every figure is for 30 days on air around the clock (43,200 minutes), with
**5 / 25 / 100** people watching on average.

### Vimeo, checked hardest because it was the choice

| | Advanced (cheapest plan with live) |
|---|---|
| Price | **$75/mo billed annually ($900), or $125 month-to-month**, cancellable. Read from vimeo.com/upgrade-plan. |
| 24/7 | **No. 12 hours per stream.** Continuous streaming is an *Enterprise* add-on, by quote. |
| Knowing who is live | **No. The Live API is Enterprise-only**, by request. The design's "the site asks Vimeo who is live" does not exist on Advanced. |
| Bandwidth | 2 TB per calendar month, including live. About 2–4 people watching around the clock uses it. Exceed it in two months out of twelve and Vimeo asks you to cut usage, upgrade to Enterprise, or leave, within seven days. 9 Nov–9 Dec spans two calendar months. |
| Handovers | After an encoder disconnects, the event is held for **five minutes**; nothing can stream to it until then. The "Go Live" button may need pressing each time — undocumented, and fatal for an unattended 4am handover. |
| Player | Background mode, domain-restricted embeds and logo removal are all fine. A known bug leaves the embed on "not started yet" until refresh. |
| Company | Bought by Bending Spoons (Nov 2025); most staff laid off Jan 2026. |

**Verdict: Vimeo does this properly only on Enterprise** (quote-only, no
monthly billing). On Advanced it can be forced to work: embed one fixed
event, stop the stream at every handover to stay under 12 hours, and hope
the audience stays under 2 TB. That is the fragile version of the product,
at $125 a month.

### Everything else

| Option | 5 avg | 25 avg | 100 avg | 24/7 | Own key each | Detect live | Branding |
|---|---|---|---|---|---|---|---|
| **Self-hosted MediaMTX, EU server** | **~$5** | **~$5–38** | **~$5–135** | yes | yes, checked by our own route | yes, hooks | none |
| YouTube Live | $0 | $0 | $0 | yes | yes | yes, cheap API | YouTube logo and title, always |
| Vimeo Advanced (monthly) | $125 | $125, over the 2 TB | Enterprise | no | yes | no | none |
| Cloudflare Stream | $221 | $1,085 | $4,325 | yes | yes | yes | none |
| AWS IVS Basic, 480p | ~$274 | ~$768 | ~$2,484 | yes | yes | yes | none |
| Livepeer | $346 | $778 | $2,398 | yes | yes | yes | none |
| Castr Premium | $200 | ~$300+ | ~$2,500+ | yes | yes | yes | removable |
| Mux | $1,076 | $1,748 | $3,971 | no (12h) | yes | yes | none |

Also ruled out: Dacast, BoxCast, Restream, OneStream, Wowza, IBM, Muvi (too
dear or no 24/7), Twitch (one key per channel, gaming branding), Bunny
Stream (live only in closed preview), Azure (retired), Google Live Stream API
(bills while idle, most assembly).

**No usage-billed service beats a flat plan at any audience modelled.**
Cloudflare, the best of them, costs $221 at 5 viewers; it only gets under
$70 if the average audience stays below about 1.5.

### Round two — looking for a purpose-built product

Four more passes, the same day, asked whether something built for exactly
this beats running our own server: realtime video platforms, managed
streaming servers, CDN and serverless delivery, and who already runs 24/7
vigil streams.

| Option | 5 avg | 25 avg | 100 avg | Server to run | Notes |
|---|---|---|---|---|---|
| **GetStream Livestreaming** (WHIP ingest, SD) | **~$30** | ~$462 | ~$2,082 | no | The only fully ready-made fit: backstage and go-live, per-user tokens, webhooks, no branding, $100 of usage free a month. WHIP only — RTMP ingest adds $648/mo. |
| **Cloudflare Realtime (SFU)** | **$0–31** | $153–355 | $760–1,570 | no | $0.05/GB after 1 TB free. We would write and harden the WHIP/WHEP Worker, keys and live-tracking ourselves; Cloudflare's example is marked not production-ready. |
| Red5 Cloud | $61–126 | $320–644 | $1.3–2.6k | no | US only |
| LiveKit Cloud | ~$172–269 | ~$605–1,010 | ~$3–4.6k | no | Best developer tools; bandwidth 5–9× Cloudflare's |
| Nimble Streamer + WMSPanel (makers of Larix) | VPS + $70 | | | **yes** | The panel manages config, not uptime |
| Ant Media / Wowza / Flussonic | $89–195+ licence | | | **yes** | Licence for nothing we need |
| Gcore, Tencent, Alibaba, BytePlus, KeyCDN, Fastly | $80–140+ | $400–700+ | $1.6–2.8k | no | Per-minute or per-GB |
| Resi, BoxCast (church platforms) | $159–249+ | | | no | Event-shaped: BoxCast caps a broadcast at 24h; Resi's plans hold 200 GB–1 TB |
| AWS MediaLive (what explore.org uses) | ~$400–1,700 | | | no | Switches inputs on a schedule — built for rotas, priced for broadcasters |
| Bunny Stream Live | ? | | | no | Closed preview since 13 Aug 2026, no pricing. Don't wait for it. |

**No product exists for "many volunteers each get a key, and a rota decides
who is on air"** (precedents pass). Everything is either primary/backup
failover or a paid scheduled switcher. The practical answer is the one this
plan already had: each broadcaster streams to their own input, and **the site
— which already runs the hour's clock — picks who to show.**

**What the precedents teach** (full notes in the session that wrote this):

- **Perpetual adoration chapels are the nearest thing that exists** — a
  candle, silent, 24/7, for years. Most are one fixed camera pushing straight
  to YouTube; Adorecast (4.5M views since 2018) is a single Axis camera
  running the CamStreamer app, with no computer at all.
- **Frame the flame, not the face.** Adoration cams, Knock Shrine and the
  Bonnevaux 24-hour meditation ("light a candle and aim your camera at it")
  all do this. It removes most of the consent problem — and in Thailand,
  showing someone at prayer arguably discloses religious belief, which the
  PDPA (s.26) treats as sensitive data needing explicit consent.
- **Never stop the house camera at :55.** Only the sitter changes in front
  of it. The stream never breaks, so the handover is a feature, not a cut.
- **Write the rota like an adoration schedule**: a named person per hour, a
  captain per block who finds or is the substitute, and a live substitute
  list.
- **An instant kill switch** held by whoever is in the room (the Irish
  bishops' webcam guidelines).
- **Plan the empty state on purpose.** explore.org falls back to highlights;
  the Western Wall cams go dark on Shabbat by design. A quiet "the candle is
  being passed" beats a spinner.
- **The stream is the easy part; governance is the hard part.** IHOPKC's
  24/7 prayer room outlived its organisation's abuse scandal. A volunteer
  rota needs a safeguarding line independent of its leader.

### Recommendation, after both rounds

**1. MediaMTX on two small servers at two providers** (Hetzner and OVH, both
in Europe) — **about €10–15 a month at every audience modelled.** Still the
only option that meets every requirement and costs nearly nothing, and the
second server answers the 4am problem instead of leaving it to a person.

- **The house streams to both at once** (SRT, about 3 Mbps up in total).
  The player tries server A and falls to B on a stall. One server dying is a
  non-event.
- **Keys live in Supabase.** Both servers ask one Next.js route on every
  publish (`authHTTPAddress`); revoking is a row. The route is kept trivial
  and cached, because if it is down, reconnects fail.
- **Who is live** is pushed by MediaMTX's `runOnReady` / `runOnNotReady`
  hooks, and a Vercel cron every minute reconciles against both servers'
  APIs.
- **One path per collaborator** (`/c/<id>`). At a volunteer handover the
  incoming sitter goes live on their own path at :55; the site switches to
  the newest; the outgoing one stops. No collisions.
- **Playback** is plain HLS in our own `<video muted playsinline>`. No
  iframe, no third-party cookies.
- **Monitoring**: an uptime check on both servers, and an alert when nobody
  is live during the house's thirty days. `systemd` restarts the process;
  pinned versions and unattended security updates.
- **Not Cloudflare's CDN in front** — its terms forbid serving video on free
  and pro plans. If the audience ever reaches the hundreds, the scale-out is
  MediaMTX pushing HLS to Cloudflare R2 (free egress, about $1–8/mo), which
  is allowed, but needs the domain's DNS on Cloudflare. Not needed to launch.

**2. If no one should own servers at all: GetStream**, at about $30 a month
at launch-size audiences and a ready-made backstage/go-live product. The
risk is that its cost rises with every viewer — about $460/mo at 25 — so it
needs a viewer cap of our own. Cloudflare Realtime is cheaper still at 5
viewers but means writing the missing pieces ourselves.

**3. YouTube Live** stays the free fallback, as the adoration chapels use:
free at any size, but YouTube's logo and title always show, and a dropped
stream becomes a new video.

**4. Vimeo only on an Enterprise quote.** Advanced is not recommended.

---

## The house, and encoding — platform-independent

**The camera is the adoration-chapel pattern: fixed, on the flame, never
stopped.**

**Kit** (approximate):

| Item | Price |
|---|---|
| **Option A:** an IP camera that streams by itself — e.g. an Axis fixed dome with the CamStreamer app (as Adorecast runs). No computer, no phone, nothing to overheat. *Model and low-light quality to confirm.* | camera ~$600–900 + CamStreamer $299 once (unverified) |
| **Option B:** a camera with clean HDMI and a dummy battery (e.g. Sony ZV-E10 + f/1.8 prime) into a Blackmagic Web Presenter HD (RTMP/SRT over Ethernet) | ~$650–850 + ~$495 |
| Hot spare: an iPhone 15+ with **Larix Premium** ($9.99/mo — the free app stops after 30 minutes and adds a watermark) or Moblin, Charge Limit 80% | used, ~15–20k THB |
| Fibre, symmetric (e.g. AIS 3BB 500/500) | ~500–600 THB/mo |
| A 4G/5G SIM from the *other* network, with a router | ~600–1,000 THB/mo + ~2,000 THB |
| Dual-WAN router (GL.iNet Flint 2) | ~$130–150 |
| UPS 1,000–1,500 VA, or a ~250 Wh LiFePO4 station with pass-through, for the fibre box, router, camera and lamp | 5,000–9,000 THB |
| A warm, dimmable, flicker-free LED — light cuts sensor noise, and noise costs bitrate | $40–80 |
| Tripod or mount, candle holder, fire extinguisher | small |

**No Starlink**: not licensed in Thailand. **Loy Krathong / Yi Peng falls
about 24–25 November**, inside the thirty days: crowded mobile networks and
lanterns near power lines. Treat those nights as higher risk. Check planned
PEA power cuts for the house's area at eservice.pea.co.th/PowerOutage.

**Encoder settings:**

- H.264 High or Main, CBR, no B-frames, keyframe every 2 s.
- **25 fps.** A flame flickers at about 10 Hz, so 15 fps aliases it. 25 fps
  with a 1/50 s shutter also matches Thailand's 50 Hz mains, avoiding banding.
- House: 1280×720, ~1,500–2,500 kbps. Volunteers: 1280×720, ~1,500 kbps,
  adaptive bitrate on. Measure the real candle before fixing a number; a
  static scene may need far less.
- **A silent AAC track, silenced at the encoder** (OBS with no audio
  sources; the app muted). Some players fail without one — and a live
  microphone muted only in our player could be unmuted by anyone who finds
  the stream.
- Auto-reconnect always on. SRT from Chiang Mai (it copes with the long
  path to Europe better than RTMP), otherwise RTMPS.
- Camera: lock exposure, focus and white balance (~2700–3200 K). Expose for
  the wall, not the flame. A matte background, not black: deep black shows
  compression blocks.

**Volunteer guide (draft):**

**The apps** (checked 27 September 2026). **iPhone: Moblin** — free,
MIT-licensed, RTMP, RTMPS, SRT and WHIP, no watermark or time limit (its
only purchases are icons). **Android: IRL Pro** — free, RTMP and SRT to a
custom server; RTMPS and no-watermark still to confirm on a real phone.
**Any computer: OBS.** Not free Larix: it stops after 30 minutes and
watermarks (Premium is $9.99/mo per phone). Whatever the app, keyframes
every 2 seconds — MediaMTX cuts segments at keyframes.

1. Install the app we name.
2. Scan the QR code we send. It sets everything.
3. Phone on a stand, landscape, plugged in, case off, Do Not Disturb on,
   Auto-Lock off. On iPhone 15+, Charge Limit 80%.
4. **Frame the candle.** Your hands and the flame, not your face, unless you
   have chosen otherwise in writing. One warm lamp so the room isn't dark.
   Tap and hold to lock exposure and focus.
5. **Mute.** No sound ever leaves the phone.
6. Press go two minutes before your hour. Stay in the app.
7. If it drops, do nothing; it reconnects. Red for more than two minutes:
   stop, check the Wi-Fi, start again.
8. At the end, stop only once the next person is live.

---

## Checklists

### Phase 0 — decisions, before anything is built

Tenzing's:

- [x] **The platform.** Self-hosted MediaMTX (26 September 2026).
- [ ] If self-hosted: **who owns the servers** during the thirty days, who
      the alerts go to, and is that billed?
- [ ] The price to quote: description and price together, one number.
      Claude does not estimate hours (`CLAUDE.md`, *Time*).
- [ ] The design choices in the brainstorm below.

Jonny's (one message, alongside `plans/meeting-with-jonny.md` §5):

- [ ] **The platform and its running cost**, with the comparison above.
      Any account or server is in his name, on his card.
- [ ] **The house kit** — IP camera (option A) or camera and encoder
      (option B); what he buys, and who sets it up.
- [ ] **One fixed camera for the house, never stopped at :55**
      (recommended): one key, the sitters change in front of it.
- [ ] **What shows on camera.** Recommended: the flame and the hands, not
      faces — the adoration-chapel rule. The house's location must never be
      identifiable from the frame.
- [ ] **Consent and safeguarding.** Written, withdrawable consent from
      everyone who goes on camera (Thai PDPA s.26: religious practice is
      sensitive data). A kill switch in the room. Minimum age 18 on the
      site. A solicitor before volunteer strangers are given keys (Phase 5),
      at the latest.
- [ ] **The rota**: a named sitter per hour, a captain per block, a
      substitute list — and who the captain calls when the stream drops.
- [ ] **"Someone is about to join"** — a line on the page during the
      handover (recommended), or a notification to people not on the site
      (needs permission; on iPhone only once saved to the home screen).
- [ ] **The price of this work**, agreed in writing, before Phase 2.

### Phase 1 — the pipeline, proven on this Mac (done, 26 September 2026)

Built on `dev`, uncommitted at the time of writing. MediaMTX 1.21.1 locally,
`npm run dev`, the real Supabase project, ffmpeg publishing a silent test
pattern. How to run it again: `infra/mediamtx/README.md`.

- [x] `stream_keys` table: slug, name, SHA-256 of the key, revoked, live
      state. RLS on, no policies, no grants to `anon` or `authenticated`
      (read back after applying). Applied to `qcwgquwjazhsettuemgt` with
      `db query`, on Tenzing's word.
- [x] `npm run live:key -- new | list | revoke` — the key is shown once and
      never stored.
- [x] `/api/live/auth` (MediaMTX's `authHTTPAddress`; its secret arrives
      as Basic auth, never in a logged URL), `/api/live/hook` (bearer
      secret), `/api/live` (public: who is live and the HLS address, never
      the name; five seconds at the edge, none in the browser). Pure rules
      in `lib/live.ts`, 12 tests in `tests/live.test.ts`.
- [x] `infra/mediamtx/mediamtx.yml` + `hook.sh`: only `live/<slug>` exists;
      publishing checked by us; reading public and never waits on Vercel;
      RTSP, WebRTC, MoQ, API and metrics off.
- [x] `components/LiveStream.tsx` (hls.js, muted, inline, no controls,
      reports playing/stalled) and a test page `/live-test` (404 on the production site; shown on the dev preview; 404 in the
      production build — checked).
- [x] **Refused:** a wrong key (401 from our route), no key (401), any other
      path (not configured).
- [x] **Accepted:** the right key over RTMP (key as `?key=`) and over SRT
      (key as the password in the streamid). The hook marked it live within
      a second; `/api/live` returned it; the page played it.
- [x] **Handover:** A live → B goes live → the site switches to B → A stops
      → B stays. The page followed without a reload.
- [x] **Revoke while live:** gone from `/api/live` within the five-second
      edge cache; the reconnect refused with 401. A publisher already
      connected keeps sending until they disconnect (MediaMTX's API is off);
      the site just stops showing them.
- [x] **Drop and return:** stream cut for 15 s — the page showed the stall
      within a second, "nobody is live" within 5, and was playing again 6 s
      after the stream came back. No reload.
- [x] **The server dies** (MediaMTX, hook and stream all killed): the site
      stopped showing it 72 s later, inside the 90 s limit.
- [x] Typecheck, 282 tests, `npm run build` pass.

**Found and fixed while proving it:**

1. **A hard kill of MediaMTX left `hook.sh` running**, reporting a dead stream
   as live for ever. The script now checks its parent every beat and reports
   offline when it's gone. (On a server, systemd's default kill mode also
   takes it down.)
2. **Browsers pause silent video in a background tab** and don't resume it.
   The player now resumes when the tab is visible again.
3. **Chrome now claims native HLS.** The player uses hls.js wherever it's
   supported, so a drop recovers the same way everywhere, and Safari's own
   HLS only on iPhones without MediaSource.

**Then a code review (read against MediaMTX 1.21.1's own source), and what
it changed** — every fix re-tested live the same way:

4. **A reconnect could blank a live stream for up to 30 s.** The old
   stream's `offline` and the new one's `online` race; if `offline` landed
   last it wiped the new stream. Every hook call now carries `since` (when
   that stream came online) and `offline` only clears a row still holding
   its own `since`. Tested: a stale `offline` leaves the stream live.
5. **The player could retry a broken stream forever, instantly** (e.g. a
   phone sending HEVC), and **flickered to "stalled" on every brief
   rebuffer**, and **never recovered on Safari's native path**. Now one
   recovery path for everything: eight seconds without frames is a stall;
   a stall unloads and reloads from scratch after 3 s, doubling to 30 s.
   Tested: a same-key reconnect (which restarts MediaMTX's segment numbers)
   plays again six seconds after the cut.
6. **Secrets were visible**: the auth secret in a URL (Vercel logs it), the
   hook secret in `curl`'s arguments (`ps` shows it). Now Basic auth and
   stdin.
7. **RTMPS as first documented would not start** (MediaMTX can't read
   Caddy's certificates); the README now copies them. `live:key` prints
   `rtmps://` for any real host and marks SRT as unencrypted.
8. `pickLive` went: the query now picks the newest stream itself.

**Learned, no change needed:** MediaMTX 1.21 tracks each HLS viewer with a
cookie, and falls back to a `?session=` in the playlist when the cookie is
refused (checked), so Safari's third-party cookie blocking doesn't break it.
That per-viewer URL is also why a CDN can't simply cache it — MediaMTX's
`hlsCDNSecret` is the setting to read if a CDN is ever put in front.

**Not proven here, and why:**

- A real phone app publishing (Moblin, Larix Premium): needs a phone, and a
  server a phone can reach.
- iPhone Safari playback, including Low Power Mode: needs a real iPhone.
- Anything over the internet: TLS, RTMPS, the Vercel routes being called by
  a remote server, Vercel preview protection. That is Phase 2.

### Phase 2 — a real server (`live-a`, up 27 September 2026)

**`live-a`**: Hetzner Cloud **CPX12** (1 vCPU, 2 GB, 40 GB, 20 TB traffic),
Europe, Ubuntu 26.04, `2.28.224.143`, **$14.09/month**, billed hourly. The
CX23 we meant to buy was sold out across the EU that day, so this is the
next size that was there. **Before launch, resize or replace it if the
tests call for it** (one 2.5 Mbps stream with one viewer ran at a load of
0.4). The account is in Tenzing's name, to move to Jonny's once he has
agreed. **Don't delete or rebuild it casually** — the IP is in the
hostname. SSH: `root@2.28.224.143` with `~/.ssh/meditatewithme_live`, on
Tenzing's Mac only. How it was built: `infra/mediamtx/README.md`.

- [x] Server made; SSH key; `ufw` lets in 22, 80, 443, 1936/tcp and
      8890/udp only — 1935 (plain RTMP) is closed to the internet.
- [x] Hostname `2-28-224-143.sslip.io` until the domain is pointed.
- [x] MediaMTX 1.21.1 pinned in `/opt/mediamtx`, under systemd, secrets in
      `/etc/mediamtx.env` (fresh ones, not the Mac's).
- [x] Caddy serving HLS on HTTPS; RTMPS on 1936 with Caddy's certificate,
      copied daily by `mediamtx-certs.timer` — verified valid from outside.
- [x] Vercel env for `dev`: `LIVE_AUTH_SECRET`, `LIVE_HOOK_SECRET`,
      `LIVE_HLS_BASE`. Previews are behind Vercel's login, so the server
      calls `dev` through a *Protection Bypass for Automation* (made with
      Tenzing's OK). Production's env is not set yet — it comes with 2b.
- [x] Checked from this Mac against the server and the dev preview:
      wrong key and no key refused (401 from our route, over RTMPS); the
      right key publishes; `/api/live` names it within 12 s; HLS playlist
      and segments over HTTPS (a 1.3 MB segment in 0.9 s); hls.js plays
      it at 1280×720 on `/live-test`; ending the stream clears
      `/api/live` within 3 s.
- [x] **Moblin on Tenzing's iPhone, mobile data, 27 September:** publishes
      over RTMPS. Moblin puts a separate stream key into the stream *name*,
      `?` and all, which MediaMTX refuses ("invalid path name") — the whole
      address has to go in Moblin's URL box with its key box empty;
      `npm run live:key` now prints that line. Its key frame interval must
      be 2 s (MediaMTX warned "segment duration changed from 2s to 4s").
      Two airplane-mode drops: the server saw the phone back 32 s and 17 s
      later (a new network address the second time); the Mac showed
      "nobody live" at once, then the picture about 10 s after the phone.
- [x] **Latency grew to ~45 s after the drops.** hls.js defaults add a
      second per stall with no ceiling; now `liveMaxLatencyDurationCount:
      6`, and Safari's own player is moved to live on returning to the tab.
      Retest.
- [ ] Android app, OBS; playback on an iPhone (and in Low Power Mode) and
      on Android. From Thailand, for the Asia route.
- [ ] Measure a real candle's bitrate at 720p and 480p.
- [x] Unattended OS updates (on by default, checked).
- [ ] Uptime check on `https://2-28-224-143.sslip.io/` that messages a
      person.
- [ ] **The second server** at the other provider, the player trying A then
      B, and a publisher sending to both. After one server is proven.

### Phase 2b — in the site (only after Jonny has agreed the price)

- [ ] The *meditate with others* door, and its "nobody is on camera" state.
- [ ] The sitting renders `<LiveStream>`, falls back to the earth on stall,
      comes back when it plays; `play()` on the bowl strike (Low Power Mode).
- [ ] Hold the last picture ~20 s when a collaborator drops before falling
      back to the earth, so a blip doesn't flash the earth in (seen on the
      phone test: the site goes "nobody live" the moment the phone drops).
- [ ] 480p cap on phones.
- [x] **One collaborator per hour** (27 September, Tenzing's rule): the
      first live in an empty hour holds it; anyone else live waits off the
      air (and can watch themselves at `/live-test?slug=`); in the last 5
      minutes with someone waiting, or once the holder leaves, viewers get
      the between answer (`next`, the top of the hour); on the hour the
      longest-waiting takes over, so two live together alternate. `onAir`
      in `lib/live.ts`, 13 tests; claims in `live_hours`. Grace is
      `GRACE_MS` — 5 minutes; Tenzing would ideally like 2, but 5 gives the
      next collaborator time to get ready.
- [ ] The between screen itself: "the next session starts at the top of
      the hour", shown in the grace minutes and when the holder leaves.
- [ ] Dev demo `/?demo=live` and `/?demo=live&dropped`; `/live-test` then
      deleted.
- [ ] Privacy page: people on camera, where video is served from.
- [ ] `PRODUCT.md`, `ARCHITECTURE.md` §9 and `DESIGN.md` in the same
      commits.

### Phase 3 — the house, and a rehearsal

- [ ] Kit bought, set up, wired (no Wi-Fi on the encoder path), on the UPS.
- [ ] Keys issued privately; the volunteer guide and QR codes.
- [ ] The rota, the captains and the substitute list written down; the kill
      switch shown to everyone in the house.
- [ ] The empty state seen: "the candle is being passed" or "nobody is on
      camera", never a spinner.
- [ ] **A 48-hour soak test from the house** before 9 November: pull the
      fibre once, the mains once, rehearse a handover at :55, and confirm
      the site falls back and recovers each time.
- [ ] Ask Tenzing to merge `dev` → `main`.

### Phase 4 — 9 November, and the thirty days

- [ ] First live hour watched on a phone and a laptop.
- [ ] Extra watch on 24–25 November (Loy Krathong).
- [ ] Weekly: server traffic and health.
- [ ] Record how many chose *meditate with others* — only if Jonny has named
      a data controller by then.

### Phase 5 — volunteer candlelighters (its own plan, later)

Any number of people, anywhere, given keys: interviewing (Lilian), a rota,
safeguarding for strangers broadcasting from their homes, and whether the
server needs a CDN in front. Nothing gets built before the house's month
shows it's wanted.

---

## Brainstorm — open, for Tenzing

1. **Instead of the earth, or with it?** One idea: the video fills the
   screen, and the other candles sit as a thin band of light along the
   bottom, so you see the person *and* the people.
2. **Does *meditate with others* have a timer?** Simplest: the same time
   question, with *until the bell* as its default.
3. **Is it the default door** during the house's month?
4. **The first frame.** A live player takes a second or two to start. Show a
   still of the candle first and crossfade, so the arrival never waits on the
   network (`40fc584`).
5. **Name on screen?** A collaborator's first name in one quiet line
   ("Sitting with Anna, in Chiang Mai"), or nothing. It is safer as nothing,
   and warmer as a name.

---

## Sources

Round two: getstream.io/video/pricing; developers.cloudflare.com/realtime/sfu/pricing;
livekit.com/pricing; red5.net/red5-cloud-pricing; wmspanel.com/prices;
softvelum.com/larix/premium (the free app's 30-minute limit);
github.com/eerimoq/moblin; ovenmedia.com admission webhooks; ossrs.io HTTP
callbacks; owncast.online webhooks; bunny.net/docs/changelog (Stream Live
preview); developers.cloudflare.com/r2/pricing; Cloudflare Application
Services and Developer Platform terms; camstreamer.com (Adorecast);
ncregister.com (Niepokalanów); bonnevauxwccm.org (24-hour meditation);
globalfamily24-7prayer.org; aws.amazon.com/blogs/media (explore.org on
MediaLive); catholicbishops.ie parish webcam guidelines; mcn.live GDPR
guidelines; pdpathailand.com article 26; resi.io/pricing;
boxcast.com/pricing. Vimeo: vimeo.com/upgrade-plan; help.vimeo.com articles 12426923921681 (live
FAQ), 29225841451537 (extended streaming), 12427830091921 (Live API),
12426275404305 (bandwidth), 12426260232977 (player parameters),
35052933757073 (protocols); developer.vimeo.com/api/live/events. Cloudflare:
developers.cloudflare.com/stream/pricing, /stream-live/start-stream-live,
service-specific terms (CDN video clause). Mux: mux.com/docs/pricing/video,
live-streaming FAQs. AWS: aws.amazon.com/ivs/pricing. MediaMTX:
mediamtx.org/docs (authentication, control API, hooks, HLS). OVH, Hetzner,
DigitalOcean and Bunny pricing pages. YouTube: support.google.com/youtube
answers 7385599, 6247592; developers.google.com/youtube/player_parameters.
WebKit: webkit.org/blog/6784, bug 219889. Larix: softvelum.com/larix (FAQ,
Grove). Starlink in Thailand: nationthailand.com/news/general/40069941.
Flame flicker: Nature Sci Rep 2018 (s41598-018-36754-w).
