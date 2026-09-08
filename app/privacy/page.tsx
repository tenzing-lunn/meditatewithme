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
    <Document title="What this site stores" changed="8 September 2026">
      <p className="mt-6">
        Six things are stored anywhere, and four of them only exist if you make
        an account. This page says what each one is, where it goes, how long it
        stays, and how to have it removed.
      </p>
      <p className="mt-4">
        There is no third-party analytics, no advertising, no tracking pixel,
        and no cookie beyond the one your own sign-in uses.
      </p>

      <Section title="Where you are">
        <p>
          When you open the room, our server works out roughly where you are
          from your internet connection, so the globe can show a light for each
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
      </Section>

      <Section title="Being counted in the room">
        <p>
          While the room is open in front of you, your browser tells us it is
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
          Nothing checks the name and nothing reads it except the greeting on
          your own home page; you can leave it blank.
        </p>
      </Section>

      <Section title="Signing in">
        <p>
          We sign you in with a code, or a link, sent to your email address.
          There is no password, so there is nothing for us to store and nothing
          for you to reuse from somewhere else. Your address is used to send
          you that email and for nothing else — no newsletter, and we do not
          pass it to anybody.
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
          account — <em>Your account</em>, at the foot of your home page —
          removes your settings and your practice from our database; the copy
          on your own device is yours and stays until you clear it.
        </p>
      </Section>
    </Document>
  );
}
