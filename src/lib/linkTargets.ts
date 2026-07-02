import { cache } from "react";
import { supabase } from "./supabase";

// URL segment per content type (matches the app routes). research-feed/post/page are
// NOT link targets — they're articles, not canonical concept entities.
const SEGMENT: Record<string, string> = {
  condition: "conditions",
  definition: "definition",
  intervention: "interventions",
  metal: "metals",
  microbe: "microbes",
  supplement: "supplement",
  guide: "guide",
  theory: "theories-hypotheses",
};

export type LinkTarget = { title: string; href: string; type: string };

// Every canonical concept entity that other pages should link to at first mention.
// Loaded once per request (React cache()). ~80 rows, so an in-memory list is fine.
export const getLinkTargets = cache(async (): Promise<LinkTarget[]> => {
  const { data } = await supabase
    .from("content_items")
    .select("type,slug,title,status")
    .in("type", Object.keys(SEGMENT))
    .eq("status", "publish");
  return ((data || []) as { type: string; slug: string; title: string }[])
    .filter((r) => r.title && r.slug && SEGMENT[r.type])
    .map((r) => ({ title: r.title, href: `/${SEGMENT[r.type]}/${r.slug}/`, type: r.type }));
});
