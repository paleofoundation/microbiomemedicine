import type { Metadata } from "next";
import { AuthorView, authorMetadata } from "@/components/AuthorView";

export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return authorMetadata(slug);
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page } = await searchParams;
  return <AuthorView slug={slug} page={Number(page) || 1} />;
}
