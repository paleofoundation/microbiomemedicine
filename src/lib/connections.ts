// "Connections" = the other library entities a page links to in its body content
// (conditions, metals, interventions, definitions, microbes, supplements), shown as
// blue links in the right rail. Auto-derived from the page's own internal links — the
// original WordPress theme generated this client-side; here we derive it at render time.
export type Connection = { label: string; href: string; type: string };

const SEGMENTS = ["conditions", "metals", "interventions", "definition", "microbes", "supplement", "guide", "theory"];

export function extractConnections(html: string, selfPath = ""): Connection[] {
  if (!html) return [];
  const out: Connection[] = [];
  const seen = new Set<string>();
  const self = selfPath.replace(/\/+$/, "").toLowerCase();
  const re = new RegExp(
    `<a\\b[^>]*href="(/(?:${SEGMENTS.join("|")})/[^"#?]+)"[^>]*>([\\s\\S]*?)</a>`,
    "gi"
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = "/" + m[1].replace(/^\/|\/$/g, "");
    const key = href.toLowerCase();
    if (key === self || seen.has(key)) continue;
    const label = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!label) continue;
    seen.add(key);
    out.push({ label, href: href + "/", type: href.split("/")[1] });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}
