import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Returns an organism's modal-sidebar detail HTML for a given page. Universal sidebar rules:
//  - every prose section is capped to 650 characters (with spaces);
//  - sections are condition-flexible (endo: Metallome/Estrobolome; TB: Nutritional Immunity/
//    Metallomic Signature/Oxygen Ecology) — only the fields present render;
//  - a References section (the inline-citation sources) sits below Body site, above Studies
//    (Studies is rendered by the modal itself, after this detail HTML).

const CAP = 650;

// Cap an HTML fragment to CAP visible characters, trimming to a word boundary and closing
// any tags left open. Inline citation markup (sup/a) is preserved up to the cap.
function capHtml(html: string): string {
  let count = 0, out = "", i = 0;
  const open: string[] = [];
  const VOID = /^(br|img|hr|input|wbr|col)$/i;
  while (i < html.length && count < CAP) {
    if (html[i] === "<") {
      const j = html.indexOf(">", i);
      if (j < 0) break;
      const tag = html.slice(i, j + 1);
      out += tag;
      const m = tag.match(/^<\s*(\/?)\s*([a-z0-9]+)/i);
      if (m) {
        const name = m[2].toLowerCase();
        if (m[1]) { const k = open.lastIndexOf(name); if (k >= 0) open.splice(k, 1); }
        else if (!tag.endsWith("/>") && !VOID.test(name)) open.push(name);
      }
      i = j + 1;
    } else {
      out += html[i]; count++; i++;
    }
  }
  if (i < html.length) out = out.replace(/\s+\S*$/, "") + "…";
  for (let k = open.length - 1; k >= 0; k--) out += `</${open[k]}>`;
  return out;
}

type Organism = {
  overview?: string;
  nutritionalImmunity?: string;
  metallomicSignature?: string;
  metallome?: string;
  estrobolome?: string;
  oxygenEcology?: string;
  bodySite?: string;
  references?: string; // citation list (sources for the inline citations in the sections)
  link?: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const name = searchParams.get("name");
  if (!slug || !name) return NextResponse.json({ html: null });

  const { data } = await supabase
    .from("content_items")
    .select("meta")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  const meta = (data?.meta || {}) as {
    signature?: { details?: Record<string, string>; organisms?: Record<string, Organism> };
  };

  // Migrated pages store pre-rendered HTML in `details`; cap each section to 650 chars.
  const pre = meta.signature?.details?.[name];
  if (pre) {
    const capped = pre.replace(
      /(<details\b[^>]*>[\s\S]*?<\/summary>)([\s\S]*?)(<\/details>)/gi,
      (_m, head: string, body: string, tail: string) => head + capHtml(body) + tail
    );
    return NextResponse.json({ html: capped });
  }

  const o = meta.signature?.organisms?.[name];
  if (!o) return NextResponse.json({ html: null });

  // Prose sections (each capped). Order puts Overview first, then the condition's lenses,
  // then Body site. Only fields that exist render — condition-flexible.
  const sect = (label: string, text?: string) =>
    text && text.trim()
      ? `\n<details class="modal__details " open>\n\t<summary>\n\t${label}\t</summary>\n\t${capHtml(text.trim())}</details>\n`
      : "";
  const prose =
    sect("Overview", o.overview) +
    sect("Nutritional Immunity", o.nutritionalImmunity) +
    sect("Metallomic Signature", o.metallomicSignature) +
    sect("Metallome", o.metallome) +
    sect("Estrobolome", o.estrobolome) +
    sect("Oxygen Ecology", o.oxygenEcology) +
    sect("Body site", o.bodySite);

  // References sit BELOW Body site and ABOVE Studies (Studies is appended by the modal).
  const refs = o.references && o.references.trim()
    ? `\n<details class="modal__details " open>\n\t<summary>\n\tReferences\t</summary>\n\t${o.references.trim()}</details>\n`
    : "";
  const source = o.link && o.link.trim()
    ? `\n<details class="modal__details " open>\n\t<summary>\n\tSource\t</summary>\n\t<a href="${o.link.trim()}" target="_blank" rel="noreferrer">${o.link.trim()}</a></details>\n`
    : "";

  const built = prose + refs + source;
  return NextResponse.json({ html: built || null });
}
