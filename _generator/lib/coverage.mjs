// Detection-aperture layer: what a sequencing method can and cannot SEE.
// Kept strictly separate from the evidence weight (grade.mjs). This is where a
// method's cross-kingdom breadth lives — e.g. 16S is a bacterial/archaeal marker
// gene and is BLIND to fungi, so a fungus in a 16S-only corpus scores a detection
// artifact, not a true absence. See docs/EVIDENCE-GRADING.md §4.

// --- domain resolution (fixes the double-k__ convention) -----------------------
// MetaPhlAn/NCBI lineages in this corpus carry TWO k__ tokens, e.g.
//   k__Bacteria|k__Bacillati|p__Bacillota|...   (domain Bacteria, NCBI-kingdom Bacillati)
// A Candida lineage would be k__Eukaryota|k__Fungi|p__Ascomycota|...
// Resolve the biological DOMAIN by scanning ALL k__ tokens against a rank table —
// never "the k__ token" (undefined here) and never a name substring (which would let
// p__Candidatus Saccharibacteria, a bacterium, mis-match Candida albicans, a fungus).
export function domainOfLineage(lineage) {
  const ks = String(lineage || "")
    .split("|")
    .map((t) => t.trim())
    .filter((t) => /^k__/.test(t))
    .map((t) => t.slice(3).trim());
  if (ks.includes("Bacteria")) return "Bacteria";
  if (ks.includes("Archaea")) return "Archaea";
  if (ks.includes("Viruses") || ks.includes("Viroids")) return "Viruses";
  if (ks.includes("Fungi")) return "Fungi";
  if (ks.includes("Eukaryota")) return "Eukaryota-other";
  return "Unknown";
}

// Domain of a possibly comma-joined MetaPhlAn cell (multiple lineages). Returns the
// first resolvable non-Unknown domain (rows in this corpus are single-domain).
export function domainOfCell(cell) {
  for (const lin of String(cell || "").split(",")) {
    const d = domainOfLineage(lin);
    if (d !== "Unknown") return d;
  }
  return "Unknown";
}

// --- low-biomass sites (contamination-control sensitive) -----------------------
export const LOW_BIOMASS_SET = new Set([
  "endometrium", "uterus", "uterovesical pouch", "ovary", "peritoneal fluid",
  "endometrioma", "uterine cervix", "cervical cavity", "fallopian tube",
  "posterior fornix", "cystic fluid", "endometrial fluid", "lesion",
]);

// --- method normalisation ------------------------------------------------------
export function methodKey(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return "UNKNOWN";
  if (/WMS|SHOTGUN|METAGENOM|WGS/.test(s)) return "WMS";
  if (/ITS/.test(s)) return "ITS";          // ITS / ITS2
  if (/18S/.test(s)) return "18S";
  if (/16S/.test(s)) return "16S";
  if (/VIROM|PHAGE/.test(s)) return "VIROME";
  if (/QPCR|Q-PCR|TARGET|IHC|CULTURE-INDEP/.test(s)) return "QPCR"; // targeted single-taxon
  if (/CULTURE/.test(s)) return "CULTURE";
  return "UNKNOWN";
}

// --- capability matrix: method -> detectable domain --------------------------
// weights: full=1.0, partial=0.5, conditional=0.25, none=0.0
const F = 1.0, P = 0.5, C = 0.25, N = 0.0;
export const DOMAINS = ["Bacteria", "Archaea", "Fungi", "Viruses"];
const CAPABILITY = {
  "16S":     { Bacteria: F, Archaea: P, Fungi: N, Viruses: N },
  "WMS":     { Bacteria: F, Archaea: F, Fungi: C, Viruses: C },
  "ITS":     { Bacteria: N, Archaea: N, Fungi: F, Viruses: N },
  "18S":     { Bacteria: N, Archaea: N, Fungi: F, Viruses: N },
  "VIROME":  { Bacteria: N, Archaea: N, Fungi: N, Viruses: F },
  "QPCR":    { Bacteria: C, Archaea: C, Fungi: C, Viruses: C }, // detects only its named target
  "CULTURE": { Bacteria: P, Archaea: N, Fungi: P, Viruses: N },
  "UNKNOWN": { Bacteria: N, Archaea: N, Fungi: N, Viruses: N }, // fail-safe: never counts as coverage
};

// Can a method detect this domain? Returns the capability weight [0..1].
export function capability(seqTypeRaw, domain) {
  const m = CAPABILITY[methodKey(seqTypeRaw)] || CAPABILITY.UNKNOWN;
  return m[domain] ?? 0;
}

// Human-readable coverage glyph for the modal strip: ● full, ◐ partial, ○ none.
export function coverageGlyph(frac) {
  if (frac >= 0.5) return "●";       // ●
  if (frac >= 0.1) return "◐";       // ◐
  return "○";                         // ○
}
