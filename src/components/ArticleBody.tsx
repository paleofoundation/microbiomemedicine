import { formatInlineCitations } from "@/lib/inlineCitations";

// Renders migrated WordPress article HTML inside the branded article typography.
export function ArticleBody({ html }: { html: string | null }) {
  return (
    <div
      className="article"
      dangerouslySetInnerHTML={{ __html: formatInlineCitations(html || "") }}
    />
  );
}
