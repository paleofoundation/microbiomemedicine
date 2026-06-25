"use client";
import { useEffect, useState } from "react";

type Item = { name: string; value: number; has_info?: boolean };
const LEVEL_ORDER = ["Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species"];
const SIGNATURE_DEF =
  "A microbiome signature is defined through a comprehensive approach that integrates differential abundance analysis across multiple datasets, followed by interpretation for biological relevance. This rigorous process ensures that the identified signature is both statistically robust and biologically meaningful. Associations that do not meet statistical significance or lack mechanistic relevance are excluded from the final signature.";

function colorFor(value: number, hasInfo?: boolean): string {
  if (value > 0) return hasInfo ? "#f04c4c" : "#efbdbd";
  if (value < 0) return hasInfo ? "#183fab" : "#b5b9d2";
  return "#cbd5e1";
}

export function MicrobiomeSignature({
  slug,
  title,
  levels,
  studies,
}: {
  slug: string;
  title: string;
  levels: Record<string, Item[]>;
  studies: { title: string; url: string }[];
}) {
  const available = LEVEL_ORDER.filter((l) => levels[l]?.length);
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(available.includes("Genus") ? "Genus" : available[0]);
  const [active, setActive] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // The hero "Microbiome Signature" button carries data-modal-id="research-diagram-modal".
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = (e.target as HTMLElement)?.closest?.('[data-modal-id="research-diagram-modal"]');
      if (t) { e.preventDefault(); setOpen(true); }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function openOrg(name: string) {
    setActive(name);
    setLoading(true);
    setDetail("");
    try {
      const r = await fetch(`/api/organism?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}`);
      const j = await r.json();
      setDetail(j.html || "<p>No details available.</p>");
    } catch {
      setDetail("<p>Could not load details.</p>");
    }
    setLoading(false);
  }

  if (!open) return null;

  const items = [...(levels[level] || [])].sort((a, b) => b.value - a.value);
  const size = 560, cx = size / 2, cy = size / 2, R = size / 2 - 165, n = items.length || 1;
  const maxVal = Math.max(...items.map((x) => x.value), 1);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
    >
      <div role="dialog" aria-label={`Microbiome signature for ${title}`} style={{ background: "#fff", borderRadius: 12, maxWidth: 1080, width: "100%", maxHeight: "92vh", overflow: "auto", display: "flex", flexWrap: "wrap", position: "relative" }}>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          style={{ position: "absolute", top: 12, right: 14, border: "none", background: "transparent", fontSize: "1.6rem", lineHeight: 1, cursor: "pointer", color: "#888", zIndex: 2 }}
        >
          ✕
        </button>

        <div style={{ flex: "1 1 480px", minWidth: 0, padding: 0 }}>
          <div style={{ position: "relative" }}>
            <div style={{ background: "#cc3333", color: "#fff", padding: ".7rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem", fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "1.1rem", borderRadius: "12px 0 0 0" }}>
              <span
                onMouseEnter={() => setShowInfo(true)}
                onMouseLeave={() => setShowInfo(false)}
                aria-label="What is a microbiome signature?"
                style={{ cursor: "help", border: "1.5px solid #fff", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: ".72rem", fontStyle: "italic", flexShrink: 0, fontFamily: "var(--font-sans)" }}
              >i</span>
              Relative Abundance ({level})
            </div>
            {showInfo && (
              <div style={{ position: "absolute", top: "calc(100% - 4px)", left: 16, zIndex: 5, background: "#fff", color: "#222", padding: "1.1rem 1.35rem", borderRadius: 8, boxShadow: "0 14px 34px rgba(0,0,0,.24)", maxWidth: 400, fontSize: ".88rem", lineHeight: 1.55 }}>
                {SIGNATURE_DEF}
              </div>
            )}
          </div>
          <div style={{ padding: "1.25rem 1.5rem" }}>
          <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: size, height: "auto" }}>
            {items.map((it, i) => {
              const ang = (i / n) * 2 * Math.PI - Math.PI / 2;
              const rad = it.value > 0 ? 6 + 22 * (it.value / maxVal) : 6;
              const dx = cx + R * Math.cos(ang), dy = cy + R * Math.sin(ang);
              const lx = cx + (R + rad + 8) * Math.cos(ang), ly = cy + (R + rad + 8) * Math.sin(ang);
              const deg = (ang * 180) / Math.PI, left = Math.cos(ang) < 0, rot = left ? deg + 180 : deg;
              const col = colorFor(it.value, it.has_info);
              return (
                <g key={i} style={{ cursor: it.has_info ? "pointer" : "default" }} onClick={() => it.has_info && openOrg(it.name)}>
                  <circle cx={dx} cy={dy} r={rad} fill={col} stroke={active === it.name ? "#000" : "none"} strokeWidth={2} />
                  <text x={lx} y={ly} fontSize={11} fill={col} fontWeight={it.has_info ? 700 : 400} textAnchor={left ? "end" : "start"} dominantBaseline="middle" transform={`rotate(${rot} ${lx} ${ly})`}>[{it.value}] {it.name}</text>
                </g>
              );
            })}
          </svg>
          <div style={{ display: "flex", gap: ".35rem", flexWrap: "wrap", justifyContent: "center", marginTop: ".85rem" }}>
            {available.map((l) => (
              <button key={l} onClick={() => setLevel(l)} style={{ padding: ".3rem .7rem", borderRadius: 6, border: "1px solid #e5e7eb", background: l === level ? "#cc3333" : "#fff", color: l === level ? "#fff" : "#333", fontSize: ".78rem", cursor: "pointer" }}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", fontSize: ".72rem", marginTop: ".75rem", color: "#444" }}>
            <span style={{ color: "#f04c4c" }}>● Increased (info)</span>
            <span style={{ color: "#efbdbd" }}>● Increased</span>
            <span style={{ color: "#183fab" }}>● Decreased (info)</span>
            <span style={{ color: "#b5b9d2" }}>● Decreased</span>
          </div>
          </div>
        </div>

        <div style={{ flex: "1 1 300px", minWidth: 0, borderLeft: "1px solid #eee", padding: "1.5rem", background: "#fafafa" }}>
          {active ? (
            <>
              <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem", marginBottom: ".5rem", color: "#cc3333" }}>{active}</h4>
              {loading ? <p>Loading…</p> : <div className="organism-detail" dangerouslySetInnerHTML={{ __html: detail }} />}
            </>
          ) : (
            <p style={{ color: "#6b7280" }}>Select a highlighted organism (solid dot) to see its Overview, Metallome, Estrobolome, Body-site, and Studies.</p>
          )}
          {studies.length > 0 && (
            <details open style={{ marginTop: "1.25rem", borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
              <summary style={{ color: "#cc3333", fontWeight: 600, fontFamily: "var(--font-serif)", fontSize: "1.05rem", cursor: "pointer" }}>Studies</summary>
              <ul style={{ margin: ".6rem 0 0", paddingLeft: "1.1rem", maxHeight: 260, overflowY: "auto", fontSize: ".82rem", lineHeight: 1.5 }}>
                {studies.map((s, i) => (
                  <li key={i} style={{ marginBottom: ".45rem" }}>
                    <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "#cc3333", textDecoration: "none" }}>{s.title}</a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
