"use client";
import { useEffect } from "react";

// The homepage hero search form (`.js-search-form` from the captured WordPress
// markup) had its `.js-search-result` dropdown populated by a WP search plugin
// whose JS doesn't run in the rebuild — so nothing appeared while typing. This
// re-attaches live autocomplete, querying /api/search-suggest and rendering the
// grouped results (Conditions first) into the original markup/classes.

type Suggestion = { title: string; href: string; label: string };

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export function HeroSearch() {
  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>(".js-search-form .js-search-input");
    const result = document.querySelector<HTMLElement>(".js-search-form .js-search-result");
    if (!input || !result) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let seq = 0;

    const render = (items: Suggestion[]) => {
      if (!items.length) {
        result.innerHTML = `<div class="rgbc-search__items"><p class="rgbc-search__not-found">No results found.</p></div>`;
        result.style.display = "block";
        return;
      }
      const lis = items
        .map(
          (it) =>
            `<li class="rgbc-search__item"><a class="rgbc-search__link" href="${escapeHtml(it.href)}">` +
            `<span class="search__link-text">${escapeHtml(it.title)}</span>` +
            `<span class="rgbc-search__link-type">${escapeHtml(it.label)}</span></a></li>`
        )
        .join("");
      result.innerHTML = `<ul class="rgbc-search__items">${lis}</ul>`;
      result.style.display = "block";
    };

    const run = async (q: string) => {
      const mine = ++seq;
      try {
        const res = await fetch(`/api/search-suggest?q=${encodeURIComponent(q)}`);
        if (mine !== seq) return; // a newer keystroke superseded this request
        const { items } = (await res.json()) as { items: Suggestion[] };
        render(items || []);
      } catch {
        /* network hiccup — leave the previous dropdown state */
      }
    };

    const onInput = () => {
      const q = input.value.trim();
      if (timer) clearTimeout(timer);
      if (q.length < 2) {
        seq++; // invalidate any in-flight request
        result.innerHTML = "";
        result.style.display = "none";
        return;
      }
      timer = setTimeout(() => run(q), 180);
    };

    const onFocus = () => {
      if (result.innerHTML.trim()) result.style.display = "block";
    };

    input.addEventListener("input", onInput);
    input.addEventListener("focus", onFocus);
    return () => {
      if (timer) clearTimeout(timer);
      input.removeEventListener("input", onInput);
      input.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
