"use client";
import { useEffect, useState } from "react";

type Child = { id: string; text: string };
export type NavGroup = { id: string; text: string; icon: string; children: Child[]; isSignature?: boolean };

const ICON_BASE = "/wp-content/themes/rgbcode/static_media/";

// Reproduces the theme's left section-navigation: icon per top section, "+"
// expanders, white-bg/red-text active item, h3 children shown under the active
// section (scroll-spy).
export function SectionNav({ groups }: { groups: NavGroup[] }) {
  const [active, setActive] = useState<string>("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const ids = groups
      .flatMap((g) => [g.id, ...g.children.map((c) => c.id)])
      .filter((id) => id !== "rgbc-database");
    function onScroll() {
      let current = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 140) current = id;
      }
      setActive(current || ids[0] || "");
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [groups]);

  const groupActive = (g: NavGroup) => active === g.id || g.children.some((c) => c.id === active);

  return (
    <div className="research-content__left js-research-sidebar">
      <div className="research-content__left-menu">
        <button type="button" className="research-content__left-btn js-research-btn" onClick={() => setCollapsed((c) => !c)}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 9 9" width="14" height="14">
            <path fill="#6C757D" fillRule="evenodd" d="M0 4.5a.6.6 0 0 0 .6.6H7L4.7 7.5a.6.6 0 1 0 .8.8l3.3-3.4a.6.6 0 0 0 0-.8L5.5.7a.6.6 0 0 0-.8.8L7 4H.6a.6.6 0 0 0-.6.6Z" clipRule="evenodd" />
          </svg>
          <span className="screen-reader-text">Toggle sidebar</span>
        </button>
        {!collapsed && (
          <div className="post-content__list post-sidebar">
            {groups.map((g) => {
              const gActive = groupActive(g);
              const hasChildren = g.children.length > 0;
              return (
                <div key={g.id}>
                  <div className={`post-content__item post-content__item--h2${hasChildren ? " plus" : ""}${gActive ? " active" : ""}`}>
                    <span className="post-content__title">
                      <a
                        rel="nofollow"
                        className={`post-content__link${active === g.id ? " post-content__link--active" : ""}`}
                        href={g.isSignature ? "#" : `#${g.id}`}
                        data-modal-id={g.isSignature ? "research-diagram-modal" : undefined}
                      >
                        <img src={ICON_BASE + g.icon} alt="" width={20} height={20} />
                        {g.text}
                      </a>
                    </span>
                  </div>
                  {g.children.map((c) => (
                    <div key={c.id} className={`post-content__item post-content__item--h3${gActive ? " active" : ""}`}>
                      <span className="post-content__title">
                        <a rel="nofollow" className={`post-content__link${active === c.id ? " post-content__link--active" : ""}`} href={`#${c.id}`}>
                          {c.text}
                        </a>
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
