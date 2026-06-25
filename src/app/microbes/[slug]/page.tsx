import type { Metadata } from "next";
import { ArticleView, articleMetadata } from "@/components/ArticleView";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return articleMetadata("microbes", slug);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <ArticleView segment="microbes" slug={slug} />;
}
