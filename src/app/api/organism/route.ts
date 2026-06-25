import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Mirrors the original `rgbc_organisms_data` AJAX: returns an organism's
// Overview/Metallome/Estrobolome/Body-site/Studies HTML for a given page.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const name = searchParams.get("name");
  if (!slug || !name) return NextResponse.json({ html: null });

  const { data } = await supabase
    .from("content_items")
    .select("meta")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  const meta = (data?.meta || {}) as { signature?: { details?: Record<string, string> } };
  const html = meta.signature?.details?.[name] ?? null;
  return NextResponse.json({ html });
}
