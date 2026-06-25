import Link from "next/link";
import { SECTIONS, sampleByType } from "@/lib/content";

export const revalidate = 3600;

const FEATURED = ["microbe", "condition", "intervention", "definition"];

export default async function Home() {
  const featured = SECTIONS.filter((s) => FEATURED.includes(s.type));
  const samples = await Promise.all(
    featured.map(async (s) => ({ section: s, items: await sampleByType(s.type, 5) }))
  );

  return (
    <main>
      {/* Hero */}
      <section className="border-b border-gray-200 bg-gradient-to-b from-[var(--color-primary-100)] to-white">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="font-serif text-4xl font-semibold leading-tight text-gray-900 sm:text-5xl">
            The evidence behind the{" "}
            <span className="text-[var(--color-primary)]">microbiome</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            A research-grounded reference connecting microbes, conditions,
            interventions, and the studies between them.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/microbes"
              className="rounded-md bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-dark)]"
            >
              Explore microbes
            </Link>
            <Link
              href="/conditions"
              className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-800 hover:border-[var(--color-primary)]"
            >
              Browse conditions
            </Link>
          </div>
        </div>
      </section>

      {/* Featured sections */}
      <div className="mx-auto max-w-6xl space-y-14 px-4 py-14">
        {samples.map(({ section, items }) => (
          <section key={section.segment}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-gray-900">
                  {section.label}
                </h2>
                <p className="mt-1 text-gray-600">{section.blurb}</p>
              </div>
              <Link
                href={`/${section.segment}`}
                className="shrink-0 text-sm font-semibold text-[var(--color-primary)] hover:underline"
              >
                See all →
              </Link>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => (
                <li key={it.id}>
                  <Link
                    href={`/${section.segment}/${it.slug}`}
                    className="block rounded-lg border border-gray-200 p-4 hover:border-[var(--color-primary)] hover:shadow-sm"
                  >
                    <span className="font-serif text-base font-semibold text-gray-900">
                      {it.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
