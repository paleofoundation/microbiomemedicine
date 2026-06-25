import { cache } from "react";
import { supabase } from "./supabase";

export type ListItem = {
  id: number;
  slug: string;
  title: string;
  excerpt_html: string | null;
  featured_image_url: string | null;
};

export type ContentItem = ListItem & {
  type: string;
  content_html: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  modified_at: string | null;
  meta: Record<string, unknown>;
};

export type Section = { segment: string; type: string; label: string; nav: string; blurb: string };

// Maps URL segment -> content type. Preserves the original WordPress URL structure.
export const SECTIONS: Section[] = [
  { segment: "microbes", type: "microbe", label: "Microbes", nav: "Microbes", blurb: "Bacteria, fungi, and other organisms of the human microbiome." },
  { segment: "conditions", type: "condition", label: "Conditions", nav: "Conditions", blurb: "Diseases and conditions linked to microbiome signatures." },
  { segment: "interventions", type: "intervention", label: "Interventions", nav: "Interventions", blurb: "Therapies, treatments, and modulators of the microbiome." },
  { segment: "definition", type: "definition", label: "Definitions", nav: "Definitions", blurb: "Key terms and concepts in microbiome medicine." },
  { segment: "metals", type: "metal", label: "Metals", nav: "Metals", blurb: "Heavy metals and their interactions with the microbiome." },
  { segment: "supplement", type: "supplement", label: "Supplements", nav: "Supplements", blurb: "Supplements studied for microbiome effects." },
  { segment: "guide", type: "guide", label: "Guides & Resources", nav: "Guides", blurb: "In-depth guides and reference resources." },
  { segment: "research-feeds", type: "research-feed", label: "Research Feeds", nav: "Research", blurb: "Curated summaries of microbiome research." },
  { segment: "theories-hypotheses", type: "theory", label: "Novel Theories & Hypotheses", nav: "Theories", blurb: "Emerging theories and hypotheses." },
];

export const sectionBySegment = (segment: string): Section | undefined =>
  SECTIONS.find((s) => s.segment === segment);

export const segmentForType = (type: string): string =>
  SECTIONS.find((s) => s.type === type)?.segment ?? type;

// Internal-link/image URLs were already made root-relative on import; this also
// covers any absolute featured-image URLs still pointing at the old host.
export const stripHost = (url: string | null | undefined): string | null =>
  ((url || "").replace(/^https?:\/\/(www\.)?microbiomemedicine\.com/i, "") || null);

export const listByType = cache(
  async (type: string, page = 1, pageSize = 48) => {
    const from = (page - 1) * pageSize;
    const { data, count } = await supabase
      .from("content_items")
      .select("id,slug,title,excerpt_html,featured_image_url", { count: "exact" })
      .eq("type", type)
      .eq("status", "publish")
      .order("title")
      .range(from, from + pageSize - 1);
    return { items: (data ?? []) as ListItem[], total: count ?? 0, page, pageSize };
  }
);

export const getItem = cache(async (type: string, slug: string) => {
  const { data } = await supabase
    .from("content_items")
    .select("*")
    .eq("type", type)
    .eq("slug", slug)
    .eq("status", "publish")
    .maybeSingle();
  return (data as ContentItem | null) ?? null;
});

export const getRootBySlug = cache(async (slug: string) => {
  const { data } = await supabase
    .from("content_items")
    .select("*")
    .in("type", ["post", "page"])
    .eq("slug", slug)
    .eq("status", "publish")
    .order("type")
    .limit(1)
    .maybeSingle();
  return (data as ContentItem | null) ?? null;
});

export const sampleByType = cache(async (type: string, limit = 6) => {
  const { data } = await supabase
    .from("content_items")
    .select("id,slug,title,excerpt_html,featured_image_url")
    .eq("type", type)
    .eq("status", "publish")
    .order("title")
    .limit(limit);
  return (data ?? []) as ListItem[];
});
