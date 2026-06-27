import { HOME_HTML } from "@/theme/homeMain";
import { HeroSearch } from "@/components/HeroSearch";

export const revalidate = 3600;

// Original homepage markup: make old-host URLs relative and point search at /search.
const html = HOME_HTML
  .replace(/https?:\/\/(www\.)?microbiomemedicine\.com/g, "")
  .replace(/action="\/"/g, 'action="/search"');

export default function Home() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <HeroSearch />
    </>
  );
}
