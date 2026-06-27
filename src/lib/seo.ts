import type { Metadata } from "next";

export const SITE_URL = "https://microbiomemedicine.com";
export const SITE_NAME = "Microbiome Signatures";

export type SeoItem = {
  title: string;
  seo_title?: string | null;
  seo_description?: string | null;
  excerpt_html?: string | null;
  published_at?: string | null;
  modified_at?: string | null;
};

export type SeoOpts = {
  path: string;
  type: string;
  authors?: { name: string; orcid?: string | null }[];
  doi?: string;
  journal?: string;
  image?: string | null;
  pdfUrl?: string;
};

function stripTags(s?: string | null): string | undefined {
  if (!s) return undefined;
  const t = s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return t || undefined;
}
function abs(u?: string | null): string | undefined {
  if (!u) return undefined;
  if (/^https?:\/\//.test(u)) return u;
  return SITE_URL + (u.startsWith("/") ? u : "/" + u);
}

// Metadata: title/description + canonical + OpenGraph + Twitter + Google Scholar citation_* tags.
export function buildMetadata(item: SeoItem, o: SeoOpts): Metadata {
  const title = item.seo_title || item.title;
  const description = item.seo_description || stripTags(item.excerpt_html);
  const image = abs(o.image);
  // Google Scholar prefers slash-separated dates (YYYY/MM/DD).
  const date = (item.published_at || item.modified_at || "").slice(0, 10).replace(/-/g, "/");
  const canonical = abs(o.path) || SITE_URL;
  // Authorless pages are authored by Karen (site rule), so Scholar always gets an author.
  const authors = o.authors?.length ? o.authors : [{ name: "Karen Pendergrass" }];
  const citationAbstract = stripTags(item.seo_description) || stripTags(item.excerpt_html);

  // Highwire Press citation_* tags — the bibliographic metadata Google Scholar indexes on.
  const other: Record<string, string | string[]> = {
    citation_title: item.title,
    citation_journal_title: o.journal || SITE_NAME,
    citation_publisher: SITE_NAME,
    citation_author: authors.map((a) => a.name),
    citation_fulltext_world_readable: "true",
    citation_language: "en",
    citation_abstract_html_url: canonical,
    citation_fulltext_html_url: canonical,
  };
  if (date) { other.citation_publication_date = date; other.citation_online_date = date; }
  if (citationAbstract) other.citation_abstract = citationAbstract.slice(0, 5000);
  if (o.doi) other.citation_doi = o.doi;
  const pdf = abs(o.pdfUrl);
  if (pdf) other.citation_pdf_url = pdf;

  return {
    title,
    description,
    alternates: { canonical: o.path },
    openGraph: {
      title,
      description: description || undefined,
      url: o.path,
      siteName: SITE_NAME,
      type: "article",
      publishedTime: item.published_at || undefined,
      modifiedTime: item.modified_at || undefined,
      authors: authors.map((a) => a.name),
      images: image ? [image] : undefined,
    },
    twitter: { card: "summary_large_image", title, description: description || undefined, images: image ? [image] : undefined },
    other,
  };
}

// JSON-LD graph: MedicalWebPage/ScholarlyArticle/Article + optional FAQPage + BreadcrumbList.
export function buildJsonLd(
  item: SeoItem,
  o: SeoOpts & { faqs?: { q: string; a: string }[]; breadcrumbs?: { name: string; url: string }[] }
): Record<string, unknown>[] {
  const url = SITE_URL + o.path;
  const date = item.published_at || item.modified_at || undefined;
  const scholarly = ["research-feed", "theory"].includes(o.type);
  const medical = ["condition", "microbe", "metal", "definition", "intervention", "supplement"].includes(o.type);
  const main: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": scholarly ? "ScholarlyArticle" : medical ? "MedicalWebPage" : "Article",
    headline: item.title,
    name: item.title,
    description: stripTags(item.seo_description || item.excerpt_html),
    url,
    mainEntityOfPage: url,
    datePublished: date,
    dateModified: item.modified_at || date,
    inLanguage: "en-US",
    isAccessibleForFree: true,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    author: (o.authors?.length ? o.authors : [{ name: "Karen Pendergrass", orcid: "https://orcid.org/0000-0002-2348-7259" }])
      .map((a) => ({ "@type": "Person", name: a.name, ...(a.orcid ? { identifier: a.orcid, sameAs: a.orcid } : {}) })),
  };
  if (o.doi) main.sameAs = `https://doi.org/${o.doi}`;
  const out: Record<string, unknown>[] = [main];

  if (o.faqs?.length) {
    out.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: o.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  if (o.breadcrumbs?.length) {
    out.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: o.breadcrumbs.map((b, i) => ({ "@type": "ListItem", position: i + 1, name: b.name, item: SITE_URL + b.url })),
    });
  }
  return out;
}
