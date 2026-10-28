import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Read-only public client (RLS allows anon to read published content + media).
//
// Created lazily on first use so `next build` does not crash when the env vars
// are absent (e.g. Vercel Preview). With env present, behaviour is identical:
// one shared client, created with the same options.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);

let real: SupabaseClient | null = null;
function getReal(): SupabaseClient {
  if (!real) {
    real = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return real;
}

// When unconfigured, every chain (from().select().eq()..., rpc(), storage...)
// resolves to an empty result instead of throwing.
const EMPTY = {
  data: null,
  error: { message: "Supabase is not configured" },
  count: 0,
  status: 503,
  statusText: "Supabase not configured",
};
const EMPTY_AUTH = {
  ...EMPTY,
  data: { user: null, session: null, subscription: { unsubscribe() {} } },
};
function stub(result: unknown = EMPTY): unknown {
  const fn = () => stub(result);
  return new Proxy(fn, {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => unknown) => resolve(result);
      }
      if (prop === Symbol.toPrimitive) return () => "";
      if (prop === "data") return (result as { data: unknown }).data;
      return stub(prop === "auth" ? EMPTY_AUTH : result);
    },
    apply() {
      return stub(result);
    },
  });
}

// Shared no-op client for the auth-aware factories when env is missing.
export function unconfiguredSupabase<T>(): T {
  return stub() as T;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    if (!supabaseConfigured) return (stub() as Record<PropertyKey, unknown>)[prop];
    const c = getReal() as unknown as Record<PropertyKey, unknown>;
    const v = c[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(c) : v;
  },
});
