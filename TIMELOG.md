# Time log — Meditate With Me v1

Against the agreed **£25/hr, capped at 55 hours**. Internal. Not for the client
as-is, but it is what any invoice or "where are we against the 55?" answer is
built from.

Lives at the repo root rather than in `plans/`, `docs/` or `context/` for the
same reason `README.md` does: it is not a document that passes through the
plan → archive lifecycle. It is a running record and it is never finished.

---

## What counts as an hour

**Engaged time.** Hours actually worked: directing agents, reading and reviewing
diffs, testing, deciding, writing client documents, debugging.

Not counted: agent runtime nobody was watching, elapsed time between commits,
or thinking about the project in the shower. A five-hour gap between two commits
is not five hours; it is a lunch, a lecture, or a nap.

This definition is the honest one and it is also the strict one — it will
usually produce a smaller number than the calendar suggests. That is the point.
It is the only definition that can be said out loud to Jonny without
qualification, and the first invoice fixes it for the rest of the project.

**Log same day.** Engaged time is unreconstructable after about 48 hours. A
blank row is better than an invented one; a row you fill in a week later is an
invented one wearing a date.

---

## How it works — capture is automatic, confirmation is not

Session hooks in `.claude/hooks/` stamp the start and end of every Claude
session in this repo and append a row to `.timelog/pending.tsv` (gitignored,
per-machine) with the date, the open-to-close wall-clock, and any commits that
landed in the window. Nothing to remember and nothing to run.

**Wall-clock is not engaged time.** A session open for three hours while an
agent ran and you made dinner is not three hours of work. So the captured
number is a *ceiling*, and it never reaches this file on its own.

    npm run timelog              what has been captured and not yet confirmed
    npm run timelog -- 45 20     confirm in order, in minutes, "-" to skip

The script refuses a figure larger than the session was open, appends the
confirmed rows here, and clears the pending file. Describing what landed is
still yours — the commits are listed, the sentence is not.

| | Who |
|---|---|
| Session start/end, elapsed, commits | Hooks, automatically |
| **The engaged figure** | **Tenzing, and only Tenzing** |
| One line on what landed | Tenzing, or an agent that did the work |

No agent may run `npm run timelog` with a number. An agent sees a session, not
a working day, and has no idea whether anyone was watching it run. Any hours
figure an agent produces is fabricated, and a fabricated hour on an hourly
invoice is the single worst error available on this project.

**Confirm at the end of the day, not the end of the week.** The capture keeps
its ceiling indefinitely; your memory of what fraction of it was real does not.

---

## Reconstruction — 24 to 29 August 2026

Seeded from `git log` author dates on 30 August 2026. **Every hours cell is
unfilled and must stay that way until Tenzing fills it from memory or notes.**
The commit clusters below are candidate working blocks, not measured time — a
block is a run of commits with no long gap, which is evidence that work happened
and no evidence at all of how long it took.

Two warnings on the reconstruction:

- Author dates are out of order on 28 August (`9bb2506` and `d985f2a` stamp
  22:06–22:08 but sit earlier in log order than `ddf1acb` at 18:20), so
  something was rebased or cherry-picked. Treat that day's blocks as especially
  approximate.
- Several commits landed written work — proposals, specs, the blockers list —
  that took real time before the commit that recorded them. Commit timestamps
  understate document work badly.

| Date | Block | Engaged | What landed | Commits |
|---|---|---|---|---|
| 24 Aug | 12:36–14:33 | — | Repo scaffold, `plans`/`docs` split, `context/`, session hook, app shell + holding page, heartbeat grant fix | `23b0190` `e3517a9` `b7d9512` `99958d1` `d612bce` `03fe9ed` |
| 26 Aug | 11:12 | — | Client blockers list | `76d5b9b` |
| 26 Aug | 15:13–17:52 | — | First deploy + why, room (step 03), timer/bell/setup (step 04), move to `dev` and room to root | `5f3fd51` `11ba42d` `defa583` `1a6d0cf` |
| 27 Aug | 09:23 | — | The candle burns down; nothing is gated | `8821de1` |
| 27 Aug | 16:33–16:58 | — | AA contrast + `contrast.mjs`, `resolveSession` wired in, optional accounts and synced prefs (step 07) | `96bc5c1` `ab32d94` `b086219` |
| 28 Aug | 13:40 | — | Practice log | `75fb359` |
| 28 Aug | 17:57–19:08 | — | Timer from 1 minute + DB agreement, presence at start of sitting, change-order readiness, shared room and ending, auth launch readiness | `e657ec1` `ddf1acb` `56d9681` `b60b335` `7d82b2a` |
| 28 Aug | 22:06–22:08 | — | Sound mixer on self-generating beds (step 05), presence plan + the message asking for it | `d985f2a` `9bb2506` |
| 29 Aug | 00:00–00:09 | — | One question at a time; candle lit properly; candle made to look like a candle | `580c078` `bf217d0` |
| 29 Aug | 09:29 | — | Turbopack workspace root | `1da89f6` |
| 30 Aug | — | — | UI/UX audit, `plans/room-polish.md` | uncommitted |
| | | **— / 55** | | |

---

## Running total

Fill the total only when every row above has a number. A partial total that gets
quoted to a client is worse than no total.

**Unbilled, and deliberately:** anything §4 of `plans/room-polish.md` turns into
a rework of already-delivered presence work. Logged as a row with hours, marked
`unbilled`, so the effort is visible internally without reaching an invoice.
