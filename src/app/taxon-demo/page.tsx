// PREVIEW of the generated Acinetobacter baumannii TAXON page (content v2: em dashes removed,
// internal-only entity links), rendered through the real
// design-system shell (hero + auto-built SectionNav + RightRail + entry-content), fed by the
// generator's output (src/data/taxon-demo.json) — no database. Not linked in nav.
// Source of truth for the markup: _generator/pages/acinetobacter-baumannii/build.mjs.
import type { ComponentProps } from "react";
import Link from "next/link";
import demo from "@/data/taxon-demo.json";
import { ConditionsTable } from "@/components/ConditionsTable";
import { SectionNav, type NavGroup } from "@/components/SectionNav";
import { RightRail } from "@/components/RightRail";
import { Tooltips } from "@/components/Tooltips";
import { ContentAccordions } from "@/components/ContentAccordions";
import { PageSnapshot } from "@/components/PageSnapshot";
import { FollowButton } from "@/components/FollowButton";
import { ShareButton } from "@/components/ShareButton";
import { OrcidIcon } from "@/components/OrcidIcon";
import type { Connection } from "@/lib/connections";

export const metadata = { title: "Acinetobacter baumannii taxon page (preview)" };

type Heading = { level: number; text: string; id: string };
const html = (demo as { content_html: string }).content_html;
const meta = demo.meta as { did_you_know?: string; authors?: { name: string; orcid?: string; avatar?: string }[] };

function tableOfContents(h: string): Heading[] {
  const out: Heading[] = [];
  const re = /<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(h))) {
    const text = m[3].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const idm = /id="([^"]*)"/.exec(m[2] || "");
    out.push({ level: Number(m[1]), text, id: idm ? idm[1] : "" });
  }
  return out;
}
// Only icons that actually ship in public/wp-content/.../static_media are used.
function sectionIcon(id: string): string {
  const map: Record<string, string> = {
    "h-overview": "overview.webp", "h-interventions": "research.webp", "h-conditions": "database.webp",
    "h-faqs": "faq.webp", "h-research-feed": "feed.webp", "h-update-history": "overview.webp", "h-references": "references.webp",
  };
  return map[id] || "overview.webp";
}
function buildNavGroups(toc: Heading[]): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const h of toc) {
    if (h.level === 2) groups.push({ id: h.id, text: h.text, icon: sectionIcon(h.id), children: [] });
    else if (groups.length) groups[groups.length - 1].children.push({ id: h.id, text: h.text });
  }
  return groups;
}
const refs = new Set([...html.matchAll(/\[(\d{1,3})\]/g)].map((m) => m[1])).size;
const authors = meta.authors || [];
const COND_MARKER = "<!--CONDITIONS_TABLE-->";
const [beforeCond, afterCond] = html.includes(COND_MARKER) ? html.split(COND_MARKER) : [html, ""];
const conditionsData = (demo.meta as { conditions?: ComponentProps<typeof ConditionsTable>["data"] }).conditions;
// Global rule: max 3 right-rail connections.
const connections: Connection[] = [
  { label: "Iron", href: "/metals/iron/", type: "metal" },
  { label: "Zinc", href: "/metals/zinc/", type: "metal" },
  { label: "Lactoferrin", href: "/interventions/lactoferrin/", type: "intervention" },
];

export default function Page() {
  const toc = tableOfContents(html);
  return (
    <div className="site-content flex">
      <main className="main">
        <div className="research-hero ">
          <div className="research-hero__wrapper">
            <div className="research-hero__left">
              {meta.did_you_know && (
                <div className="research-hero__left-content">
                  <p><strong>Did you know?</strong><br />{meta.did_you_know}</p>
                </div>
              )}
            </div>

            <div className="research-hero__center">
              <nav className="breadcrumb">
                <ol className="breadcrumb__wrapper">
                  <li className="breadcrumb__item"><Link className="breadcrumb__link" href="/">Home</Link></li>
                  <li className="breadcrumb__item"><Link className="breadcrumb__link" href="/microbes">Microbes</Link></li>
                  <li className="breadcrumb__item"><Link className="breadcrumb__link" href="/taxon-demo">{demo.title}</Link></li>
                  <li className="breadcrumb__item"><span className="breadcrumb_last"><span className="badge">✓ Evidence based</span></span></li>
                </ol>
              </nav>

              <div className="research-hero__center-content ">
                <h1 className="research-hero__center-title" style={{ fontStyle: "italic" }}>{demo.title}</h1>
                <div className="research-hero__center-text" dangerouslySetInnerHTML={{ __html: demo.excerpt_html }} />
              </div>

              <div className="research-hero__categories"></div>

              {/* Canonical microbe hero tags (ArticleView): Follow + Share only. */}
              <div className="research-hero__center-tags">
                <FollowButton itemId={0} />
                <ShareButton />
              </div>
            </div>

            <div className="research-hero__right">
              {authors.some((a) => a.avatar) && (
                <div className="research-hero__right-users">
                  <ul className="research-hero__tooltips-list research-hero__tooltips-list--an-image-as-link">
                    {authors.filter((a) => a.avatar).map((a, i) => (
                      <li key={i}>
                        <span className="rgbc-tooltip">
                          <img alt={a.name} src={a.avatar} className="avatar avatar-96 photo" height={96} width={96} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="research-hero__right-meta">
                {authors.length > 0 && (
                  <div className="research-hero__right-meta-item">
                    <p><span>Researched by:</span></p>
                    <div className="research-hero__right-meta-user">
                      <ul className="research-hero__tooltips-list ">
                        {authors.map((a, i) => (
                          <li key={i}>
                            <span>{a.name}</span>
                            {a.orcid && (<a className="orchid-id" target="_blank" rel="noreferrer" href={a.orcid} aria-label="ORCID iD"><OrcidIcon /></a>)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                <div className="research-hero__right-meta-item"><p>Last Updated: 2026-07-02</p></div>
              </div>
              {(refs > 0 || conditionsData) && <PageSnapshot refs={refs} mmas={null} stats={conditionsData?.summary} />}
            </div>
          </div>
        </div>

        <Tooltips />
        <ContentAccordions />

        <div className="research-content">
          <div className="research-content__wrapper">
            <SectionNav groups={buildNavGroups(toc)} />
            <div className="research-content__center entry-content">
              <div dangerouslySetInnerHTML={{ __html: beforeCond }} />
              {conditionsData && <ConditionsTable data={conditionsData} />}
              {afterCond && <div dangerouslySetInnerHTML={{ __html: afterCond }} />}
            </div>
            <RightRail connections={connections} />
          </div>
        </div>
      </main>
    </div>
  );
}
