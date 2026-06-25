import { supabase } from "@/lib/supabase";
import { SECTIONS } from "@/lib/content";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; s?: string }> };
type Result = { type: string; slug: string; title: string };

const SEGMENT_BY_TYPE: Record<string, string> = Object.fromEntries(
  SECTIONS.map((s) => [s.type, s.segment])
);

function pathFor(type: string, slug: string): string {
  const seg = SEGMENT_BY_TYPE[type];
  return seg ? `/${seg}/${slug}` : `/${slug}`;
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q || sp.s || "").trim();

  let results: Result[] = [];
  if (q) {
    const { data } = await supabase
      .from("content_items")
      .select("type,slug,title")
      .textSearch("search_tsv", q, { type: "websearch", config: "english" })
      .limit(60);
    results = (data as Result[]) || [];
  }

  return (
    <div className="site-content flex">
      <main className="main">
        <div className="rgbc-hero">
          <div className="rgbc-hero__wrapper wrapper">
            <div className="rgbc-hero__center rgbc-hero__center--archive">
              <div className="rgbc-hero__content">
                <h1 className="rgbc-hero__title">Search</h1>
              </div>
              <form className="rgbc-search__form" action="/search" method="get">
                <input
                  name="q"
                  type="search"
                  defaultValue={q}
                  className="rgbc-search__input"
                  placeholder="What do you want to learn about?"
                />
              </form>
            </div>
          </div>
        </div>

        <section className="rgbc-content">
          <div className="rgbc-content__wrapper wrapper">
            <div className="rgbc-content__main rgbc-archive">
              <h2 className="rgbc-archive__title">
                {q ? `${results.length} result${results.length === 1 ? "" : "s"} for “${q}”` : "Enter a search term"}
              </h2>
              {results.map((it, i) => (
                <div key={i} className="rgbc-archive__post">
                  <a className="rgbc-archive__link" href={pathFor(it.type, it.slug)}>
                    {it.title}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
