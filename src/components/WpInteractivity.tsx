"use client";
import { useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

// Re-attaches the interactive behaviors the original front.js provided, on top of
// the verbatim WordPress markup: accordions, highlight toggle, sidebar collapse +
// scroll-spy, and the favorite button (wired to Supabase).
export function WpInteractivity({ itemId }: { itemId: number }) {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    // Accordions (FAQ + research-feed items)
    document.querySelectorAll<HTMLElement>(".accordion__header, .research-feed__header-wrap").forEach((h) => {
      const onClick = () => {
        const item = h.closest(".accordion__item") || h.parentElement;
        const content = item?.querySelector(".accordion__content");
        const active = h.classList.toggle("accordion__header--active");
        item?.classList.toggle("accordion__item--active", active);
        content?.classList.toggle("accordion__content--active", active);
      };
      h.style.cursor = "pointer";
      h.addEventListener("click", onClick);
      cleanups.push(() => h.removeEventListener("click", onClick));
    });

    // Highlight toggle
    const center = document.querySelector(".research-content__center");
    const group = document.querySelector<HTMLElement>(".mbio-switcher-group");
    const toggle = document.querySelector<HTMLInputElement>("#highlight-toggle");
    if (center && group && toggle && center.querySelectorAll("mark").length) {
      group.style.display = "flex";
      let on = true;
      try { const s = localStorage.getItem("showHighlights"); if (s !== null) on = s === "true"; } catch {}
      toggle.checked = on;
      center.classList.toggle("mark-hidden", !on);
      const onChange = () => {
        try { localStorage.setItem("showHighlights", String(toggle.checked)); } catch {}
        center.classList.toggle("mark-hidden", !toggle.checked);
      };
      toggle.addEventListener("change", onChange);
      cleanups.push(() => toggle.removeEventListener("change", onChange));
    }

    // Sidebar collapse buttons
    document.querySelectorAll<HTMLElement>(".js-research-btn").forEach((b) => {
      const onClick = () => b.closest(".js-research-sidebar")?.classList.toggle("collapsed");
      b.addEventListener("click", onClick);
      cleanups.push(() => b.removeEventListener("click", onClick));
    });

    // Sidebar scroll-spy (active section + expand its children)
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.post-content__link[href^="#"]'));
    if (links.length) {
      const ids = links.map((l) => l.getAttribute("href")!.slice(1)).filter(Boolean);
      const onScroll = () => {
        let cur = "";
        for (const id of ids) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= 140) cur = id; }
        for (const l of links) {
          const active = l.getAttribute("href") === "#" + cur;
          l.classList.toggle("post-content__link--active", active);
        }
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => window.removeEventListener("scroll", onScroll));
    }

    // Favorite button -> Supabase
    const fav = document.querySelector<HTMLElement>("#follow-page-btn, .js-favorite-study");
    if (fav) {
      const supabase = createSupabaseBrowser();
      let isFav = false;
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("favorites").select("id").eq("content_item_id", itemId).maybeSingle();
        isFav = !!data;
        fav.classList.toggle("is-favorited", isFav);
      })();
      const onClick = async (e: Event) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = "/login"; return; }
        if (isFav) { await supabase.from("favorites").delete().eq("content_item_id", itemId).eq("user_id", user.id); isFav = false; }
        else { await supabase.from("favorites").insert({ content_item_id: itemId, user_id: user.id }); isFav = true; }
        fav.classList.toggle("is-favorited", isFav);
      };
      fav.addEventListener("click", onClick);
      cleanups.push(() => fav.removeEventListener("click", onClick));
    }

    return () => cleanups.forEach((f) => f());
  }, [itemId]);
  return null;
}
