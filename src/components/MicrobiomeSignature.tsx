"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./MicrobiomeSignature.module.css";

type Item = { name: string; value: number; has_info?: boolean; tier?: string; direction?: string; agreementBin?: string; domain?: string };
type ConditionEvidence = {
  nStudies?: number; nExperiments?: number;
  methodMix?: Record<string, number>;
  domainCoverage?: Record<string, { frac: number; glyph: string }>;
  methodMonoculture?: boolean; coverageStrip?: string;
};
const LEVEL_ORDER = ["Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species"];
const SIGNATURE_DEF =
  "A microbiome signature is defined through a comprehensive approach that integrates differential abundance analysis across multiple datasets, followed by interpretation for biological relevance. This rigorous process ensures that the identified signature is both statistically robust and biologically meaningful. Associations that do not meet statistical significance or lack mechanistic relevance are excluded from the final signature.";

function colorFor(value: number, hasInfo?: boolean): string {
  if (value > 0) return hasInfo ? "#f04c4c" : "#efbdbd";
  if (value < 0) return hasInfo ? "#183fab" : "#b5b9d2";
  return "#cbd5e1";
}

// Circumference-packing layout (identical to the inline chart and the original front.js):
// circles are sized up to 50px, the ring radius grows so neighbours never overlap (5px gap).
const W = 600;
function packed(items: Item[]) {
  const cx = W / 2, cy = W / 2;
  const its = items.map((it) => ({ ...it, radius: 0, angle: 0 }));
  if (!its.length) return { list: [] as (Item & { dx: number; dy: number; lx: number; ly: number; rotDeg: number; leftSide: boolean; txt: string; radius: number })[], vb: `0 0 ${W} ${W}` };
  let maxRaw = 0;
  its.forEach((it) => { it.radius = Math.abs(it.value); if (it.radius > maxRaw) maxRaw = it.radius; });
  const scale = maxRaw > 50 ? 50 / maxRaw : 1;
  let totalSpan = 0;
  its.forEach((it) => { const r = Math.max(Math.round(it.radius * scale), 5); totalSpan += 2 * r + 5; it.radius = r; });
  maxRaw *= scale;
  const baseR = W / 2;
  const ringR = Math.max(baseR * (totalSpan / (2 * Math.PI * baseR)), maxRaw + 5);
  let sumAng = 0;
  for (let i = 0; i < its.length; i++) {
    const a = 2 * Math.asin(Math.max(-1, Math.min(1, (its[i].radius + its[(i + 1) % its.length].radius + 5) / (2 * ringR))));
    its[i].angle = a; sumAng += a;
  }
  const norm = (2 * Math.PI) / sumAng;
  its.forEach((it) => { it.angle *= norm; });
  let angle = -Math.PI / 4; // start at -45deg, clockwise
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const list = its.map((it) => {
    const t = angle, deg = (180 * t) / Math.PI;
    const dx = cx + Math.cos(t) * ringR, dy = cy + Math.sin(t) * ringR;
    const leftSide = deg < -90 && deg > -270;
    const labelR = it.radius + 5;
    const lx = cx + Math.cos(t) * (ringR + labelR), ly = cy + Math.sin(t) * (ringR + labelR);
    const rotDeg = leftSide ? deg + 180 : deg;
    const txt = `${it.name} (${it.value > 0 ? "+" : ""}${it.value})`;
    // Include all four corners of the rotated label, not the original 600px canvas.
    const tw = txt.length * 7.2, rotation = rotDeg * Math.PI / 180;
    const start = leftSide ? -tw : 0, end = leftSide ? 0 : tw;
    minX = Math.min(minX, dx - it.radius - 8); maxX = Math.max(maxX, dx + it.radius + 8);
    minY = Math.min(minY, dy - it.radius - 8); maxY = Math.max(maxY, dy + it.radius + 8);
    for (const x of [start, end]) for (const y of [-9, 9]) {
      const px = lx + x * Math.cos(rotation) - y * Math.sin(rotation);
      const py = ly + x * Math.sin(rotation) + y * Math.cos(rotation);
      minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
    angle -= it.angle;
    return { ...it, dx, dy, lx, ly, rotDeg, leftSide, txt };
  });
  const pad = 18;
  return { list, vb: `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}` };
}

export function MicrobiomeSignature({
  slug,
  title,
  levels,
  studies,
  evidence,
  defaultOpen = false,
}: {
  slug: string;
  title: string;
  levels: Record<string, Item[]>;
  studies: { title: string; url: string }[];
  evidence?: ConditionEvidence;
  defaultOpen?: boolean;
}) {
  const available = LEVEL_ORDER.filter((l) => levels[l]?.length);
  const [open, setOpen] = useState(defaultOpen);
  // Default to Genus (the primary signature level shown in the inline chart), as in the original.
  const [level, setLevel] = useState(available.includes("Genus") ? "Genus" : available[available.length - 1] || available[0]);
  const [active, setActive] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  const dialog = useRef<HTMLDialogElement>(null);
  const detailPane = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [retry, setRetry] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.('[data-modal-id="research-diagram-modal"]');
      if (target) { e.preventDefault(); setOpen(true); }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!open || !mounted || !dialog.current) return;
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const items = levels[level] || [];
    setActive((current) => items.some((x) => x.name === current) ? current :
      (items.find((x) => x.has_info && x.value > 0) || items.find((x) => x.has_info) || items[0])?.name || null);
  }, [open, level, levels]);

  const activeItem = (levels[level] || []).find((x) => x.name === active);
  useEffect(() => {
    if (!open || !active) return;
    const controller = new AbortController();
    setDetail("");
    setFailed(false);
    detailPane.current?.scrollTo(0, 0);
    if (!activeItem?.has_info) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/organism?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(active)}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Unavailable"); return response.json(); })
      .then((result) => { if (!controller.signal.aborted) setDetail(result.html || ""); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [active, activeItem?.has_info, open, slug, retry]);

  const { list, vb } = useMemo(() => packed(levels[level] || []), [levels, level]);
  if (!open || !mounted) return null;

  return createPortal(
    <dialog ref={dialog} className={styles.overlay} aria-label={`Microbiome signature for ${title}`}
      onCancel={(event) => { event.preventDefault(); setOpen(false); }}
      onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <button className={styles.close} onClick={() => setOpen(false)} aria-label="Close microbiome signature" autoFocus>×</button>
      <section className={styles.chart} aria-label="Microbiome signature">
        <header className={styles.chartHeader}>
          <div><h2>Microbiome signature</h2><p>{title}</p></div>
          <button className={styles.info} aria-label="What is a microbiome signature?" aria-expanded={showInfo} onClick={() => setShowInfo(!showInfo)}>i</button>
          {showInfo && <div className={styles.definition}>{SIGNATURE_DEF}</div>}
        </header>
        <div className={styles.levels} aria-label="Taxonomic level">
          {available.map((name) => <button key={name} aria-pressed={level === name} onClick={() => { setLevel(name); setHovered(null); }}>{name}</button>)}
        </div>
        <div className={styles.diagram}>
          <div className={styles.compactSignature} aria-label={`${level} signature`}>
            {(levels[level] || []).map((item) => <button key={item.name} aria-pressed={active === item.name}
              className={item.value > 0 ? styles.increased : styles.decreased} onClick={() => setActive(item.name)}>
              <span className={styles.compactDot} style={{ opacity: item.has_info ? 1 : .35 }} aria-hidden="true" />
              <span>{item.name}</span><span>{item.value > 0 ? "+" : ""}{item.value}</span>
            </button>)}
          </div>
          <svg viewBox={vb} aria-label={`Relative abundance at ${level?.toLowerCase()} level`}>
            {list.map((item, index) => {
              const color = colorFor(item.value, true);
              const selected = active === item.name;
              return <g key={item.name} className={styles.taxon} role="button" tabIndex={0}
                aria-label={`${item.name}, ${item.value > 0 ? "increased" : item.value < 0 ? "decreased" : "unchanged"}, ${item.value}${item.has_info ? ", details available" : ""}`}
                aria-pressed={selected} onClick={() => setActive(item.name)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActive(item.name); } }}
                onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)}>
                <circle cx={item.dx} cy={item.dy} r={Math.max(item.radius + 7, 17)} fill={color} fillOpacity={selected ? 0.13 : 0} />
                <circle cx={item.dx} cy={item.dy} r={item.radius} fill={color} fillOpacity={item.has_info ? (selected || hovered === index ? 1 : 0.72) : 0.3} />
                <text x={item.lx} y={item.ly} fontSize={14} fill={color} textAnchor={item.leftSide ? "end" : "start"} dominantBaseline="middle" transform={`rotate(${item.rotDeg} ${item.lx} ${item.ly})`}>{item.txt}</text>
              </g>;
            })}
          </svg>
        </div>
        <div className={styles.legend}><span className={styles.increased}>↑ Increased</span><span className={styles.decreased}>↓ Decreased</span><span>Solid dots: details available</span></div>
        <label className={styles.picker}>Organism
          <select value={active || ""} onChange={(event) => setActive(event.target.value)}>
            {!active && <option value="">Select an organism</option>}
            {(levels[level] || []).map((item) => <option key={item.name} value={item.name}>{item.name} ({item.value > 0 ? "+" : ""}{item.value})</option>)}
          </select>
        </label>
      </section>
      <aside className={styles.sidebar} aria-label="Organism details">
        <header className={styles.detailHeader}>
          <p className={styles.eyebrow}>{level} · Relative abundance</p>
          <h3>{active || "Select an organism"}</h3>
          <div className={styles.metadata}>
            {activeItem && <span className={activeItem.value > 0 ? styles.increased : styles.decreased}>{activeItem.value > 0 ? "↑ Increased" : activeItem.value < 0 ? "↓ Decreased" : "Unchanged"}</span>}
            {activeItem?.tier && <span className={styles.certainty}>{activeItem.tier} certainty</span>}
            {activeItem?.agreementBin && <span>{activeItem.agreementBin} agreement</span>}
            {activeItem?.domain && activeItem.domain !== "Unknown" && <span>{activeItem.domain}</span>}
          </div>
        </header>
        <div ref={detailPane} className={styles.detailScroll}>
          <div aria-live="polite" aria-busy={loading}>
            {loading ? <p className={styles.status}>Loading details…</p> : failed ? <p className={styles.status}>Could not load details. <button onClick={() => setRetry(retry + 1)}>Try again</button></p> : detail ?
              <div className={styles.prose} dangerouslySetInnerHTML={{ __html: detail }} onClick={(event) => {
                const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[data-signature-reference]");
                if (!anchor) return;
                const target = dialog.current?.querySelector<HTMLElement>(anchor.getAttribute("href") || "");
                if (target) { event.preventDefault(); target.closest("details")?.setAttribute("open", ""); target.focus({ preventScroll: true }); target.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
              }} /> : <p className={styles.status}>No organism commentary is available at this taxonomic level.</p>}
          </div>
          {evidence && <details className={styles.supplement}>
            <summary>Evidence &amp; coverage</summary>
            {evidence.domainCoverage && <p>Detection coverage: {Object.entries(evidence.domainCoverage).map(([domain, coverage]) => `${domain} ${(coverage.frac * 100).toFixed(0)}%`).join(" · ")}</p>}
            {evidence.methodMix && <p>Methods: {Object.entries(evidence.methodMix).map(([method, count]) => `${method} × ${count}`).join(", ")}</p>}
            <p>Certainty reflects observational association, not causation.</p>
          </details>}
          {studies.length > 0 && <details className={styles.supplement}>
            <summary>Signature studies ({studies.length})</summary>
            <div className={styles.studies}>{studies.map((study, index) => <p key={index}><a href={study.url} target="_blank" rel="noreferrer">{study.title}</a></p>)}</div>
          </details>}
        </div>
      </aside>
    </dialog>, document.body
  );
}
