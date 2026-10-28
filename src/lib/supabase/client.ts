import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfigured, unconfiguredSupabase } from "@/lib/supabase";

// Auth-aware browser client (persists session in cookies for SSR).
export function createSupabaseBrowser() {
  if (!supabaseConfigured) return unconfiguredSupabase<never>();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
