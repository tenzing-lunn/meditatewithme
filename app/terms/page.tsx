import type { Metadata } from 'next';

import { Document, Section, Unfilled } from '@/components/Document';

/**
 * The terms, with the age policy inside them.
 *
 * The proposal owed Jonny three documents: a privacy notice, terms of use and
 * an age policy. The notice is `app/privacy/page.tsx`. The other two are this
 * page — the age policy is one section of it, because a rule about who may
 * use the site belongs with the other rules about using it, not on a page of
 * its own that nobody would find.
 *
 * FOUR GAPS, AND WHY THEY ARE GAPS
 * Who is behind the site, where to write to them, the minimum age, and which
 * country's law applies are all Jonny's to decide and none of them is
 * decided (`plans/launch-readiness.md`). The proposal recommended eighteen
 * for the age, and the domain, the currency and the client all point at
 * England and Wales for the law — but a recommendation is not a decision,
 * and a page that guesses at either is a page that is wrong with confidence.
 * They render as `<Unfilled>` until he answers.
 *
 * Unlinked and unindexed for the same reason as the notice, and with the
 * same launch step: fill the four, delete `<Unfilled>`, drop the `robots`
 * line, link it beside the notice.
 *
 * THE REGISTER
 * Plain language throughout, and short. Terms written in the voice of a
 * data-processing agreement would say something about the site that the
 * rest of it works hard not to say. Everything here is a real rule, but none
 * of it is a threat.
 */
export const metadata: Metadata = {
  title: 'Terms — Meditate With Me',
  description:
    'The terms for using Meditate With Me, including who may use it and what it does not promise.',
  // Until the four gaps are filled. Remove with the placeholders.
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <Document title="Terms" changed="8 September 2026">
      <p className="mt-6">
        The short version: this is a free place to sit for a while. Use it
        kindly, look after yourself, and know that it comes with no promises.
        The longer version is below, and it is not much longer.
      </p>

      <Section title="What this is">
        <p>
          A candle is lit at the top of every hour, and everyone on the site is
          looking at the same one. You choose how long to sit, or you sit until
          the bell and finish with everyone else who did. It costs nothing.
        </p>
        <p>
          We hope it is always there and cannot promise that it will be. It may
          be down, it may change, and one day it may stop. Your own record of
          your practice is saved on your device, so it is yours whatever
          happens here.
        </p>
      </Section>

      <Section title="Age">
        <p>
          You must be at least <Unfilled>[MINIMUM AGE]</Unfilled> to use this
          site or to make an account on it. If you are younger than that,
          please do not. If we learn that an account belongs to somebody
          younger, we will delete it.
        </p>
      </Section>

      <Section title="Looking after yourself">
        <p>
          Meditation is not treatment, and nothing on this site is medical
          advice. It is not a substitute for a doctor, a therapist or anybody
          else who is looking after you.
        </p>
        <p>
          Sitting quietly with your own thoughts is usually calming and
          sometimes is not. If it becomes distressing, stop, and talk to
          someone. If you are in danger, contact the emergency services where
          you are.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          You do not need one. If you make one, it is tied to your email
          address and that address is the only way into it, so keep access to
          that inbox. What is done from your sign-in is yours.
        </p>
        <p>
          You can delete your account at any time — <em>Your account</em>, at
          the foot of your home page — and it goes at once. We may delete an
          account that is being used to harm the site or the people on it.
        </p>
      </Section>

      <Section title="Using it kindly">
        <p>
          Everyone here is being counted, roughly, so that the room can say how
          many people are in it. Do not send it false signals, do not try to
          work out who anybody else is, and do not try to break it. That is
          the whole list.
        </p>
      </Section>

      <Section title="What is ours, and what is yours">
        <p>
          The site, its words, its picture and its sounds belong to{' '}
          <Unfilled>[CONTROLLER]</Unfilled> or to the people who licensed them
          to us. Use them to sit; do not copy them or sell them on. Your
          practice record belongs to you.
        </p>
      </Section>

      <Section title="No promises">
        <p>
          The site is offered as it is. As far as the law allows, we are not
          responsible for any loss that comes from using it or from not being
          able to. Nothing here takes away a right the law says you keep.
        </p>
      </Section>

      <Section title="Changes, and who to talk to">
        <p>
          We may change these terms. The date at the foot of this page is when
          they last changed, and a change that matters will be said on the site
          itself. These terms are governed by the law of{' '}
          <Unfilled>[JURISDICTION]</Unfilled>.
        </p>
        <p>
          Questions about any of this go to{' '}
          <Unfilled>[CONTACT EMAIL]</Unfilled>. What the site stores about you
          is a separate page.
        </p>
      </Section>
    </Document>
  );
}
