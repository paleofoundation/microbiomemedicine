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

  const meta = (data?.meta || {}) as {
    signature?: {
      details?: Record<string, string>;
      organisms?: Record<string, { overview?: string; metallome?: string; estrobolome?: string; bodySite?: string; link?: string }>;
    };
  };

  // Migrated pages store pre-rendered HTML in `details`. CSV-generated pages store
  // structured fields in `organisms` — build the same <details> sections from those.
  let html = meta.signature?.details?.[name] ?? null;
  if (!html) {
    const o = meta.signature?.organisms?.[name];
    if (o) {
      const sect = (label: string, text?: string) =>
        text && text.trim() ? `\n<details class="modal__details " open>\n\t<summary>\n\t${label}\t</summary>\n\t${text.trim()}</details>\n` : "";
      const built =
        sect("Overview", o.overview) +
        sect("Metallome", o.metallome) +
        sect("Estrobolome", o.estrobolome) +
        sect("Body site", o.bodySite) +
        (o.link && o.link.trim() ? `\n<details class="modal__details " open>\n\t<summary>\n\tSource\t</summary>\n\t<a href="${o.link.trim()}" target="_blank" rel="noreferrer">${o.link.trim()}</a></details>\n` : "");
      html = built || null;
    }
  }
  return NextResponse.json({ html });
}
