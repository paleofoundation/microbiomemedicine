// Captured WordPress pages may contain real chart data without meta.signature.
// Adapt those charts to the same viewer; never infer missing organism commentary.
type SignatureItem = { name: string; value: number; has_info: boolean };
const LEVELS = new Set(["Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species"]);

function attribute(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"))?.[2];
}
function decode(value: string): string {
  const entities: Record<string, string> = { quot: '"', apos: "'", amp: "&", lt: "<", gt: ">" };
  return value.replace(/&(#x[0-9a-f]+|#\d+|quot|apos|amp|lt|gt);/gi, (whole, entity: string) => {
    if (entity[0] !== "#") return entities[entity.toLowerCase()] || whole;
    const n = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
  });
}
function modalRange(html: string): [number, number] | null {
  const tags = /<!--[\s\S]*?-->|<\/?div\b[^>]*>/gi;
  let start = -1, depth = 0;
  for (const match of html.matchAll(tags)) {
    const tag = match[0];
    if (tag.startsWith("<!--")) continue;
    if (start < 0) {
      if (attribute(tag, "id") !== "research-diagram-modal") continue;
      start = match.index;
      depth = 1;
    } else {
      depth += /^<\//.test(tag) ? -1 : 1;
      if (depth === 0) return [start, match.index + tag.length];
    }
  }
  return null;
}

export function extractCapturedSignature(html: string): Record<string, SignatureItem[]> | null {
  const range = modalRange(html);
  if (!range) return null;
  const modal = html.slice(...range);
  const slides = [...modal.matchAll(/<div\b[^>]*\sdata-slide-name\s*=[^>]*>/gi)];
  const levels: Record<string, SignatureItem[]> = {};
  slides.forEach((slide, index) => {
    const level = attribute(slide[0], "data-slide-name");
    if (!level || !LEVELS.has(level)) return;
    const body = modal.slice(slide.index! + slide[0].length, slides[index + 1]?.index ?? modal.length);
    const svg = [...body.matchAll(/<svg\b[^>]*>/gi)].map((match) => match[0]).find((tag) => attribute(tag, "data-items") !== undefined);
    const items = svg && attribute(svg, "data-items");
    if (!items) return;
    try {
      const data: unknown = JSON.parse(decode(items));
      if (!Array.isArray(data)) return;
      const valid = data.filter((item) => item && typeof item.name === "string" && item.name.trim() && typeof item.value === "number" && Number.isFinite(item.value));
      if (valid.length) levels[level] = valid.map(({ name, value }) => ({ name, value, has_info: false }));
    } catch { /* An invalid captured level cannot safely be shown. */ }
  });
  return Object.keys(levels).length ? levels : null;
}

export function removeCapturedSignatureModal(html: string): string {
  const range = modalRange(html);
  return range ? html.slice(0, range[0]) + html.slice(range[1]) : html;
}
