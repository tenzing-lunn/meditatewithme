import { notFound } from 'next/navigation';
import LiveTest from './LiveTest';

/**
 * Dev-only: whoever is live, full screen, with the state written underneath.
 * Proves the pipeline — key, MediaMTX, hooks, /api/live, the player — before
 * any of it is in the rail. Not in production; the dev preview has it, behind
 * Vercel's login, so a phone can watch a real server.
 */
export default function Page() {
  if (process.env.VERCEL_ENV === 'production') notFound();
  return <LiveTest hlsBase={process.env.LIVE_HLS_BASE ?? null} />;
}
