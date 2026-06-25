import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRootBySlug, stripHost } from "@/lib/content";
import { ArticleView } from "@/components/ArticleView";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getRootBySlug(slug);
  if (!item) return {};
  const meta = (item.meta || {}) as Record<string, unknown>;
  const authors = Array.isArray(meta.authors) ? (meta.authors as { name: string; orcid?: string | null }[]) : [];
  const image = (typeof meta.hero_image === "string" ? meta.hero_image : null) || stripHost(item.featured_image_url);
  return buildMetadata(item, { path: `/${slug}`, type: item.type, authors, image });
}

export default async function RootContentPage({ params }: Props) {
  const { slug } = await params;
  const item = await getRootBySlug(slug);
  if (!item) notFound();

  // Blog posts use the full research template (red hero + styled content + author).
  if (item.type === "post") return <ArticleView segment="" slug={slug} />;

  // Static pages: clean, theme-styled article.
  return (
    <main className="site-content">
      <div className="entry-content" style={{ maxWidth: "65rem", margin: "0 auto", padding: "40px 20px 72px" }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2.5rem", lineHeight: 1.15, marginBottom: "1rem" }}>{item.title}</h1>
        <hr style={{ border: 0, borderTop: "1px dashed #cbd5e1", margin: "1.5rem 0" }} />
        <div dangerouslySetInnerHTML={{ __html: item.content_html || "" }} />
      </div>
    </main>
  );
}
