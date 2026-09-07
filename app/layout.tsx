import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
  display: 'swap',
});

/**
 * Absolute base for the OG card's URL, which crawlers will not resolve from a
 * relative path. `VERCEL_PROJECT_PRODUCTION_URL` is the production hostname
 * whichever deployment is reading it, so this follows the custom domain the
 * day it is attached without anyone remembering to come back here.
 */
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000';

const description =
  'A new session begins at the top of every hour. Everyone worldwide sits in the same one.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Meditate With Me',
  description,
  openGraph: {
    title: 'Meditate With Me',
    description,
    url: '/',
    siteName: 'Meditate With Me',
    type: 'website',
    locale: 'en_GB',
  },
  twitter: { card: 'summary_large_image', title: 'Meditate With Me', description },
  // The room is one page that does not scroll and has nothing to crawl, but
  // it should still be findable.
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#131518',
  // Without this, `env(safe-area-inset-bottom)` is always zero on iOS and the
  // controls at the foot of the sitting sit inside the home-indicator zone.
  // The room is a full-bleed photograph that does not scroll, so drawing
  // under the insets is what it wants anyway; the padding at the foot of the
  // frame is the only thing that has to know they exist.
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} ${instrumentSerif.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
