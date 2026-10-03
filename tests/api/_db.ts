/**
 * Stands in for `lib/supabase.ts` under `tests/api/` (see `_hooks.mjs`).
 *
 * A route sees a `SupabaseClient`-shaped object whose every query chain —
 * `from(t).select().eq().is().maybeSingle()` and so on — records what was
 * called and resolves to the reply the test gave for that table. The
 * reply can be a function of the calls so far, for a route that queries one
 * table twice. `auth` and `rpc` answer from the same fixture.
 *
 * Deliberately not a database: it does not filter, join or persist. The
 * routes' *decisions* are what is under test — who is refused, with which
 * status — and those depend only on what the database answers, not on how.
 */

export type Reply = { data?: unknown; error?: unknown; count?: number | null };
type TableReply = Reply | ((calls: string[]) => Reply);

export type FakeUser = { id: string; email?: string | null };

export type Fixture = {
  /** Reply per table name. A table not listed answers `{ data: null, error: null }`. */
  tables?: Record<string, TableReply>;
  /** The user behind any bearer token, or null for "token not valid". */
  user?: FakeUser | null;
  /** `db.rpc(...)` reply. */
  rpc?: Reply;
  /** `auth.admin.getUserById` reply, keyed by id. */
  users?: Record<string, FakeUser>;
};

export type Fake = {
  calls: string[];
  client: unknown;
};

let current: Fake | null = null;

/** Build a fake from a fixture and make it what `serviceClient()` returns. */
export function useDb(fixture: Fixture = {}): Fake {
  const calls: string[] = [];
  const tables = fixture.tables ?? {};

  const chain = (table: string) => {
    const reply = () => {
      const r = tables[table] ?? { data: null, error: null };
      const out = typeof r === 'function' ? r(calls) : r;
      return { data: null, error: null, count: null, ...out };
    };
    const proxy: unknown = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'then') {
            return (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
              Promise.resolve(reply()).then(res, rej);
          }
          return (...args: unknown[]) => {
            calls.push(`${table}.${String(prop)}${args.length ? `(${JSON.stringify(args[0])})` : ''}`);
            return proxy;
          };
        },
      },
    );
    return proxy;
  };

  const ok = (data: unknown) => ({ data, error: null });
  const client = {
    from: (table: string) => chain(table),
    rpc: async () => fixture.rpc ?? ok(null),
    auth: {
      getUser: async (token: string) => {
        calls.push(`auth.getUser(${token})`);
        return fixture.user ? ok({ user: fixture.user }) : { data: { user: null }, error: { message: 'invalid' } };
      },
      admin: {
        getUserById: async (id: string) => ok({ user: fixture.users?.[id] ?? null }),
        deleteUser: async (id: string) => {
          calls.push(`auth.admin.deleteUser(${id})`);
          return ok(null);
        },
        generateLink: async () => ok({ properties: { hashed_token: 'hash-123' } }),
        updateUserById: async () => ok(null),
      },
    },
  };

  current = { calls, client };
  return current;
}

/** No fake installed — a route that reaches the database with none set is a test bug. */
export function clearDb(): void {
  current = null;
}

export async function serviceClient(): Promise<unknown> {
  if (!current) throw new Error('tests/api: no fake database — call useDb() first');
  return current.client;
}

export async function browserClient(): Promise<never> {
  throw new Error('tests/api: browserClient is not used by routes');
}
