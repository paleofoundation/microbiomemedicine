// "Connections" = the other library entities a page links to in its body content
// (conditions, metals, interventions, definitions, microbes, supplements), shown as
// blue links in the right rail above Send feedback. Auto-derived from the page's own
// internal links — the original WordPress theme generated this; we derive it at render time.
export type Connection = { label: string; href: string; type: string };

const SEGMENTS = ["conditions", "metals", "interventions", "definition", "microbes", "supplement", "guide", "theory"];

export function extractConnections(html: string, selfPath = ""): Connection[] {
  if (!html) return [];
  const out: Connection[] = [];
  const seen = new Set<string>();
  const self = selfPath.replace(/\/+$/, "").toLowerCase();
  // tolerate root-relative (/definition/x) and absolute (https://host/definition/x) hrefs
  const re = new RegExp(
    `<a\\b[^>]*href="(?:https?:)?(?:\\/\\/[^\\/"]+)?(\\/(?:${SEGMENTS.join("|")})\\/[^"#?]+)"[^>]*>([\\s\\S]*?)<\\/a>`,
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

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// HTML string version of the Connections block, for injection into verbatim WP markup.
export function connectionsBlockHtml(html: string, selfPath = ""): string {
  const cons = extractConnections(html, selfPath);
  if (!cons.length) return "";
  const items = cons.map((c) => `<li><a href="${esc(c.href)}">${esc(c.label)}</a></li>`).join("");
  return `<div class="research-content__connections"><span class="research-content__connections-title">Connections</span><ul class="research-content__connections-list">${items}</ul></div>`;
}
