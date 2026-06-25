"use client";
import { useState } from "react";

type Item = { name: string; value: number; has_info?: boolean };
const LEVEL_ORDER = ["Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species"];

function colorFor(value: number, hasInfo?: boolean): string {
  if (value > 0) return hasInfo ? "#f04c4c" : "#efbdbd";
  if (value < 0) return hasInfo ? "#183fab" : "#b5b9d2";
  return "#cbd5e1";
}

export function MicrobiomeSignature({
  slug,
  levels,
}: {
  slug: string;
  levels: Record<string, Item[]>;
}) {
  const available = LEVEL_ORDER.filter((l) => levels[l]?.length);
  const [level, setLevel] = useState(available.includes("Genus") ? "Genus" : available[0]);
  const [active, setActive] = useState<string | null>(null);
  const [detail, setDetail] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const items = [...(levels[level] || [])].sort((a, b) => b.value - a.value);

  async function open(name: string) {
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

  const size = 640;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 150;
  const n = items.length || 1;

  return (
    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 420px", minWidth: 0 }}>
        <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginBottom: ".75rem" }}>
          {available.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              style={{
                padding: ".3rem .7rem", borderRadius: 6, border: "1px solid #e5e7eb",
                background: l === level ? "#cc3333" : "#fff", color: l === level ? "#fff" : "#333",
                fontSize: ".8rem", cursor: "pointer",
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <p style={{ textAlign: "center", fontWeight: 600, marginBottom: ".25rem" }}>
          Relative Abundance ({level})
        </p>
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: size, height: "auto" }}>
          {items.map((it, i) => {
            const ang = (i / n) * 2 * Math.PI - Math.PI / 2;
            const dx = cx + R * Math.cos(ang);
            const dy = cy + R * Math.sin(ang);
            const lx = cx + (R + 14) * Math.cos(ang);
            const ly = cy + (R + 14) * Math.sin(ang);
            const deg = (ang * 180) / Math.PI;
            const left = Math.cos(ang) < 0;
            const rot = left ? deg + 180 : deg;
            const col = colorFor(it.value, it.has_info);
            return (
              <g
                key={i}
                style={{ cursor: it.has_info ? "pointer" : "default" }}
                onClick={() => it.has_info && open(it.name)}
              >
                <circle cx={dx} cy={dy} r={6} fill={col} stroke={active === it.name ? "#000" : "none"} strokeWidth={2} />
                <text
                  x={lx} y={ly} fontSize={11} fill={col} fontWeight={it.has_info ? 700 : 400}
                  textAnchor={left ? "end" : "start"} dominantBaseline="middle"
                  transform={`rotate(${rot} ${lx} ${ly})`}
                >
                  [{it.value}] {it.name}
                </text>
              </g>
            );
          })}
        </svg>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", fontSize: ".75rem", marginTop: ".5rem", color: "#444" }}>
          <span style={{ color: "#f04c4c" }}>● Increased (info)</span>
          <span style={{ color: "#efbdbd" }}>● Increased</span>
          <span style={{ color: "#183fab" }}>● Decreased (info)</span>
          <span style={{ color: "#b5b9d2" }}>● Decreased</span>
        </div>
      </div>

      <div style={{ flex: "1 1 300px", minWidth: 0, borderLeft: "1px solid #eee", paddingLeft: "1.5rem" }}>
        {active ? (
          <>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.2rem", marginBottom: ".5rem", color: "#cc3333" }}>{active}</h3>
            {loading ? <p>Loading…</p> : <div className="organism-detail" dangerouslySetInnerHTML={{ __html: detail }} />}
          </>
        ) : (
          <p style={{ color: "#6b7280" }}>
            Select a highlighted organism (solid dot) to see its Overview, Metallome, Estrobolome, Body-site, and Studies.
          </p>
        )}
      </div>
    </div>
  );
}
