import type { Metadata } from 'next';

import { Document, Section } from '@/components/Document';
import { BED_SOURCES, DRUM_SOURCE } from '@/lib/beds';

/**
 * Where the sounds came from.
 *
 * Built from `lib/beds.ts`, so it cannot drift from what the site plays. Most
 * of the recordings are CC0 and owe nothing; two are CC BY 4.0, which does —
 * the recordist's name, the licence and a link, somewhere a visitor can read
 * it. This is that place. **Nothing links here yet**, like the privacy notice
 * and the terms: it has to be linked, from the same place they will be,
 * before the CC BY recordings reach `main`.
 */
export const metadata: Metadata = {
  title: 'Credits — Meditate With Me',
  description: 'Who recorded the sounds on Meditate With Me.',
};

const LABEL: Record<string, string> = {
  rain: 'Rain',
  wind: 'Wind',
  waterfall: 'Creek',
  ocean: 'Ocean',
  fire: 'Fire',
  hum: 'Hum',
  chimes: 'Chimes',
  bowl: 'Humming bowl',
  night: 'Evening',
};

function Credit({
  what,
  title,
  author,
  id,
  license,
}: {
  what: string;
  title: string;
  author: string;
  id: number;
  license: string;
}) {
  return (
    <li>
      <strong>{what}</strong> — “{title}” by {author},{' '}
      <a href={`https://freesound.org/s/${id}/`} className="underline">
        Freesound
      </a>
      , {license}.
    </li>
  );
}

export default function CreditsPage() {
  return (
    <Document title="Credits" changed="29 September 2026">
      <p className="mt-6">
        The sounds here are other people’s recordings, shared on Freesound.
        Thank you to every one of them.
      </p>

      <Section title="The sounds">
        <ul className="list-disc space-y-2 pl-5">
          <Credit
            what="Tongue drum, the bell"
            title={DRUM_SOURCE.title}
            author={DRUM_SOURCE.author}
            id={DRUM_SOURCE.freesoundId}
            license="CC0"
          />
          {BED_SOURCES.map((b) => (
            <Credit
              key={b.slug}
              what={LABEL[b.slug] ?? b.slug}
              title={b.title}
              author={b.author}
              id={b.freesoundId}
              license={b.license ?? 'CC0'}
            />
          ))}
        </ul>
        <p>
          CC BY 4.0 is{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/" className="underline">
            creativecommons.org/licenses/by/4.0
          </a>
          . The recordings were cut into loops, matched in loudness and
          compressed for the web.
        </p>
      </Section>
    </Document>
  );
}
