import type { Metadata } from "next";
import { AuthorView, authorMetadata } from "@/components/AuthorView";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return authorMetadata(slug);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <AuthorView slug={slug} />;
}
