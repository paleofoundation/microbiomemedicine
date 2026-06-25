"use client";
import { useState } from "react";

const MBTI_DEF =
  " are validated using a dual-evidence logical framework. First, the intervention must realign the condition’s microbiome signature by increasing beneficial taxa that are consistently depleted and reducing pathogenic taxa that are consistently enriched. Second, the intervention must demonstrate measurable clinical benefit. Concordance of these effects in the same context validates the intervention as an MBTI and supports the clinical relevance of the microbiome signature.";

// Page Snapshot box: References (jumps to references), Identified MMAs (opens the
// signature modal), and an info (i) tooltip explaining MBTI validation.
export function PageSnapshot({ refs, mmas }: { refs: number; mmas: number | null }) {
  const [info, setInfo] = useState(false);
  return (
    <div className="research-hero__right-snapshot" style={{ position: "relative" }}>
      <p style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".5rem" }}>
        <strong>Page Snapshot</strong>
        <span
          onMouseEnter={() => setInfo(true)}
          onMouseLeave={() => setInfo(false)}
          aria-label="How are MMAs and MBTIs validated?"
          style={{ cursor: "help", border: "1.5px solid currentColor", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: ".72rem", fontStyle: "italic", flexShrink: 0 }}
        >
          i
        </span>
      </p>
      {info && (
        <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 20, background: "#fff", color: "#222", padding: "1rem 1.15rem", borderRadius: 8, boxShadow: "0 14px 34px rgba(0,0,0,.24)", width: 340, fontSize: ".82rem", lineHeight: 1.55, textAlign: "left", fontWeight: 400 }}>
          <a href="/definition/microbiome-targeted-interventions-mbtis" style={{ color: "#183fab", fontWeight: 600 }}>Microbiome-targeted interventions (MBTIs)</a>
          {MBTI_DEF}
        </div>
      )}
      {refs > 0 && (
        <p><a href="#h-references" style={{ color: "inherit", textDecoration: "none" }}>{refs} References</a></p>
      )}
      {mmas ? (
        <p data-modal-id="research-diagram-modal" style={{ cursor: "pointer" }}>{mmas} Identified MMAs</p>
      ) : null}
    </div>
  );
}
