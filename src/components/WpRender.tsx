import { MicrobiomeSignature } from "@/components/MicrobiomeSignature";
import { Tooltips } from "@/components/Tooltips";
import { JsonLd } from "@/components/JsonLd";
import { WpInteractivity } from "@/components/WpInteractivity";
import { WpDiagram } from "@/components/WpDiagram";
import { buildJsonLd } from "@/lib/seo";
import { getFaqs, injectFaqs } from "@/lib/faqs";
import { stripHost, type ContentItem } from "@/lib/content";

type SigItem = { name: string; value: number; has_info?: boolean };

// The site must contain NO purple — the WP theme/markup carries purple accents
// (e.g. the paywall lock's #6e488c stroke + #d7cedf bg, inlined in the captured
// HTML). Map every purple to the brand red/pink at render time.
const PURPLE_TO_RED: [RegExp, string][] = [
  [/#6e488c/gi, "#cc3333"], [/#562e69/gi, "#a02727"], [/#5e3b76/gi, "#a02727"],
  [/#5f3b76/gi, "#a02727"], [/#2f1e4e/gi, "#1a1a2e"], [/#330968/gi, "#1a1a2e"],
  [/#7a00df/gi, "#cc3333"], [/#4721fb/gi, "#cc3333"], [/#ab1dfe/gi, "#cc3333"],
  [/#9b51e0/gi, "#cc3333"], [/#e2d9f3/gi, "#f7e6e6"], [/#dad0ec/gi, "#f7e6e6"],
  [/#d7cedf/gi, "#f7e6e6"], [/#e0dce5/gi, "#e3c9c9"], [/#efebf2/gi, "#f7e6e6"],
];
function dePurple(html: string): string {
  let out = html;
  for (const [re, red] of PURPLE_TO_RED) out = out.replace(re, red);
  return out;
}

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
  const content = dePurple(injectFaqs(html, faqs));
  const studies = extractStudies(content);
  const jsonLd = buildJsonLd(item, { path, type, authors, faqs, breadcrumbs });

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: content }} />
      {hasSignature && (
        <MicrobiomeSignature slug={item.slug} title={item.title} levels={signature!.levels!} studies={studies} />
      )}
      <Tooltips />
      <WpDiagram />
      <WpInteractivity itemId={item.id} />
      <JsonLd data={jsonLd} />
    </>
  );
}
