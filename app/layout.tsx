import type { Metadata, Viewport } from 'next';
import { Comfortaa, Nunito } from 'next/font/google';
import './globals.css';

/**
 * Two rounded faces. Comfortaa is the wordmark, the question on each screen
 * and the minutes at the end: it needs its 700 to hold a line on its own.
 * Nunito is every sentence and every control; 600 is what a button reads
 * in. Neither is used below 0.8125rem.
 */
const comfortaa = Comfortaa({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-comfortaa',
  display: 'swap',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-nunito',
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
  'Everyone sitting this hour is a candle on the earth, and one bell at five to the hour ends it for all of them.';

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
  // One screen at a time, nothing to crawl, but it should still be findable.
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  colorScheme: 'light',
  // Dusk, not paper: Home and the sitting are full-bleed dusk, and the rail
  // of questions is the only paper a visitor sees.
  themeColor: '#2b1a10',
  // Without this, `env(safe-area-inset-bottom)` is always zero on iOS and the
  // controls at the foot of a screen sit inside the home-indicator zone. The
  // frame does not scroll and draws under the insets; only the padding at the
  // foot has to know they exist.
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${comfortaa.variable} ${nunito.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
