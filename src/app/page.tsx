import type { Metadata } from "next";
import { HOME_HTML } from "@/theme/homeMain";

export const revalidate = 3600;
export const metadata: Metadata = {
  alternates: { canonical: "https://microbiomemedicine.com/" },
};

// Original homepage markup: make old-host URLs relative and point search at /search.
const html = HOME_HTML
  .replace(/https?:\/\/(www\.)?microbiomemedicine\.com/g, "")
  .replace(/action="\/"/g, 'action="/search"')
  .replace(/name="s"/g, 'name="q"');

export default function Home() {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
