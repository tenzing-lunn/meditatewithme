/**
 * The address a request came from, as the key for `lib/limit.ts`.
 *
 * Vercel sets `x-forwarded-for` with the client first; `x-real-ip` is the
 * fallback behind other proxies. Locally neither exists and every request
 * shares one bucket, which is fine for `next dev` and would be noticed in a
 * test. The address is used as a key and never stored or logged — the
 * heartbeat's privacy stance (`app/api/heartbeat/route.ts`) holds.
 */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}
