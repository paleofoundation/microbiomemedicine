"use client";
import { useState } from "react";

const tag: React.CSSProperties = { cursor: "pointer", border: "none", font: "inherit" };

// Study actions for Theory / Research-feed pages: Favorite, Download PDF, Copy Citation.
export function StudyActions({
  title,
  authors,
  year,
  url,
}: {
  title: string;
  authors: string[];
  year?: string;
  url: string;
}) {
  const [fav, setFav] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyCite() {
    const a = authors.length ? authors.join(", ") + ". " : "";
    const cite = `${a}${title}. Microbiome Signatures${year ? `. ${year}` : ""}.${url ? " " + url : ""}`;
    navigator.clipboard?.writeText(cite)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => {});
  }

  return (
    <div className="research-hero__center-tags">
      <button type="button" className="research-hero__center-tag" style={tag} onClick={() => setFav((f) => !f)}>
        {fav ? "★ Favorited" : "☆ Favorite study"}
      </button>
      <button type="button" className="research-hero__center-tag" style={tag} onClick={() => window.print()}>
        ⬇ Download PDF
      </button>
      <button type="button" className="research-hero__center-tag" style={tag} onClick={copyCite}>
        {copied ? "✓ Copied!" : "⧉ Copy Citation"}
      </button>
    </div>
  );
}
