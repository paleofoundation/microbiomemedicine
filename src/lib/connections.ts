// "Connections" = up to 3 most-relevant library entities for a page, shown as blue links
// in the right rail above Send feedback. Originally hand-curated (conditions first, then a
// heavily-referenced intervention) — that field wasn't captured in migration, so:
//   1. meta.connections (curated override) wins when present, else
//   2. an auto-default: rank the entities the page links to by mention frequency,
//      conditions first, cap 3.
export type Connection = { label: string; href: string; type: string };

const SEGMENTS = ["conditions", "metals", "interventions", "definition", "microbes", "supplement", "guide", "theory"];
const MAX = 3;

// Auto-default: frequency-rank the page's internal entity links, conditions first, cap N.
export function autoConnections(html: string, selfPath = "", max = MAX): Connection[] {
  if (!html) return [];
  const self = selfPath.replace(/\/+$/, "").toLowerCase();
  const acc = new Map<string, { label: string; type: string; n: number }>();
  const re = new RegExp(
    `<a\\b[^>]*href="(?:https?:)?(?:\\/\\/[^\\/"]+)?(\\/(?:${SEGMENTS.join("|")})\\/[^"#?]+)"[^>]*>([\\s\\S]*?)<\\/a>`,
    "gi"
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = "/" + m[1].replace(/^\/|\/$/g, "");
    if (href.toLowerCase() === self) continue;
    const label = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!label) continue;
    const cur = acc.get(href);
    if (cur) cur.n++;
    else acc.set(href, { label, type: href.split("/")[1], n: 1 });
  }
  return [...acc.entries()]
    .map(([href, v]) => ({ href: href + "/", label: v.label, type: v.type, n: v.n }))
    .sort((a, b) => {
      const ac = a.type === "conditions" ? 0 : 1, bc = b.type === "conditions" ? 0 : 1;
      return ac - bc || b.n - a.n || a.label.localeCompare(b.label);
    })
    .slice(0, max)
    .map(({ label, href, type }) => ({ label, href, type }));
}

type Override = { label: string; href: string }[] | undefined | unknown;

// Curated override (meta.connections) wins; otherwise the auto-default.
export function resolveConnections(override: Override, html: string, selfPath = "", max = MAX): Connection[] {
  if (Array.isArray(override) && override.length) {
    return override
      .filter((o): o is { label: string; href: string } => !!o && typeof o.label === "string" && typeof o.href === "string")
      .slice(0, max)
      .map((o) => ({ label: o.label, href: o.href, type: (o.href.split("/")[1] || "") }));
  }
  return autoConnections(html, selfPath, max);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// HTML-string version for injection into verbatim WP markup.
export function connectionsBlockHtml(html: string, selfPath = "", override?: Override): string {
  const cons = resolveConnections(override, html, selfPath);
  if (!cons.length) return "";
  const items = cons.map((c) => `<li><a href="${esc(c.href)}">${esc(c.label)}</a></li>`).join("");
  return `<div class="research-content__connections"><span class="research-content__connections-title">Connections</span><ul class="research-content__connections-list">${items}</ul></div>`;
}
