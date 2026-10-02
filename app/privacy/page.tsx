import type { Metadata } from 'next';

import { Document, Section, Unfilled } from '@/components/Document';

/**
 * The privacy notice.
 *
 * WHAT IT IS, AND WHAT IT IS NOT YET
 * The factual half of this was written from the schema in
 * `plans/privacy-data-inventory.md`, and everything here is lifted from that
 * draft — the inventory is the source, this page is its rendering, and the
 * two must not drift. Two things are still missing and they are not ours to
 * decide: who is responsible for the data, and where to write to them. Both
 * wait on Jonny's legal-entity answer (`plans/launch-readiness.md`). Until
 * they arrive the page renders the gaps as gaps — `<Unfilled>` — rather than
 * papering over them with the site's name, because a notice that names the
 * wrong controller is worse than one that says it does not know yet.
 *
 * SO IT IS NOT LINKED, AND NOT INDEXED
 * Nothing on the site points here and crawlers are told to leave it alone.
 * When the two names are in: fill them, delete `<Unfilled>`, drop the
 * `robots` line, and link it from the foot of Home and the ending. That is
 * the whole launch step for this page. The terms and the age policy are
 * `app/terms/page.tsx`, in the same state.
 */
export const metadata: Metadata = {
  title: 'What this site stores — Meditate With Me',
  description:
    'What Meditate With Me stores about you, for how long, and how to have it deleted.',
  // Until the controller is named. Remove with the placeholders.
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <Document title="What this site stores" changed="2 October 2026">
      <p className="mt-6">
        A few things are stored, and most of them only exist if you make an
        account. This page says what each one is, where it goes, how long it
        stays, and how to have it removed.
      </p>
      <p className="mt-4">
        There is no third-party analytics, no advertising, no tracking pixel,
        and no cookies: even your sign-in is kept in your browser's own
        storage on this device, not in a cookie.
      </p>

      <Section title="Where you are">
        <p>
          When you open the site, our server works out roughly where you are
          from your internet connection, so the earth can show a light for each
          part of the world someone is sitting in.
        </p>
        <p>
          It is deliberately rough. Before anything is saved, your position is
          rounded to a grid square about 111 kilometres across, and only the
          square is stored — never a more precise location. Everyone in a large
          town or city falls in the same square, and often several towns do. We
          do not store your town, your city or your country by name.
        </p>
        <p>
          We never ask your device for your location and we do not use GPS. You
          will never see a location permission prompt from this site. The
          square is deleted with the rest of the session record after two days.
        </p>
        <p>
          When the site asks where you are sitting, it suggests a town and a
          country worked out from the same connection, so you can answer with
          a nod. The suggestion is shown to you and to nobody else, and it is
          not saved. Only what you type and confirm is kept, and the next
          section says where.
        </p>
        <p>
          As you type, the matching places are found by your own browser, from
          a list of towns it downloads from this site, so the letters you type
          are not sent to us or to anyone else. The list comes from{' '}
          <a href="https://www.geonames.org/" className="underline underline-offset-4">
            GeoNames
          </a>
          , used under the Creative Commons Attribution 4.0 licence.
        </p>
      </Section>

      <Section title="Your name and where you are from">
        <p>
          Both are optional. A first name and a place, as you typed them, are
          saved on your own device, and in your profile if you have an account,
          so they follow you between your phone and your computer.
        </p>
        <p>
          They are shown to other people only if you turn on the switch under
          the question, and then only while you are sitting with others: your
          browser adds them to the record that says it is there, and the earth
          on other people&rsquo;s screens says &ldquo;Ana from Lisbon is
          meditating with you&rdquo;. Turn the switch off, or finish sitting,
          and they stop being sent; the copy in that record is deleted with it
          after two days. You can change either answer, or the switch, from the
          origin question or from your account.
        </p>
      </Section>

      <Section title="Being counted">
        <p>
          While the site is open in front of you, your browser tells us it is
          there every thirty seconds, so the site can say how many people are
          sitting. It sends a random identifier that is created by your
          browser, belongs only to that browser, and is not connected to your
          name, your email or any account.
        </p>
        <p>
          It stops the moment you switch to another tab, and the whole record
          is deleted after two days.
        </p>
      </Section>

      <Section title="Your practice and settings">
        <p>
          Your sittings and your settings are saved on your own device, and
          they work whether or not you have an account. You do not need to sign
          in to keep a record of your practice.
        </p>
        <p>
          If you do create an account, they are also saved to our database so
          that they follow you between your phone and your computer. An account
          stores your email address and, if you typed one, the name you gave.
          Nothing checks the name, and nothing reads it except the greeting on
          your own home page and, if you chose to be seen, the sentence
          described above; you can leave it blank.
        </p>
      </Section>

      <Section title="Signing in">
        <p>
          You sign in with Google, or with a code sent to your email address.
          There is no password, so there is nothing for us to store and nothing
          for you to reuse from somewhere else. If you use Google, Google tells
          us your email address and the name and picture on your Google
          account; they are kept with your account, and only the address is
          used. A Gmail address always signs in through Google.
        </p>
        <p>
          You can connect more than one email address to your account, and
          sign in with any of them. Each is proved by a six-digit code that we
          send through our email provider, Resend; only a scrambled copy of the
          code is kept, for ten minutes. Addresses stay until you remove them
          or delete the account.
        </p>
        <p>
          Your address is used to sign you in. When you sign in there is a
          switch, off unless you turn it on, asking whether we may email you
          when the app is ready and now and then with news of the site. We
          keep your answer and when you gave it; nothing has been sent to
          anybody yet, and every email that is will let you stop them. We do
          not pass your address to anybody.
        </p>
      </Section>

      <Section title="Watching someone live">
        <p>
          When you sit with a guide, the video of whoever is guiding comes
          from our own video server. Like any website, it sees your internet
          address in order to send you the picture. It sees nothing else
          about you: not your name, your email or your account.
        </p>
        <p>
          The video only goes one way. Nobody can see or hear you, and the
          site never asks for your camera or microphone. Nothing is recorded:
          the picture is passed on as it arrives and is not kept.
        </p>
      </Section>

      <Section title="Who we are, and asking us to delete it">
        <p>
          <Unfilled>[CONTROLLER]</Unfilled> is responsible for the information
          described above. To ask what is held about you, or to have it
          deleted, write to <Unfilled>[CONTACT EMAIL]</Unfilled>.
        </p>
        <p>
          Most of what is here deletes itself: the session and location records
          go after two days without anybody doing anything. Deleting your
          account — <em>Account</em>, in the menu on your home page —
          removes your settings and your practice from our database; the copy
          on your own device is yours and stays until you clear it.
        </p>
      </Section>
    </Document>
  );
}
