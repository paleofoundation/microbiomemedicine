// PREVIEW of a generated research-feed page, rendered through the canonical ResearchFeedView
// format (hero + Location/Sample-Site/Species graphs + h3 four-section summary + right rail).
// Fed by the generator's --rf-json output (src/data/rf-demo.json). Not linked in nav.
// Mirrors src/components/ResearchFeedView.tsx (the content_html branch used for generated pages).
import Link from "next/link";
import rfRows from "@/data/rf-demo.json";
import { OrcidIcon } from "@/components/OrcidIcon";
import { RightRail } from "@/components/RightRail";
import { Tooltips } from "@/components/Tooltips";
import type { Connection } from "@/lib/connections";
import { formatInlineCitations } from "@/lib/inlineCitations";

export const metadata = {
  title: "Research feed page (preview)",
  robots: { index: false, follow: false },
};

type Feed = { location?: string[]; sample_site?: string[]; species?: string[]; paper_url?: string };
type Row = { title: string; slug: string; content_html: string; published_at: string; meta: { feed: Feed; authors: { name: string; orcid?: string; avatar?: string }[] } };

const rows = rfRows as Row[];
// Show the schizophrenia study (its unstructured abstract collapsed to one section; the
// full-text-authored summary now yields all four).
const item = rows.find((r) => /schizophrenia/i.test(r.title)) || [...rows].sort((a, b) => (b.content_html.match(/<h3/g) || []).length - (a.content_html.match(/<h3/g) || []).length)[0];
const feed = item.meta.feed || {};
const authors = item.meta.authors || [];
const connections: Connection[] = [];

function graphsHtml(f: Feed): string {
  const fields: [string, string[] | undefined][] = [["Location", f.location], ["Sample Site", f.sample_site], ["Species", f.species]];
  const present = fields.filter(([, v]) => Array.isArray(v) && v.length) as [string, string[]][];
  if (!present.length) return "";
  return `<div class="research-feed__graphs">` + present.map(([t, items]) => `<div class="research-feed__graph"><div class="research-feed__graph-title">${t}</div><div class="research-feed__graph-items">${items.map((i) => `<div class="research-feed__graph-item">${i}</div>`).join("")}</div></div>`).join("") + `</div>`;
}
const contentHtml = formatInlineCitations(graphsHtml(feed) + item.content_html);

export default function Page() {
  const updated = (item.published_at || "").slice(0, 10);
  return (
    <div className="site-content flex">
      <main className="main">
        <div className="research-hero ">
          <div className="research-hero__wrapper">
            <div className="research-hero__center">
              <p className="rgbc-breadcrumbs">
                <Link href="/">Home</Link> <Link href="/research-feeds">Research Feeds</Link> <span>{item.title}</span>
              </p>
              <div className="research-hero__center-content research-hero__center-content--fullwidth">
                <h1 className="research-hero__center-title">
                  {item.title}
                  {feed.paper_url && (
                    <a className="research-hero__external-link" href={feed.paper_url} target="_blank" rel="noreferrer">
                      Original paper
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" x2="21" y1="14" y2="3" />
                      </svg>
                    </a>
                  )}
                </h1>
              </div>
            </div>
            <div className="research-hero__right">
              {authors.some((a) => a.avatar) && (
                <div className="research-hero__right-users">
                  <ul className="research-hero__tooltips-list research-hero__tooltips-list--an-image-as-link">
                    {authors.filter((a) => a.avatar).map((a, i) => (
                      <li key={i}><span className="rgbc-tooltip"><img alt={a.name} src={a.avatar} className="avatar avatar-96 photo" height={96} width={96} /></span></li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="research-hero__right-meta">
                <div className="research-hero__right-meta-item">
                  <p><span>Researched by:</span></p>
                  <div className="research-hero__right-meta-user">
                    <ul className="research-hero__tooltips-list ">
                      {authors.map((a, i) => (
                        <li key={i}><span>{a.name}</span>{a.orcid && (<a className="orchid-id" target="_blank" rel="noreferrer" href={a.orcid} aria-label="ORCID iD"><OrcidIcon /></a>)}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {updated && (<div className="research-hero__right-meta-item"><p>Last Updated: {updated}</p></div>)}
              </div>
            </div>
          </div>
        </div>

        <Tooltips />

        <div className="research-content">
          <div className="research-content__wrapper">
            <div className="research-content__left js-research-sidebar">
              <div className="research-content__left-menu">
                <div className="post-content__list post-sidebar">
                  <div className="post-content__item post-content__item--h2">
                    <span className="post-content__title"><a className="post-content__link" href="/research-feeds">Dashboard</a></span>
                  </div>
                </div>
              </div>
            </div>
            <div className="research-content__center entry-content" dangerouslySetInnerHTML={{ __html: contentHtml }} />
            <RightRail connections={connections} />
          </div>
        </div>
      </main>
    </div>
  );
}
