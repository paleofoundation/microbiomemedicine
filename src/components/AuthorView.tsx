import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { segmentForType } from "@/lib/content";
import { AUTHOR_BIOS } from "@/theme/authorsBios";

// Author archive page: who the author is + everything they've worked on. Mirrors the
// original /author/<slug> page — hero (avatar + "Name, Role"), About (bio), then
// "Recent Posts" cards (date + title link + excerpt), most-recent first.
const AUTHORS: Record<string, { name: string; role?: string }> = {
  "kmfp84gmail-com": { name: "Karen Pendergrass", role: "Standards Team" },
  kimberly: { name: "Kimberly Eyer" },
  aleru: { name: "Divine Aleru", role: "Microbiome Signatures Research Coordinator" },
  giorgos: { name: "Giorgos Aristotelous" },
  "dr-umar": { name: "Dr. Umar" },
  "jonathan-pendergrass": { name: "Jonathan Pendergrass" },
};

type Post = { type: string; slug: string; title: string; excerpt_html: string | null; modified_at: string | null };

const hrefFor = (type: string, slug: string): string =>
  type === "post" || type === "page" ? `/${slug}/` : `/${segmentForType(type)}/${slug}/`;

async function authorPosts(name: string): Promise<Post[]> {
  const { data } = await supabase
    .from("content_items")
    .select("type,slug,title,excerpt_html,modified_at")
    .eq("status", "publish")
    .contains("meta->authors", JSON.stringify([{ name }]))
    .order("modified_at", { ascending: false, nullsFirst: false })
    .limit(400);
  return (data ?? []) as Post[];
}

export async function authorMetadata(slug: string): Promise<Metadata> {
  const a = AUTHORS[slug];
  return a ? { title: a.name } : {};
}

export async function AuthorView({ slug }: { slug: string }) {
  const author = AUTHORS[slug];
  if (!author) notFound();
  const bio = AUTHOR_BIOS[author.name];
  const avatar = bio?.avatar ? bio.avatar.replace(/&amp;/g, "&").replace(/s=\d+/, "s=256") : null;
  const posts = await authorPosts(author.name);

  return (
    <div className="site-content">
      <main className="main">
        <div className="research-hero">
          <div className="research-hero__container">
            <div className="research-hero__simple">
              {avatar && (
                <img alt={author.name} src={avatar} className="avatar avatar-256 photo author-avatar" height={256} width={256} decoding="async" />
              )}
              <h1 className="research-hero__title">{author.role ? `${author.name}, ${author.role}` : author.name}</h1>
            </div>
          </div>
        </div>

        <div className="research-content">
          <div className="research-content__center research-content__center--author">
            {bio?.bio && (
              <>
                <h3 className="rgbc-accent">About</h3>
                <p>{bio.bio}</p>
              </>
            )}
            <h3 className="rgbc-accent">Recent Posts</h3>
            <div>
              {posts.length === 0 && <p>No published contributions yet.</p>}
              {posts.map((p) => (
                <article className="mbio-card" key={`${p.type}-${p.slug}`}>
                  <div className="mbio-card__border"></div>
                  {p.modified_at && <p className="mbio-card__date">{p.modified_at.slice(0, 10)}</p>}
                  <Link href={hrefFor(p.type, p.slug)} className="mbio-card__title">{p.title}</Link>
                  {p.excerpt_html && (
                    <div className="mbio-card__content">
                      <p>{p.excerpt_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
