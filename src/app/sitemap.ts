import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { segmentForType, SECTIONS } from "@/lib/content";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
  ];
  for (const s of SECTIONS) {
    urls.push({ url: `${SITE_URL}/${s.segment}`, changeFrequency: "weekly", priority: 0.7 });
  }
  for (let from = 0; from < 8000; from += 1000) {
    const { data } = await supabase
      .from("content_items")
      .select("slug,type,modified_at")
      .eq("status", "publish")
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const r of data as { slug: string; type: string; modified_at: string | null }[]) {
      const seg = ["post", "page"].includes(r.type) ? "" : segmentForType(r.type);
      const path = seg ? `/${seg}/${r.slug}` : `/${r.slug}`;
      urls.push({
        url: SITE_URL + path,
        lastModified: r.modified_at ? new Date(r.modified_at) : undefined,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
    if (data.length < 1000) break;
  }
  return urls;
}
