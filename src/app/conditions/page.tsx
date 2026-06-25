import type { Metadata } from "next";
import { ArchiveView } from "@/components/ArchiveView";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Conditions" };

type Props = { searchParams: Promise<{ page?: string }> };

export default async function Page({ searchParams }: Props) {
  const { page } = await searchParams;
  return <ArchiveView segment="conditions" page={Number(page) || 1} />;
}
