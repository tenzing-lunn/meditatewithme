/** A request to a route, as a browser or a server would send it. */
export function request(
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string>; raw?: string } = {},
): Request {
  const headers: Record<string, string> = { ...init.headers };
  let body: string | undefined;
  if (init.raw !== undefined) body = init.raw;
  else if (init.body !== undefined) {
    body = JSON.stringify(init.body);
    headers['content-type'] = 'application/json';
  }
  return new Request(`http://localhost${path}`, { method: init.method ?? (body ? 'POST' : 'GET'), body, headers });
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
export const basic = (password: string) => ({ authorization: `Basic ${Buffer.from(`mtx:${password}`).toString('base64')}` });

/** A different address per call, so one test's limiter never trips another's. */
let n = 0;
export const fromIp = (ip = `10.0.${Math.floor(n / 250)}.${(n++ % 250) + 1}`) => ({ 'x-forwarded-for': ip });
