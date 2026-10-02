import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { formatSignatureReferences } from "@/lib/signatureReferences";

// Preserve authored prose and complete bibliographies. Presentation and scoped citation
// links are normalized in one place for both migrated and structured content.

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

  let data: { meta?: unknown } | null = null;
  try {
    const res = await supabase
      .from("content_items")
      .select("meta")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();
    data = res.data as { meta?: unknown } | null;
  } catch {
    return NextResponse.json({ html: null });
  }

  const meta = (data?.meta || {}) as {
    signature?: { details?: Record<string, string>; organisms?: Record<string, Organism> };
  };

  const scope = `${slug}-${name}`;
  const pre = meta.signature?.details?.[name];
  if (pre) return NextResponse.json({ html: formatSignatureReferences(pre, scope) });

  const o = meta.signature?.organisms?.[name];
  if (!o) return NextResponse.json({ html: null });

  // Authored prose sections. Order puts Overview first, then the condition's lenses,
  // then Body site. Only fields that exist render — condition-flexible.
  const sect = (label: string, text?: string) =>
    text && text.trim()
      ? `\n<details class="modal__details " open>\n\t<summary>\n\t${label}\t</summary>\n\t${text.trim()}</details>\n`
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
  return NextResponse.json({ html: built ? formatSignatureReferences(built, scope) : null });
}
