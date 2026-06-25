"use client";
import { useEffect } from "react";

// Reproduces the original theme's hover tooltips (citations, glossary terms,
// author bios). Triggers carry class "rgbc-tooltip" + title=".wiki-xxxx"; the
// matching tooltip element is ".tooltip.wiki-xxxx" (hidden by default).
export function Tooltips() {
  useEffect(() => {
    const triggers = Array.from(
      document.querySelectorAll<HTMLElement>('.rgbc-tooltip[title^="."]')
    );
    let active: HTMLElement | null = null;
    const hide = () => {
      if (active) { active.style.display = "none"; active = null; }
    };
    const cleanups: Array<() => void> = [];

    for (const tr of triggers) {
      const sel = tr.getAttribute("title") || "";
      tr.removeAttribute("title"); // suppress the native browser tooltip
      tr.style.cursor = "help";
      const cls = sel.replace(/^\./, "");
      const enter = () => {
        let tip: HTMLElement | null = null;
        try {
          tip = (tr.parentElement?.querySelector(`.tooltip.${CSS.escape(cls)}`) ||
            document.querySelector(`.tooltip.${CSS.escape(cls)}`)) as HTMLElement | null;
        } catch { tip = null; }
        if (!tip) return;
        hide();
        const r = tr.getBoundingClientRect();
        Object.assign(tip.style, {
          display: "block", position: "fixed", zIndex: "1200", maxWidth: "340px",
          boxShadow: "0 10px 28px rgba(0,0,0,.2)", borderRadius: "8px", overflow: "hidden",
        });
        tip.style.left = Math.max(8, Math.min(window.innerWidth - 350, r.left)) + "px";
        tip.style.top = (r.bottom + 8) + "px";
        active = tip;
      };
      tr.addEventListener("mouseenter", enter);
      tr.addEventListener("mouseleave", hide);
      cleanups.push(() => {
        tr.removeEventListener("mouseenter", enter);
        tr.removeEventListener("mouseleave", hide);
      });
    }
    document.addEventListener("scroll", hide, true);
    return () => {
      cleanups.forEach((f) => f());
      document.removeEventListener("scroll", hide, true);
    };
  });
  return null;
}
