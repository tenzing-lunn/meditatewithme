/**
 * Every route here catches its errors and answers something calm — a count
 * of null, an empty earth, `{ ok: false }` — because nobody sitting down to
 * meditate should see a red banner. Until 3 October 2026 the error then went
 * nowhere: a wrong service key, a dropped column and a Supabase outage all
 * looked, from outside, like "nobody is sitting right now", with no log line
 * to say otherwise.
 *
 * So every `catch` calls this. Vercel keeps `console.error` from a function
 * in its logs; this is the one place to hang Sentry or a log drain later,
 * without touching twelve routes again. The caller is still answered as
 * before — reporting is beside the degradation, not instead of it.
 */
export function report(where: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[api/${where}] ${message}`, err);
}
