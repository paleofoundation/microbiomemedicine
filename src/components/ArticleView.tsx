import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sectionBySegment, getItem, stripHost } from "@/lib/content";
import { MicrobiomeSignature } from "@/components/MicrobiomeSignature";

type Heading = { level: number; text: string; id: string };
type Author = { name: string; orcid?: string | null; avatar?: string | null };
type SigItem = { name: string; value: number; has_info?: boolean };

function tableOfContents(html: string): Heading[] {
  const out: Heading[] = [];
  const re = /<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const level = Number(m[1]);
    const text = m[3].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const idm = /id="([^"]*)"/.exec(m[2] || "");
    const id = idm ? idm[1] : "h-" + text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    out.push({ level, text, id });
  }
  return out;
}

function referenceCount(html: string): number {
  const nums = new Set<string>();
  const re = /\[(\d{1,3})\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) nums.add(m[1]);
  return nums.size;
}

function RightSidebar() {
  return (
    <div className="research-content__right js-research-sidebar">
      <div className="research-content__left-menu">
        <div className="research-content__right-actions">
          <button type="button" className="btn btn--full btn--outline js-feedback">Send feedback</button>
          <div className="research-content__right-banner">
            <strong>Join the Roundtable</strong>
            <p className="p1">
              Contribute to published consensus reports, connect with top clinicians and researchers, and receive
              exclusive invitations to roundtable conferences.
            </p>
            <div className="research-content__right-banner-note">
              <p>Yes, I want to <a href="/auth/signup/">help shape the future of microbiome medicine.</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function ArticleView({ segment, slug }: { segment: string; slug: string }) {
  const section = sectionBySegment(segment);
  if (!section) notFound();
  const item = await getItem(section.type, slug);
  if (!item) notFound();

  const meta = (item.meta || {}) as Record<string, unknown>;
  const html = item.content_html || "";
  const toc = tableOfContents(html);
  const refs = referenceCount(html);
  const mmas = Array.isArray(meta.studies) ? (meta.studies as unknown[]).length : null;
  const authors: Author[] = Array.isArray(meta.authors) ? (meta.authors as Author[]) : [];
  const didYouKnow = typeof meta.did_you_know === "string" ? meta.did_you_know.replace(/^Did you know\??\s*/i, "") : null;
  const signature = meta.signature as { levels?: Record<string, SigItem[]> } | undefined;
  const img = stripHost(item.featured_image_url);
  const updated = item.modified_at ? item.modified_at.slice(0, 10) : null;
  const avatars = authors.filter((a) => a.avatar);

  return (
    <div className="site-content flex">
      <main className="main">
        <div className="research-hero ">
          <div className="research-hero__wrapper">
            <div className="research-hero__left">
              <div className="research-hero__left-content">
                {img && <img src={img} alt={item.title} className="img-autosize" />}
                {didYouKnow && (<p><strong>Did you know?</strong><br />{didYouKnow}</p>)}
              </div>
            </div>

            <div className="research-hero__center">
              <nav className="breadcrumb">
                <ol className="breadcrumb__wrapper">
                  <li className="breadcrumb__item"><Link className="breadcrumb__link" href="/">Home</Link></li>
                  <li className="breadcrumb__item"><Link className="breadcrumb__link" href={`/${segment}`}>{section.label}</Link></li>
                  <li className="breadcrumb__item"><Link className="breadcrumb__link" href={`/${segment}/${slug}`}>{item.title}</Link></li>
                  <li className="breadcrumb__item"><span className="breadcrumb_last"><span className="badge">✓ Evidence based</span></span></li>
                </ol>
              </nav>

              <div className="research-hero__center-content ">
                <h1 className="research-hero__center-title">{item.title}</h1>
                {item.excerpt_html && (
                  <div className="research-hero__center-text" dangerouslySetInnerHTML={{ __html: item.excerpt_html }} />
                )}
              </div>

              <div className="research-hero__categories"></div>

              <div className="research-hero__center-tags">
                <a className="research-hero__center-tag" href="#rgbc-database">
                  <img src="/wp-content/themes/rgbcode/static_media/examinedatabase_white.webp" alt="" width={18} height={18} /> Microbiome Signature
                </a>
                <a className="research-hero__center-tag" href="#h-interventions">
                  <img src="/wp-content/themes/rgbcode/static_media/research.webp" alt="" width={18} height={18} /> Interventions
                </a>
                <a className="research-hero__center-tag" href="#rgbc-research-feed">
                  <img src="/wp-content/themes/rgbcode/static_media/researchfeed_white.webp" alt="" width={18} height={18} /> Research feed
                </a>
              </div>
            </div>

            <div className="research-hero__right">
              {avatars.length > 0 && (
                <div className="research-hero__right-users">
                  <ul className="research-hero__tooltips-list research-hero__tooltips-list--an-image-as-link">
                    {avatars.map((a, i) => (
                      <li key={i}>
                        <span className="rgbc-tooltip">
                          <img alt={a.name} src={a.avatar as string} className="avatar avatar-96 photo" height={96} width={96} />
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
                            <span className="rgbc-tooltip">{a.name}</span>
                            {a.orcid && (<a className="orchid-id" target="_blank" rel="noreferrer" href={a.orcid}>ID</a>)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {updated && (<div className="research-hero__right-meta-item"><p>Last Updated: {updated}</p></div>)}
              </div>
              {(refs > 0 || mmas) && (
                <div className="research-hero__right-snapshot">
                  <p><strong>Page Snapshot</strong></p>
                  {refs > 0 && <p>{refs} References</p>}
                  {mmas ? <p>{mmas} Identified MMAs</p> : null}
                </div>
              )}
            </div>
          </div>
        </div>

        {signature?.levels && (
          <section id="rgbc-database" style={{ padding: "2.5rem 1.5rem", borderTop: "1px solid #eee", maxWidth: 1100, margin: "0 auto" }}>
            <h2 className="rgbc-archive__title" style={{ marginBottom: "1.25rem" }}>
              Microbiome Signature: {item.title}
            </h2>
            <MicrobiomeSignature slug={slug} levels={signature.levels} />
          </section>
        )}

        <div className="research-content">
          <div className="research-content__wrapper">
            <div className="research-content__left js-research-sidebar">
              <div className="research-content__left-menu">
                <div className="post-content__list post-sidebar">
                  {toc.map((h, i) => (
                    <div key={i} className={`post-content__item post-content__item--h${h.level}`}>
                      <span className="post-content__title">
                        <a className="post-content__link" href={`#${h.id}`}>{h.text}</a>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="research-content__center entry-content" dangerouslySetInnerHTML={{ __html: html }} />

            <RightSidebar />
          </div>
        </div>
      </main>
    </div>
  );
}

export async function articleMetadata(segment: string, slug: string): Promise<Metadata> {
  const section = sectionBySegment(segment);
  if (!section) return {};
  const item = await getItem(section.type, slug);
  if (!item) return {};
  return {
    title: item.seo_title || item.title,
    description: item.seo_description || undefined,
  };
}
