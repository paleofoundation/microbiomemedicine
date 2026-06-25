"use client";
import { useEffect, useState } from "react";

type Item = { name: string; value: number; has_info?: boolean };
const LEVEL_ORDER = ["Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species"];

function colorFor(value: number, hasInfo?: boolean): string {
  if (value > 0) return hasInfo ? "#f04c4c" : "#efbdbd";
  if (value < 0) return hasInfo ? "#183fab" : "#b5b9d2";
  return "#cbd5e1";
}

export function MicrobiomeSignature({
  slug,
  title,
  levels,
}: {
  slug: string;
  title: string;
  levels: Record<string, Item[]>;
}) {
  const available = LEVEL_ORDER.filter((l) => levels[l]?.length);
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(available.includes("Genus") ? "Genus" : available[0]);
  const [active, setActive] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);

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
  const size = 560, cx = size / 2, cy = size / 2, R = size / 2 - 135, n = items.length || 1;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
    >
      <div style={{ background: "#fff", borderRadius: 12, maxWidth: 1080, width: "100%", maxHeight: "92vh", overflow: "auto", display: "flex", flexWrap: "wrap", position: "relative" }}>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          style={{ position: "absolute", top: 12, right: 14, border: "none", background: "transparent", fontSize: "1.6rem", lineHeight: 1, cursor: "pointer", color: "#888", zIndex: 2 }}
        >
          ✕
        </button>

        <div style={{ flex: "1 1 480px", minWidth: 0, padding: "1.5rem" }}>
          <h3 style={{ fontFamily: "var(--font-serif)", color: "#cc3333", fontSize: "1.2rem", marginBottom: ".9rem" }}>
            Microbiome Signature: {title}
          </h3>
          <div style={{ display: "flex", gap: ".35rem", flexWrap: "wrap", marginBottom: ".5rem" }}>
            {available.map((l) => (
              <button key={l} onClick={() => setLevel(l)} style={{ padding: ".25rem .65rem", borderRadius: 6, border: "1px solid #e5e7eb", background: l === level ? "#cc3333" : "#fff", color: l === level ? "#fff" : "#333", fontSize: ".78rem", cursor: "pointer" }}>{l}</button>
            ))}
          </div>
          <p style={{ textAlign: "center", fontWeight: 600, margin: ".25rem 0" }}>Relative Abundance ({level})</p>
          <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: size, height: "auto" }}>
            {items.map((it, i) => {
              const ang = (i / n) * 2 * Math.PI - Math.PI / 2;
              const dx = cx + R * Math.cos(ang), dy = cy + R * Math.sin(ang);
              const lx = cx + (R + 12) * Math.cos(ang), ly = cy + (R + 12) * Math.sin(ang);
              const deg = (ang * 180) / Math.PI, left = Math.cos(ang) < 0, rot = left ? deg + 180 : deg;
              const col = colorFor(it.value, it.has_info);
              return (
                <g key={i} style={{ cursor: it.has_info ? "pointer" : "default" }} onClick={() => it.has_info && openOrg(it.name)}>
                  <circle cx={dx} cy={dy} r={6} fill={col} stroke={active === it.name ? "#000" : "none"} strokeWidth={2} />
                  <text x={lx} y={ly} fontSize={11} fill={col} fontWeight={it.has_info ? 700 : 400} textAnchor={left ? "end" : "start"} dominantBaseline="middle" transform={`rotate(${rot} ${lx} ${ly})`}>[{it.value}] {it.name}</text>
                </g>
              );
            })}
          </svg>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", fontSize: ".72rem", marginTop: ".4rem", color: "#444" }}>
            <span style={{ color: "#f04c4c" }}>● Increased (info)</span>
            <span style={{ color: "#efbdbd" }}>● Increased</span>
            <span style={{ color: "#183fab" }}>● Decreased (info)</span>
            <span style={{ color: "#b5b9d2" }}>● Decreased</span>
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
        </div>
      </div>
    </div>
  );
}
