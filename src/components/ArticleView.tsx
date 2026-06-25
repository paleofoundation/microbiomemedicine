import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sectionBySegment, getItem } from "@/lib/content";
import { ArticleBody } from "@/components/ArticleBody";

export async function ArticleView({ segment, slug }: { segment: string; slug: string }) {
  const section = sectionBySegment(segment);
  if (!section) notFound();

  const item = await getItem(section.type, slug);
  if (!item) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <nav className="text-sm text-gray-500">
        <Link href={`/${segment}`} className="hover:text-[var(--color-primary)]">
          {section.label}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{item.title}</span>
      </nav>

      <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight text-gray-900">
        {item.title}
      </h1>
      <hr className="my-6 border-gray-200" />
      <ArticleBody html={item.content_html} />
    </main>
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
