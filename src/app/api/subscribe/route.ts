import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Created lazily at request time so a missing env var (e.g. in Preview)
// returns 503 instead of failing `next build` during page-data collection.
let client: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Subscriptions are temporarily unavailable." },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const email = String(form.get("email") || "").trim();

  if (email) {
    // Ignore duplicate-email errors (unique index); capture everything else.
    await supabase.from("subscribers").insert({ email, source: "site" });
  }

  let back = "/";
  try {
    const referer = req.headers.get("referer");
    if (referer) {
      const url = new URL(referer);
      url.searchParams.set("subscribed", "1");
      back = url.toString();
    }
  } catch {
    back = "/?subscribed=1";
  }
  return NextResponse.redirect(back, 303);
}
