import { HOME_HTML } from "@/theme/homeMain";

export const revalidate = 3600;

// Original WordPress homepage markup, with old-host URLs made relative.
const html = HOME_HTML.replace(/https?:\/\/(www\.)?microbiomemedicine\.com/g, "");

export default function Home() {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
