import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { SECTIONS, stripHost, INDEXABLE_TYPES, contentPath } from "@/lib/content";
import { SITE_URL } from "@/lib/seo";
import { NOINDEX_PAGE_SLUGS, canonicalUrl } from "@/lib/seoIndexing";

export const revalidate = 86400;

const abs = (u: string): string => (/^https?:\/\//.test(u) ? u : SITE_URL + (u.startsWith("/") ? u : "/" + u));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
    { url: canonicalUrl("/"), lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
  ];
  for (const s of SECTIONS) {
    urls.push({ url: canonicalUrl(`/${s.segment}`), changeFrequency: "weekly", priority: 0.7 });
  }
  const seen = new Set(urls.map((u) => u.url));
  for (let from = 0; from < 8000; from += 1000) {
    const { data } = await supabase
      .from("content_items")
      .select("slug,type,modified_at,featured_image_url,meta")
      .eq("status", "publish")
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const r of data as {
      slug: string;
      type: string;
      modified_at: string | null;
      featured_image_url: string | null;
      meta: Record<string, unknown> | null;
    }[]) {
      if (!INDEXABLE_TYPES.has(r.type)) continue;
      if (!r.slug || NOINDEX_PAGE_SLUGS.has(r.slug)) continue;
      const path = contentPath(r.type, r.slug);
      const url = canonicalUrl(path);
      if (seen.has(url)) continue;
      seen.add(url);
      const hero =
        (r.meta && typeof r.meta.hero_image === "string" ? (r.meta.hero_image as string) : null) ||
        stripHost(r.featured_image_url);
      urls.push({
        url,
        lastModified: r.modified_at ? new Date(r.modified_at) : undefined,
        changeFrequency: "monthly",
        priority: 0.6,
        // Google image sitemap extension (<image:image>) — only when the page has a hero.
        ...(hero ? { images: [abs(hero)] } : {}),
      });
    }
    if (data.length < 1000) break;
  }
  return urls;
}
