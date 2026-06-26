import { MicrobiomeSignature } from "@/components/MicrobiomeSignature";
import { Tooltips } from "@/components/Tooltips";
import { JsonLd } from "@/components/JsonLd";
import { WpInteractivity } from "@/components/WpInteractivity";
import { buildJsonLd } from "@/lib/seo";
import { getFaqs, injectFaqs } from "@/lib/faqs";
import { stripHost, type ContentItem } from "@/lib/content";

type SigItem = { name: string; value: number; has_info?: boolean };

// The signature modal's "Studies" list = the page's referenced studies.
function extractStudies(html: string): { title: string; url: string }[] {
  const out: { title: string; url: string }[] = [];
  const seen = new Set<string>();
  const re = /rgbc-reference-tooltip__content[^>]*>([\s\S]*?)<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const block = m[1];
    const titleM = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(block);
    if (!titleM) continue;
    const title = titleM[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    const reviewM = /rgbc-reference-tooltip__btn[^>]*href="([^"]+)"/.exec(block);
    out.push({ title, url: reviewM ? (stripHost(reviewM[1]) || reviewM[1]) : titleM[1] });
  }
  return out;
}

// Renders the captured WordPress content region verbatim (pixel-exact), injecting
// our generated FAQs and re-attaching the interactive pieces.
export function WpRender({
  item,
  html,
  path,
  type,
  breadcrumbs,
}: {
  item: ContentItem;
  html: string;
  path: string;
  type: string;
  breadcrumbs: { name: string; url: string }[];
}) {
  const meta = (item.meta || {}) as Record<string, unknown>;
  const signature = meta.signature as { levels?: Record<string, SigItem[]> } | undefined;
  const hasSignature = !!signature?.levels;
  const authors = Array.isArray(meta.authors) ? (meta.authors as { name: string; orcid?: string | null }[]) : [];
  const faqs = getFaqs(html, item.title);
  const content = injectFaqs(html, faqs);
  const studies = extractStudies(content);
  const jsonLd = buildJsonLd(item, { path, type, authors, faqs, breadcrumbs });

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: content }} />
      {hasSignature && (
        <MicrobiomeSignature slug={item.slug} title={item.title} levels={signature!.levels!} studies={studies} />
      )}
      <Tooltips />
      <WpInteractivity itemId={item.id} />
      <JsonLd data={jsonLd} />
    </>
  );
}
