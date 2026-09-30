# The account corner

Agreed with Tenzing, 30 September 2026. Replaces the signed-in Home.

## What each visitor sees

Everyone lands on the pond (the arrival sentence and Begin). Guest and
signed-out are the same thing: no account, everything in this browser.
The only difference is the top-right corner.

**Signed out.** A plain *Sign in* word, no menu. It opens the panel on
sign-in: *Continue with Google*, or an email code. At its foot, *Don't have
an account? Create one* turns the same panel into *Create account* and asks
the name first. *Already have one? Sign in* goes back. Both are one flow
underneath — Google and the email code create the account the first time.

**Signed in.** Their name where *Sign in* was (the email's first part when
there is no name). Pressing it: the name fades and three words slide out of
where it stood — **Account · Settings · Layout**. Pressing elsewhere, Escape,
or the name's place again slides the words back in and brings the name back.

- **Account** — name (editable), email (editable; Supabase confirms the new
  address by email), *Your practice* (the log), *Sign out*, *Delete account*.
- **Settings** — general preferences. Now: privacy (where you are from, and
  whether your name and place are shown while you sit with others). Next,
  to decide later: animations, sound, adding your own sounds.
- **Layout** — themes, coming soon. A page saying so for now.

## What goes

`Home.tsx` and what only it used (the doors, the earth scene, the settings
drawer, the dawn/dusk toggle), and the unused `BowlScreen`, `SoundScreen`,
`TimeScreen`. A sitting's *Done* returns to the pond for everyone.

## Still to verify

Google sign-in on a returning session (reload, browser restart), sign-out,
and the email code fallback, on desktop and a phone width.
