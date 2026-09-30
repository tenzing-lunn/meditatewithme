# Connected emails — what is owed

Built on `dev`, 30 September 2026 (`context/ARCHITECTURE.md` §17, *More than
one email*). An account can hold several addresses; each signs in to it.
Tenzing chose this over a plain change of address, after a friend's change
failed because the new address already had its own account.

Owed before it works:

- [x] **A Resend API key** — set 30 September 2026 for Production and the `dev` preview (the preview was redeployed to pick it up; `.env.local` is Tenzing's to add). Resend → API Keys → create one with *Sending
      access* for `meditatewithme.online`. Add it as `RESEND_API_KEY` in Vercel
      for the `dev` preview (and Production when it is merged), and in
      `.env.local`. Without it, *Connect another email* says *not switched on
      yet*; nothing else changes.
- [ ] **One real run on the preview**, by Tenzing, with a non-Gmail second inbox (Gmail cannot be connected): connect a second address,
      sign out, sign in with it, remove the first, sign in again with the
      second. Then check `account_emails` is empty and `auth.users.email` is
      the second address.
- [x] Gmail signs in through Google only, so a connected address cannot be
      a Gmail one. Left open: a Google Workspace address on its own domain.

Then `git mv` this to `docs/`.
