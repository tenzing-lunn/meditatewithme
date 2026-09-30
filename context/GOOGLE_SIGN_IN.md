# Google sign-in setup

App code supports Google OAuth through the existing Supabase browser client.
Sessions persist and refresh in this browser; another browser, Chrome profile,
or device needs its own sign-in. Google can reuse its existing login when the
visitor chooses Continue with Google. No offline Google access is requested.

**Set up on 30 September 2026, and live.** Google Cloud project *Meditate With
Me* (`meditate-with-me-510220`), owned by tenzinglunn@gmail.com, not Jonny —
move it to him when the site is handed over. Consent screen External and *In
production*; home, privacy and terms point at www.meditatewithme.online;
authorized domains `meditatewithme.online`, `meditatewithme.vercel.app` and
the Supabase project's. No logo, on purpose: a logo requires Google's brand
verification. Web client *Meditate With Me web*, client ID
`994517271276-udtt61te3hchhuuq3r4hdfk02d9n5jok.apps.googleusercontent.com`;
its secret lives only in Supabase. Supabase's Google provider is enabled, and
`http://127.0.0.1:3000/**` was added to the redirect allow-list beside
localhost, production, previews and the custom domain. Google's chooser says
*to continue to qcwgquwjazhsettuemgt.supabase.co* until a Supabase custom
auth domain (a paid add-on) is set up.

The steps, as they were followed:

1. In https://console.cloud.google.com/auth/overview, choose or create a project
   owned by the app owner's Google account. Configure branding, audience, and
   the basic openid, email, and profile scopes. Use the app's real public URL.
2. Create a Web application OAuth client. Its authorized redirect URI is
   `https://qcwgquwjazhsettuemgt.supabase.co/auth/v1/callback`.
3. Set the client ID and secret in the Google provider at
   https://supabase.com/dashboard/project/qcwgquwjazhsettuemgt/auth/providers
   and enable the provider. Keep the secret in Supabase, never in this repo or
   a NEXT_PUBLIC environment variable.
4. In Supabase Auth URL Configuration, allow the deployed app's root URL and
   `http://localhost:3000/` for local verification. The app returns to the
   current origin's root; the existing implicit-flow client consumes the
   session and opens Home.
5. Verify new and existing accounts, reload and browser restart, sign-out,
   cancelled Google consent, and the email alternative on desktop and mobile.
   A Google project in testing mode requires adding test users; publish the
   audience before offering this to everyone.

Reference: https://supabase.com/docs/guides/auth/social-login/auth-google
