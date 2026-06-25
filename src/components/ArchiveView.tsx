import Link from "next/link";
import { notFound } from "next/navigation";
import { sectionBySegment, listByType } from "@/lib/content";

export async function ArchiveView({ segment, page = 1 }: { segment: string; page?: number }) {
  const section = sectionBySegment(segment);
  if (!section) notFound();

  const { items, total, pageSize } = await listByType(section.type, page);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-primary)]">
        Reference
      </p>
      <h1 className="mt-1 font-serif text-3xl font-semibold text-gray-900">{section.label}</h1>
      <p className="mt-2 max-w-2xl text-gray-600">{section.blurb}</p>
      <p className="mt-1 text-sm text-gray-500">{total} entries</p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <li key={it.id}>
            <Link
              href={`/${segment}/${it.slug}`}
              className="block h-full rounded-lg border border-gray-200 p-4 transition hover:border-[var(--color-primary)] hover:shadow-sm"
            >
              <h2 className="font-serif text-lg font-semibold text-gray-900">{it.title}</h2>
            </Link>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-4 text-sm">
          {page > 1 && (
            <Link className="rounded border border-gray-300 px-3 py-1.5 hover:border-[var(--color-primary)]" href={`/${segment}?page=${page - 1}`}>
              ← Previous
            </Link>
          )}
          <span className="text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link className="rounded border border-gray-300 px-3 py-1.5 hover:border-[var(--color-primary)]" href={`/${segment}?page=${page + 1}`}>
              Next →
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
