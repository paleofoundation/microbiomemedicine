// Universal content rules (Karen): NO em-dashes and NO visible ampersands, anywhere.
// Applied at render to every page body so the 575+ migrated rows are covered without
// hand-editing each one. Self-protecting against URLs / entities / attributes:
//   - em-dash (— or &mdash;) never appears in URLs or attributes; a numeric range becomes
//     "to", any other em-dash becomes ", " (a comma).
//   - an ampersand is only rewritten to "and" when it is SPACE-flanked prose ("X & Y" or
//     "X &amp; Y"). URL params (?s=96&d=mm), HTML entities (&amp; &nbsp; &mdash;), and the
//     JS && operator have no surrounding space, so they are left untouched by construction.
export function applyTextRules(html: string): string {
  if (!html) return html;
  return html
    .replace(/(\d)\s*(?:—|&mdash;|—)\s*(\d)/g, "$1 to $2")
    .replace(/\s*(?:—|&mdash;|—)\s*/g, ", ")
    .replace(/([A-Za-z0-9)\]])\s(?:&amp;|&)\s([A-Za-z0-9(\[])/g, "$1 and $2");
}
