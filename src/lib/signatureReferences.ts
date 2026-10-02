import verifiedMetadata from "./signatureReferenceMetadata.json" with { type: "json" };

type ReferenceMetadata = { doi: string | null; title: string; authors: string[]; journal: string; year: string; volume: string | null; issue: string | null; pages: string | null };
const metadata: Record<string, ReferenceMetadata> = verifiedMetadata;
const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (html: string) => html.replace(/<[^>]*>/g, "").trim();

function sourceLink(href: string, label: string) {
  return `<a class="signature-doi" href="${escape(href)}" target="_blank" rel="noreferrer">${escape(label)}</a>`;
}

function formatReference(html: string): string {
  const pmid = html.match(/https?:\/\/(?:www\.)?pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)?.[1];
  const record = pmid ? metadata[pmid] : undefined;
  if (record) {
    // Bibliographic metadata was verified against NCBI PubMed, 2026-10-02.
    // Preserve the identity and order of each stored reference, including repeated sources.
    const authors = record.authors.slice(0, 6).join(", ") + (record.authors.length > 6 ? ", et al" : "");
    const volume = record.volume ? `;${record.volume}${record.issue ? `(${record.issue})` : ""}${record.pages ? `:${record.pages}` : ""}` : "";
    const title = /[.!?]$/.test(record.title) ? record.title : `${record.title}.`;
    const citation = `${authors}. ${title} ${record.journal}. ${record.year}${volume}.`;
    return `${escape(citation)} ${record.doi ? sourceLink(`https://doi.org/${record.doi}`, record.doi) : sourceLink(`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, `PMID: ${pmid}`)}`;
  }
  // Existing DOI links and unverified sources retain their recorded destinations.
  const identifiers: string[] = [];
  const formatted = html.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (anchor, href: string, label: string) => {
    const doi = href.match(/^https?:\/\/(?:dx\.)?doi\.org\/(.+)$/i)?.[1];
    if (doi) {
      identifiers.push(sourceLink(href, doi));
      return /^(?:link|source|view source|(?:https?:\/\/(?:dx\.)?doi\.org\/)?10\.)/i.test(text(label)) ? "" : label;
    }
    if (!/^(?:link|source|view source)$/i.test(text(label))) return anchor;
    const id = href.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)?.[1];
    const pmc = href.match(/\bPMC\d+\b/i)?.[0];
    if (/^https?:\/\//i.test(href)) return sourceLink(href, id ? `PMID: ${id}` : pmc || href);
    return anchor;
  });
  return `${formatted}${identifiers.length ? " " + identifiers.join(" ") : ""}`;
}

/** Normalize the stored signature bibliography without truncating prose or references.
 * Missing/legacy [ref] placeholders stay unresolved; no source is inferred from prose.
 */
export function formatSignatureReferences(html: string, scope: string): string {
  const prefix = `signature-${scope.replace(/[^a-zA-Z0-9_-]/g, "-")}-ref`;
  const targets = new Map<number, string>();
  let result = html.replace(/<details\b[^>]*>\s*<summary\b[^>]*>\s*References\s*<\/summary>([\s\S]*?)<\/details>/gi,
    (_section, bibliography: string) => `<section class="signature-references" aria-label="References"><h4>References</h4>${bibliography}</section>`);
  result = result.replace(/<ol\b([^>]*)>([\s\S]*?)<\/ol>/gi, (original, attributes: string, body: string) => {
    if (!/rgbc-references/.test(attributes)) return original;
    let index = Number(attributes.match(/\bstart=["'](\d+)["']/i)?.[1] || 1);
    const items = body.replace(/<li\b([^>]*)>([\s\S]*?)<\/li>/gi, (_li, attrs: string, content: string) => {
      const number = Number(attrs.match(/\bvalue=["'](\d+)["']/i)?.[1] || index);
      index = number + 1;
      const id = `${prefix}-${number}`;
      targets.set(number, id);
      return `<li id="${id}" value="${number}" tabindex="-1">${formatReference(content)}</li>`;
    });
    return `<ol class="rgbc-references">${items}</ol>`;
  });
  result = result.replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (original, body: string) => {
    const match = text(body).match(/^\[?(\d+)\]?$/);
    if (!match) return original;
    const number = Number(match[1]);
    const id = targets.get(number);
    return id ? `<sup><a data-signature-reference href="#${id}" aria-label="Reference ${number}">[${number}]</a></sup>` : original;
  });
  return result;
}
