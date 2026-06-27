import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { segmentForType } from "@/lib/content";

// Live autocomplete for the homepage hero search (the WordPress front.js search
// plugin that populated `.js-search-result` doesn't run in the rebuild). Returns
// title matches grouped by content type, Conditions first, like the original.

type Row = { type: string; slug: string; title: string };
type Suggestion = { title: string; href: string; label: string };

// Badge label per type (matches the original autocomplete dropdown).
const TYPE_LABEL: Record<string, string> = {
  condition: "Conditions",
  guide: "Guides",
  definition: "Definitions",
  intervention: "Interventions",
  microbe: "Microbes",
  metal: "Metals",
  supplement: "Supplements",
  theory: "Theories",
  "research-feed": "Research",
  post: "Post",
  page: "Page",
};

// Display order: Conditions first, then guides/definitions/articles. Raw research
// feeds rank last so curated pages fill the panel (matches the original dropdown).
const TYPE_ORDER = [
  "condition",
  "guide",
  "definition",
  "post",
  "intervention",
  "microbe",
  "metal",
  "supplement",
  "theory",
  "research-feed",
  "page",
];
const rank = (type: string): number => {
  const i = TYPE_ORDER.indexOf(type);
  return i === -1 ? TYPE_ORDER.length : i;
};

function hrefFor(type: string, slug: string): string {
  const seg = segmentForType(type);
  return seg ? `/${seg}/${slug}` : `/${slug}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ items: [] });

  // Escape ilike wildcards in the user term so they match literally.
  const term = q.replace(/[\\%_]/g, (c) => `\\${c}`);

  const { data } = await supabase
    .from("content_items")
    .select("type,slug,title")
    .eq("status", "publish")
    .ilike("title", `%${term}%`)
    .limit(200);

  const rows = (data as Row[]) || [];
  rows.sort((a, b) => {
    const r = rank(a.type) - rank(b.type);
    if (r !== 0) return r;
    return a.title.localeCompare(b.title);
  });

  const items: Suggestion[] = rows.slice(0, 10).map((r) => ({
    title: r.title,
    href: hrefFor(r.type, r.slug),
    label: TYPE_LABEL[r.type] || r.type,
  }));

  return NextResponse.json({ items });
}
