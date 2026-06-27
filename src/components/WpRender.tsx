import { MicrobiomeSignature } from "@/components/MicrobiomeSignature";
import { Tooltips } from "@/components/Tooltips";
import { JsonLd } from "@/components/JsonLd";
import { WpInteractivity } from "@/components/WpInteractivity";
import { WpDiagram } from "@/components/WpDiagram";
import { buildJsonLd } from "@/lib/seo";
import { getFaqs, injectFaqs } from "@/lib/faqs";
import { connectionsBlockHtml } from "@/lib/connections";
import { AUTHOR_BIOS } from "@/theme/authorsBios";
import { linkifyClassifications } from "@/lib/classifications";
import { stripHost, referenceCount, signatureMmaCount, type ContentItem } from "@/lib/content";

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

// The signature modal's "Studies" list = the microbiome-signature studies the
// original page lists inside the diagram modal (.modal--research-diagram__list),
// i.e. the research-feed signature studies for this condition.
function extractSignatureStudies(html: string): { title: string; url: string }[] {
  const out: { title: string; url: string }[] = [];
  const seen = new Set<string>();
  const listM = /<ul[^>]*class="modal--research-diagram__list"[^>]*>([\s\S]*?)<\/ul>/.exec(html);
  if (!listM) return out;
  const re = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(listM[1]))) {
    const url = stripHost(m[1]) || m[1];
    const title = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (title && !seen.has(url)) { seen.add(url); out.push({ title, url }); }
  }
  return out;
}

// Fallback for non-signature pages: the page's referenced studies.
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

// Authorless captured pages have no "Researched by" block in their hero. When meta
// credits an author (the site founder is the default for authorless research content),
// inject the same hero author markup the themed pages use — a visible photo row + the
// "Researched by" names + hover bios — so attribution (and a face) is shown at the top.
function researchedByHtml(authors: { name: string; orcid?: string | null; avatar?: string | null }[]): string {
  if (!authors.length) return "";
  const resolved = authors.map((a, i) => {
    const info = AUTHOR_BIOS[a.name];
    const avatar = (a.avatar || info?.avatar || "").replace(/&amp;|&/g, "&amp;"); // HTML entity form
    return { name: a.name, orcid: a.orcid || info?.orcid || null, avatar, bio: info?.bio || "", cls: `user-bio-auto-${i + 1}` };
  });
  const photos = resolved.filter((r) => r.avatar);
  const photoRow = photos.length
    ? `<div class="research-hero__right-users"><ul class="research-hero__tooltips-list research-hero__tooltips-list--an-image-as-link">${photos
        .map(
          (r) =>
            `<li><span class="rgbc-tooltip" data-options="position:left"${r.bio ? ` title=".${r.cls}"` : ""}><img alt="${r.name}" src="${r.avatar}" class="avatar avatar-96 photo" height="96" width="96" /></span></li>`
        )
        .join("")}</ul></div>`
    : "";
  const names = `<div class="research-hero__center-meta-item"><p><span>Researched by:</span></p><ul class="research-hero__tooltips-list">${resolved
    .map((r) => `<li><span>${r.name}</span>${r.orcid ? `<a class="orchid-id" target="_blank" href="${r.orcid}">ID</a>` : ""}</li>`)
    .join("")}</ul></div>`;
  const bios = resolved
    .filter((r) => r.bio)
    .map(
      (r) =>
        `<div class="tooltip ${r.cls}"><div class="tooltip__header">${r.name}</div><div class="tooltip__content"><p>${
          r.avatar ? `<img alt="User avatar" src="${r.avatar}" class="avatar avatar-96 photo" height="96" width="96" />` : ""
        }${r.bio}</p></div></div>`
    )
    .join("");
  return `<div class="research-hero__center-meta">${photoRow}${names}${bios}</div>`;
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
  // Inject the auto-derived "Connections" list above the right-rail actions (Send feedback).
  const connBlock = connectionsBlockHtml(html, path, meta.connections);
  const withConn = connBlock
    ? html.replace(/<div\b[^>]*\bresearch-content__right-actions\b[^>]*>/, (m) => connBlock + m)
    : html;
  // Author at the top of every page: inject the "Researched by" block (with a visible
  // author photo row) into captured heroes that lack one.
  const withAuthor =
    authors.length && !/Researched\s*by/i.test(withConn)
      ? withConn
          .replace(/research-hero__center-content--fullwidth/g, "research-hero__center-content")
          .replace(/(<h1\b[^>]*\bresearch-hero__center-title\b[^>]*>[\s\S]*?<\/h1>)/, (m) => m + researchedByHtml(authors))
      : withConn;
  let content = dePurple(injectFaqs(linkifyClassifications(withAuthor), faqs));
  // Fill the Page Snapshot counts the way front.js used to (it's not loaded): References =
  // distinct [n] citations; Identified MMAs = signature taxa given their own sidebar.
  const refCount = referenceCount(content);
  const mmaCount = signatureMmaCount(meta);
  if (refCount) content = content.replace(/(<span class="js-count-references">)\s*(<\/span>)/g, `$1${refCount}$2`);
  if (mmaCount) content = content.replace(/(<span class="js-count-mmas">)\s*(<\/span>)/g, `$1${mmaCount}$2`);
  const sigStudies = extractSignatureStudies(content);
  const studies = sigStudies.length ? sigStudies : extractStudies(content);
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
