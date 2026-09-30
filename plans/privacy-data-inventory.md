# What the site stores

The factual half of the privacy notice, written from the schema rather than
from memory. Step 08 turns this into the notice itself.

**This is deliberately not the privacy notice.** The notice needs a named data
controller and a minimum-age decision, and both are still waiting on Jonny —
see `plans/launch-readiness.md`. What was blocking it was never the technical
detail, which is below and complete. Everything marked `[CONTROLLER]` is the
one answer that is missing.

Written now because the globe added the first thing this site has ever stored
about *where* somebody is, and the moment to write that down is the moment it is
added, not the week of launch.

---

## The whole inventory

Eight things are stored anywhere, and five of them only exist if you make an
account.

| What | Where | Identifies you? | Kept for |
|---|---|---|---|
| Anonymous browser id | `heartbeats`, and your own browser | No — a random id, per browser | 2 days |
| Approximate area | `heartbeats` | No — about 111km across | 2 days |
| Your settings | Your browser; `preferences` if you sign in | Only if you sign in | Until you change or delete them |
| Your sittings | Your browser; `sittings` if you sign in | Only if you sign in | Until you delete them |
| Your email address | `auth.users` | **Yes** | Until you delete the account |
| The name you gave | `auth.users` (`user_metadata.name`) | **Yes, if you gave a real one** | Until you delete the account |
| Whether you want email when the app is ready, and news | `profiles.email_updates` and `profiles.email_updates_at` (when you answered), if you sign in and tick it | Consent record for marketing email — needs an unsubscribe route before anything is sent | Until you change it or delete the account |
| Where you said you are from, and whether you share it | Your browser (`mwm.profile`); `profiles.origin` and `profiles.share_label` if you sign in | **Yes, if you typed a real place** | Until you change or delete them |
| "Name from Origin", shown to others | `heartbeats.label`, only while you sit with others with the switch on | **Yes, as much as the two above** | 2 days, with the row |

**The last two rows are from 14 September 2026.** They are the first thing
the site has ever shown one stranger about another. Both are opt-in twice
over: nothing is typed unless the person types it, and nothing is sent unless
the switch under the origin question is on. `lib/label.ts` cleans and caps
both on the way in, and the heartbeat route cleans them again. The
suggestion the origin question makes (`/api/origin`, from
`x-vercel-ip-city` and `x-vercel-ip-country`) is never stored.

**The email and name rows were the only directly identifying data the site
held until 14 September.** The email address was always there — an account has always been an
address — but it was never written down here, and the name did not exist until
the account flow started asking for it. Whatever the notice ends up saying about
them, it has to say that the name is optional in substance: nothing checks it,
nothing but the greeting on Home reads it (and, since 14 September, the sentence
on the earth for people who chose to be seen), and the site works entirely
without an account.

`profiles.display_name` exists in the schema and is still unused — the name
lives only in `auth.users`. If anything server-side ever needs it, that column is
where it goes, and this table gains a row.

There is **no third-party analytics, no advertising, no tracking pixel and no
cookies at all** — the sign-in session lives in localStorage (`persistSession`
in `lib/supabase.ts`), not in a cookie. That is what keeps the cookie banner
question closed, and it is worth saying plainly in the notice rather than
leaving somebody to infer it.

---

## Draft copy

**Rendered as `app/privacy/page.tsx` on 8 September 2026**, brought up to
date with the name and origin on 14 September, and corrected on 22 September
to say there are no cookies at all — unlinked and `noindex` until the two
placeholders are filled. The page and this draft must say the same
thing; change both. Two lines were corrected the day the page
was built: an account now also holds the optional name, and sign-in is a code
or a link, not only a link.

Written to be dropped into the notice with the placeholders filled. Plain
language on purpose — a meditation site that explains itself in the register of
a data-processing agreement has said something about itself.

### Where you are

> When you open the site, our server works out roughly where you are from your
> internet connection, so the earth can show a light for each part of the world
> someone is sitting in.
>
> It is deliberately rough. Before anything is saved, your position is rounded
> to a grid square about 111 kilometres across, and only the square is stored —
> never a more precise location. Everyone in a large town or city falls in the
> same square, and often several towns do. We do not store your town, your city
> or your country by name.
>
> We never ask your device for your location and we do not use GPS. You will
> never see a location permission prompt from this site. The square is deleted
> with the rest of the session record after two days.
>
> When the site asks where you are sitting, it suggests a town and a country
> worked out from the same connection, so you can answer with a nod. The
> suggestion is shown to you and to nobody else, and it is not saved. Only what
> you type and confirm is kept, and the next section says where.

