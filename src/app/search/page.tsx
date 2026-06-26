import { supabase } from "@/lib/supabase";
import { SECTIONS } from "@/lib/content";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; s?: string }> };
type Item = { type?: string; slug: string; title: string };

const SEGMENT_BY_TYPE: Record<string, string> = Object.fromEntries(
  SECTIONS.map((s) => [s.type, s.segment])
);
function pathFor(type: string, slug: string): string {
  const seg = SEGMENT_BY_TYPE[type];
  return seg ? `/${seg}/${slug}` : `/${slug}`;
}

// The explore directory shown when the header search opens with no query.
const DIRECTORY: { type: string; seg: string; label: string }[] = [
  { type: "condition", seg: "conditions", label: "Conditions" },
  { type: "definition", seg: "definition", label: "Definitions" },
  { type: "microbe", seg: "microbes", label: "Microbes" },
  { type: "intervention", seg: "interventions", label: "Interventions" },
  { type: "metal", seg: "metals", label: "Metals" },
  { type: "supplement", seg: "supplement", label: "Supplements" },
  { type: "guide", seg: "guide", label: "Guides & Resources" },
  { type: "theory", seg: "theories-hypotheses", label: "Theories & Hypotheses" },
];

async function sample(type: string): Promise<Item[]> {
  const { data } = await supabase
    .from("content_items")
    .select("slug,title")
    .eq("type", type)
    .eq("status", "publish")
    .order("title")
    .limit(12);
  return (data as Item[]) || [];
}

const Magnifier = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24">
    <path fill="#fff" fillRule="evenodd" d="M15.66 15.66a1.5 1.5 0 0 1 2.12 0l5.78 5.78a1.5 1.5 0 0 1-2.12 2.12l-5.78-5.77a1.5 1.5 0 0 1 0-2.13Z" clipRule="evenodd" />
    <path fill="#fff" fillRule="evenodd" d="M9.75 18a8.25 8.25 0 1 0 0-16.5 8.25 8.25 0 0 0 0 16.5Zm9.75-8.25a9.75 9.75 0 1 1-19.5 0 9.75 9.75 0 0 1 19.5 0Z" clipRule="evenodd" />
  </svg>
);

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q || sp.s || "").trim();

  let results: Item[] = [];
  if (q) {
    const { data } = await supabase
      .from("content_items")
      .select("type,slug,title")
      .textSearch("search_tsv", q, { type: "websearch", config: "english" })
      .limit(80);
    results = (data as Item[]) || [];
  }

  const sections = q ? [] : await Promise.all(DIRECTORY.map(async (d) => ({ ...d, items: await sample(d.type) })));

  return (
    <div className="site-content flex">
      <main className="main">
        <div className="rgbc-explore">
          <form className="rgbc-search__form rgbc-explore__form" action="/search" method="get">
            <input
              name="q"
              type="search"
              defaultValue={q}
              className="rgbc-search__input field field--lg"
              placeholder="What do you want to learn about?"
              autoFocus
            />
            <button className="rgbc-search__submit btn btn--lg" type="submit" aria-label="Search">
              <Magnifier />
            </button>
          </form>

          {q ? (
            <section className="rgbc-explore__results">
              <h2 className="rgbc-explore__results-title">
                {results.length} result{results.length === 1 ? "" : "s"} for “{q}”
              </h2>
              <ul className="rgbc-explore__list">
                {results.map((it, i) => (
                  <li key={i}>
                    <a href={pathFor(it.type as string, it.slug)}>{it.title}</a>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <div className="rgbc-explore__grid">
              {sections.map((s) => (
                <section key={s.type} className="rgbc-explore__section">
                  <div className="rgbc-explore__head">
                    <h2 className="rgbc-explore__title">{s.label}</h2>
                    <a className="rgbc-explore__viewall" href={`/${s.seg}`}>View All →</a>
                  </div>
                  <ul className="rgbc-explore__list">
                    {s.items.map((it, i) => (
                      <li key={i}>
                        <a href={pathFor(s.type, it.slug)}>{it.title}</a>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
