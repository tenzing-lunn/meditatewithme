import type { Metadata, Viewport } from 'next';
import { preload } from 'react-dom';
import { Newsreader } from 'next/font/google';
import './globals.css';

/**
 * One face, Newsreader, a book serif: the wordmark, the sentence on the
 * arrival and the minutes at the end — what the site says. Everything you
 * press is the system's own sans (`--font-body` in globals.css), so nothing
 * else is downloaded. Pale water, 22 September 2026.
 */
const newsreader = Newsreader({
  subsets: ['latin'],
  axes: ['opsz'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
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
  themeColor: '#e5e9ec',
  // Without this, `env(safe-area-inset-bottom)` is always zero on iOS and the
  // controls at the foot of a screen sit inside the home-indicator zone. The
  // frame does not scroll and draws under the insets; only the padding at the
  // foot has to know they exist.
  viewportFit: 'cover',
};

/**
 * The room, decided before the first pixel.
 *
 * `useRoom` cannot help here: it runs after hydration, which is after ~270KB
 * of JavaScript, and until it answers the page has to paint *some* ground.
 * It used to paint paper, and then at night the whole window flipped to dusk
 * the moment React arrived — the first thing a visitor saw was the site
 * changing its mind.
 *
 * So the rule from `lib/room.ts` is run here instead, inline and blocking at
 * the top of the body, and
 * the answer is put on `<body>` where `[data-room="dawn"]` can act on it, and
 * the body then paints `--color-room` — the ground of the first screen
 * whoever is looking: `screensFor` always opens on `mode`, and Home is the
 * same earth. React re-asserts the same value on `<main>` a moment later and
 * nothing moves.
 *
 * Kept as a copy of the rule rather than an import because it has to be a
 * string in the document; it is four lines and `tests/room.test.ts` guards the
 * original. If the hours or the key change, change them here too.
 */
const ROOM_BEFORE_PAINT = `try{var d=new Date(),h=d.getHours(),c=null;try{c=JSON.parse(localStorage.getItem('mwm.room'))}catch(e){}
document.body.dataset.room=c&&(c.room==='dawn'||c.room==='dusk')&&typeof c.until==='number'&&d.getTime()<c.until?c.room:(h>=6&&h<18?'dawn':'dusk')}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
   * The earth, asked for with the document.
   *
   * 273KB of it, and nothing used to ask until the `WorldMap` chunk had
   * loaded — which is after hydration, which is after the whole bundle. So
   * the ground under the doors filled in around half a second after the
   * doors themselves. Asked for here it comes down beside the JavaScript.
   *
   * `preload` rather than a `<link>` in the markup: React hoists head
   * elements *and* renders them where they are written, so the tags came out
   * twice. This emits one apiece and is the supported way to say it.
   *
   * The relief is the heavy half — only the terrain inside the coasts — so it
   * yields to everything else. The coastlines are what make it read as the
   * earth at all, and do not.
   *
   * `/public` is served with `max-age=0`, so `WorldMap`'s own fetch for the
   * coastlines still makes a conditional request when it runs — but it is 300
   * bytes and a 304, and the 54KB is already in the cache waiting for it.
   * Measured both with and without a matching `crossOrigin`/`credentials`
   * pair, which changes nothing here and was not worth the two call sites.
   */
  preload('/earth/land.json', { as: 'fetch' });
  preload('/earth/relief.jpg', { as: 'image', fetchPriority: 'low' });

  return (
    <html lang="en" className={newsreader.variable}>
      {/* `data-room` is written here by the script above, before the first
          paint, and `suppressHydrationWarning` is why React does not object to
          finding an attribute the server never rendered. It covers this
          element's own attributes and not its subtree, which is exactly the
          scope of the difference. On `<html>` it would be the more natural
          place, but Next owns that element and the flag does not reach it. */}
      <body className="font-body antialiased" suppressHydrationWarning>
        {/* First child of `<body>`, not of `<head>`, for the dull reason that
            it writes to `document.body` and in the head there is no body yet.
            An inline script runs as it is parsed, so this still lands before
            anything below it is painted. */}
        <script dangerouslySetInnerHTML={{ __html: ROOM_BEFORE_PAINT }} />
        {/* Every page's `<main>` is `#main`. Unseen until it has the keyboard;
            then a primary button at the top left, over whatever page it is,
            since ember on white reads on paper and on dusk alike. The fixed
            wrapper is what positions it: `not-sr-only` sets `position` too,
            and putting `fixed` on the link itself would race it. */}
        <div className="fixed top-3 left-3 z-50">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-action focus:bg-ember focus:px-5 focus:text-control focus:font-semibold focus:text-white focus:ring-2 focus:ring-ember focus:ring-offset-2 focus:ring-offset-paper focus:outline-none"
          >
            Skip to content
          </a>
        </div>
        {children}
      </body>
    </html>
  );
}
