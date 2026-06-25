import Link from "next/link";
import { notFound } from "next/navigation";
import { sectionBySegment, getItem } from "@/lib/content";
import { StudyActions } from "@/components/StudyActions";
import { Tooltips } from "@/components/Tooltips";

type Author = { name: string };
type Feed = {
  location?: string[];
  sample_site?: string[];
  species?: string[];
  paper_url?: string;
  conditions?: { label: string; href: string }[];
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// The taxonomy-driven metadata block at the top of a feed's content.
function graphsHtml(feed: Feed): string {
  const fields: [string, string[] | undefined][] = [
    ["Location", feed.location],
    ["Sample Site", feed.sample_site],
    ["Species", feed.species],
  ];
  const present = fields.filter(([, v]) => Array.isArray(v) && v.length) as [string, string[]][];
  if (!present.length) return "";
  return (
    `<div class="research-feed__graphs">` +
    present
      .map(
        ([title, items]) =>
          `<div class="research-feed__graph"><div class="research-feed__graph-title">${esc(title)}</div>` +
          `<div class="research-feed__graph-items">` +
          items.map((i) => `<div class="research-feed__graph-item">${esc(i)}</div>`).join("") +
          `</div></div>`
      )
      .join("") +
    `</div>`
  );
}

// Research-feed pages ("microbiome signature studies") use a distinct template:
// fullwidth hero, an "Original paper" DOI link, related-condition pills, the
// Location/Sample Site/Species graph block, and a back-to-feeds sidebar.
export async function ResearchFeedView({ slug }: { slug: string }) {
  const section = sectionBySegment("research-feeds");
  if (!section) notFound();
  const item = await getItem(section.type, slug);
  if (!item) notFound();

  const meta = (item.meta || {}) as Record<string, unknown>;
  const feed = (meta.feed || {}) as Feed;
  const authors: Author[] = Array.isArray(meta.authors) ? (meta.authors as Author[]) : [];
  const contentHtml = graphsHtml(feed) + (item.content_html || "");
  const year = item.modified_at ? item.modified_at.slice(0, 4) : undefined;

  return (
    <div className="site-content flex">
      <main className="main">
        <div className="research-hero">
          <div className="research-hero__wrapper">
            <div className="research-hero__center">
              <div className="research-hero__center-content research-hero__center-content--fullwidth">
                <p className="rgbc-breadcrumbs">
                  <Link href="/">Home</Link> <Link href="/research-feeds">Research Feeds</Link> <span>{item.title}</span>
                </p>
                <h1 className="research-hero__center-title">
                  {item.title}
                  {feed.paper_url && (
                    <a className="research-hero__external-link" href={feed.paper_url} target="_blank" rel="noreferrer">
                      Original paper
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, verticalAlign: "middle" }}>
                        <path d="M7 17 17 7M9 7h8v8" />
                      </svg>
                    </a>
                  )}
                </h1>
                {Array.isArray(feed.conditions) && feed.conditions.length > 0 && (
                  <div className="research-hero__center-tags">
                    {feed.conditions.map((c, i) => (
                      <a key={i} className="btn btn--rounded" href={c.href}>{c.label}</a>
                    ))}
                  </div>
                )}
                <StudyActions
                  itemId={item.id}
                  title={item.title}
                  authors={authors.map((a) => a.name)}
                  year={year}
                  url={`https://microbiomemedicine.com/research-feeds/${slug}/`}
                />
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
                    <span className="post-content__title">
                      <a className="post-content__link" href="/research-feeds">
                        <img src="/wp-content/themes/rgbcode/static_media/feed.webp" alt="" width={20} height={20} />Research Feeds
                      </a>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="research-content__center entry-content" dangerouslySetInnerHTML={{ __html: contentHtml }} />
          </div>
        </div>
      </main>
    </div>
  );
}
