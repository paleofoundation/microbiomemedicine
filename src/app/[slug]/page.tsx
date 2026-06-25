import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRootBySlug } from "@/lib/content";
import { ArticleBody } from "@/components/ArticleBody";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getRootBySlug(slug);
  if (!item) return {};
  return {
    title: item.seo_title || item.title,
    description: item.seo_description || undefined,
  };
}

export default async function RootContentPage({ params }: Props) {
  const { slug } = await params;
  const item = await getRootBySlug(slug);
  if (!item) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-3xl font-semibold leading-tight text-gray-900">
        {item.title}
      </h1>
      <hr className="my-6 border-gray-200" />
      <ArticleBody html={item.content_html} />
    </main>
  );
}