### Your name and where you are from

> Both are optional. A first name and a place, as you typed them, are saved on
> your own device, and in your profile if you have an account, so they follow
> you between your phone and your computer.
>
> They are shown to other people only if you turn on the switch under the
> question, and then only while you are sitting with others: your browser adds
> them to the record that says it is there, and the earth on other people's
> screens says "Ana from Lisbon is meditating with you". Turn the switch off, or
> finish sitting, and they stop being sent; the copy in that record is deleted
> with it after two days. You can change either answer, or the switch, from the
> origin question or from your account.

### Being counted

> While the site is open in front of you, your browser tells us it is there
> every thirty seconds, so the site can say how many people are sitting. It
> sends a random identifier that is created by your browser, belongs only to
> that browser, and is not connected to your name, your email or any account.
>
> It stops the moment you switch to another tab, and the whole record is deleted
> after two days.

### Your practice and settings

> Your sittings and your settings are saved on your own device, and they work
> whether or not you have an account. You do not need to sign in to keep a
> record of your practice.
>
> If you do create an account, they are also saved to our database so that they
> follow you between your phone and your computer. An account stores your email
> address and, if you typed one, the name you gave. Nothing checks the name, and
> nothing reads it except the greeting on your own home page and, if you chose
> to be seen, the sentence described above; you can leave it blank.

### Signing in

> We sign you in with a code, or a link, sent to your email address. There is
> no password, so there is nothing for us to store and nothing for you to reuse
> from somewhere else. Your address is used to send you that email and for
> nothing else — no newsletter, and we do not pass it to anybody.

### Who we are, and asking us to delete it

> `[CONTROLLER]` is responsible for the information described above. To ask what
> is held about you, or to have it deleted, write to `[CONTACT EMAIL]`.
>
> Most of what is here deletes itself: the session and location records go after
> two days without anybody doing anything. Deleting your account removes your
> settings and your practice from our database; the copy on your own device is
> yours and stays until you clear it.

---

## Notes for whoever writes the notice

- **Do not describe the location as a "city".** It is coarser than a city and
  saying "city" would overstate what is held, in the direction that matters.
  `GRID_DEGREES` in `lib/geo.ts` is the number; if it ever changes, this copy
  changes with it.
- **`x-vercel-ip-city` and `x-vercel-ip-country` are read by one route and
  stored by none.** `/api/origin` returns them to the browser that asked, as
  a suggestion for the origin question, uncached and unlogged. Nothing writes
  them: the heartbeat route still derives only the grid square. A city name
  identifies somebody in a small one far more sharply than a grid square does,
  which is why the person confirms or corrects it before it is kept anywhere.
- **The two-day figure is real again**, not aspirational: `prune_heartbeats()`
  deletes `hour_start < now() - interval '2 days'`, and `pg_cron` runs it at
  seven minutes past every hour, so the honest worst case is two days and an
  hour. If that job is ever turned off, this sentence becomes untrue and the
  notice is wrong rather than merely stale.

  **It was untrue for the first two days of this document's life.** The job had
  never been turned *on* — the function had sat in the schema since
  `0001_init.sql` with nothing calling it, no `pg_cron` and no `vercel.json`,
  and on 3 September 2026 the table still held rows from 26 August, cells
  included. It was scheduled and the backlog deleted the same day
  (`supabase/migrations/20260903193000_schedule_prune_heartbeats.sql`). Kept
  here rather than quietly corrected, because the failure is the lesson: a
  retention promise is worth exactly as much as the thing enforcing it, and
  "the function exists" is not that thing. Before the notice ships, check the
  live project rather than this paragraph:

  ```sql
  select jobname, schedule, active from cron.job;
  select max(now() - hour_start) from public.heartbeats;
  ```
- **`/world` used to say the substance of this on the page**, under the map,
  so that somebody looking at where people are did not have to open a legal
  document to find out how precisely they are on it. That route was deleted on
  22 September 2026, so the notice is now the only place the precision is
  stated; keep it in agreement with `GRID_DEGREES`.
- The age policy and terms are a separate question and are not covered here.
