"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

export type TaxonRow = {
  name: string; slug: string; level: string; domain: string;
  nConditions: number; dirPattern: string; bestTier: string;
  curationState: string;
};

const DOMAIN_STYLE: Record<string, { bg: string; fg: string }> = {
  Bacteria: { bg: "#eef2ff", fg: "#3730a3" },
  Fungi: { bg: "#fdf2f8", fg: "#9d174d" },
  Archaea: { bg: "#ecfeff", fg: "#155e75" },
  Viruses: { bg: "#f0fdf4", fg: "#166534" },
  "Eukaryota-other": { bg: "#fefce8", fg: "#854d0e" },
  Unknown: { bg: "#f3f4f6", fg: "#6b7280" },
};

function DomainBadge({ domain }: { domain: string }) {
  const s = DOMAIN_STYLE[domain] || DOMAIN_STYLE.Unknown;
  return <span style={{ background: s.bg, color: s.fg, borderRadius: 999, padding: ".12rem .5rem", fontSize: ".72rem", fontWeight: 600, whiteSpace: "nowrap" }}>{domain}</span>;
}

function TierPill({ tier }: { tier: string }) {
  // Grey affordance — a low grade is never danger-red (design law).
  const strong = tier === "High" || tier === "Moderate";
  return <span style={{ background: "#eef1f4", color: strong ? "#111827" : "#6b7280", border: "1px solid #e5e7eb", borderRadius: 999, padding: ".1rem .5rem", fontSize: ".72rem", whiteSpace: "nowrap" }}>{tier}</span>;
}

const dirGlyph = (d: string) => (d === "increased" ? "↑" : d === "decreased" ? "↓" : "↕");

export function TaxaIndexView({ taxa }: { taxa: TaxonRow[] }) {
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState("all");
  const [state, setState] = useState("all");
  const domains = useMemo(() => ["all", ...Array.from(new Set(taxa.map((t) => t.domain)))], [taxa]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return taxa.filter((t) =>
      (domain === "all" || t.domain === domain) &&
      (state === "all" || t.curationState === state) &&
      (!needle || t.name.toLowerCase().includes(needle))
    );
  }, [taxa, q, domain, state]);

  const sel = { padding: ".4rem .55rem", borderRadius: 6, border: "1px solid #d1d5db", fontSize: ".85rem", background: "#fff" };
  return (
    <div>
      <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1rem" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter taxa…" style={{ ...sel, minWidth: 200 }} />
        <select value={domain} onChange={(e) => setDomain(e.target.value)} style={sel}>
          {domains.map((d) => <option key={d} value={d}>{d === "all" ? "All domains" : d}</option>)}
        </select>
        <select value={state} onChange={(e) => setState(e.target.value)} style={sel}>
          <option value="all">All taxa</option>
          <option value="on-chart">On a chart</option>
          <option value="in-signatures-not-curated">In signatures, not curated (QA)</option>
        </select>
        <span style={{ color: "#6b7280", fontSize: ".82rem" }}>{rows.length} of {taxa.length}</span>
      </div>
      <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".86rem", minWidth: 640 }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#fafafa", color: "#374151" }}>
              {["Taxon", "Domain", "Level", "Conditions", "Best grade", "Curation"].map((h) => (
                <th key={h} style={{ padding: ".55rem .7rem", borderBottom: "1px solid #e5e7eb", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.level + t.slug} style={{ borderBottom: "1px solid #f1f2f4" }}>
                <td style={{ padding: ".5rem .7rem" }}>
                  <Link href={`/taxa/${t.slug}`} style={{ color: "#cc3333", textDecoration: "none", fontStyle: "italic" }}>{t.name}</Link>
                </td>
                <td style={{ padding: ".5rem .7rem" }}><DomainBadge domain={t.domain} /></td>
                <td style={{ padding: ".5rem .7rem", color: "#6b7280" }}>{t.level}</td>
                <td style={{ padding: ".5rem .7rem", whiteSpace: "nowrap", color: "#4b5563" }}>
                  {t.nConditions} {t.nConditions === 1 ? "condition" : "conditions"} <span style={{ color: "#9ca3af" }}>{dirGlyph(t.dirPattern)}</span>
                </td>
                <td style={{ padding: ".5rem .7rem" }}><TierPill tier={t.bestTier} /></td>
                <td style={{ padding: ".5rem .7rem", color: t.curationState === "on-chart" ? "#166534" : "#b45309", fontSize: ".78rem", whiteSpace: "nowrap" }}>
                  {t.curationState === "on-chart" ? "on chart" : "not curated"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
