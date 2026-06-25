import { getRootBySlug } from "@/lib/content";

export const revalidate = 3600;

export default async function Home() {
  // The original WordPress front page (wp_link "/").
  const home = await getRootBySlug("microbiome-signatures-home-new");

  return (
    <div className="site-content flex">
      <main className="main">
        <div
          className="entry-content"
          dangerouslySetInnerHTML={{ __html: home?.content_html || "" }}
        />
      </main>
    </div>
  );
}
