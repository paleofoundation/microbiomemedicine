import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import taxaIndex from "@/data/taxa-index.json";

type FullTaxon = {
  name: string; slug: string; level: string; domain: string;
  nConditions: number; bestTier: string;
  conditions: { slug: string; title: string; direction: string; tier: string | null; curated: boolean }[];
};

export const revalidate = 3600;
const TAXA = (taxaIndex as { taxa: FullTaxon[] }).taxa;
const bySlug = (slug: string) => TAXA.find((t) => t.slug === slug);

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = bySlug(slug);
  if (!t) return { title: "Taxon" };
  return { title: `${t.name} — Taxa Index`, description: `${t.name} (${t.domain}) across ${t.nConditions} Microbiome Medicine condition signature(s).` };
}

const dirLabel = (d: string) => (d === "increased" ? "Increased ↑" : d === "decreased" ? "Decreased ↓" : "Mixed ↕");

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const t = bySlug(slug);
  if (!t) notFound();

  const blindKingdomNote =
    t.domain === "Fungi"
      ? "Fungi are invisible to 16S rRNA sequencing (a bacterial/archaeal marker gene). This taxon is only observed where a fungal-aware method (ITS/18S/shotgun) was used, so its absence from a 16S-only condition means it was not measured — not that it is absent."
      : null;

  return (
    <div className="site-content">
      <main className="main">
        <div className="rgbc-hero">
          <div className="rgbc-hero__wrapper">
            <div className="rgbc-hero__center">
              <div className="rgbc-hero__content">
                <p className="rgbc-breadcrumbs">
                  <a href="/">Home</a> <Link href="/taxa">All Taxa</Link> <span>{t.name}</span>
                </p>
                <h1 style={{ fontStyle: "italic" }}>{t.name}</h1>
                <div className="rgbc-hero__excerpt">
                  <p>
                    {t.domain !== "Unknown" ? <><strong>{t.domain}</strong> · </> : null}
                    {t.level} · observed in {t.nConditions} condition signature{t.nConditions === 1 ? "" : "s"} ·
                    best evidence grade <strong>{t.bestTier}</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="rgbc-content">
          <div className="rgbc-content__wrapper">
            <div className="rgbc-content__main">
              {blindKingdomNote && (
                <p style={{ background: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: 8, padding: ".8rem 1rem", fontSize: ".88rem", color: "#9d174d", marginBottom: "1.25rem" }}>
                  <strong>Detection note.</strong> {blindKingdomNote}
                </p>
              )}

              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.2rem", marginBottom: ".6rem" }}>Where this taxon appears</h2>
              <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".9rem", minWidth: 520 }}>
                  <thead>
                    <tr style={{ textAlign: "left", background: "#fafafa" }}>
                      {["Condition", "Direction", "Evidence grade", "On chart"].map((h) => (
                        <th key={h} style={{ padding: ".55rem .7rem", borderBottom: "1px solid #e5e7eb", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.conditions.map((c) => (
                      <tr key={c.slug} style={{ borderBottom: "1px solid #f1f2f4" }}>
                        <td style={{ padding: ".5rem .7rem" }}>
                          <Link href={`/conditions/${c.slug}/`} style={{ color: "#cc3333", textDecoration: "none" }}>{c.title}</Link>
                        </td>
                        <td style={{ padding: ".5rem .7rem" }}>{dirLabel(c.direction)}</td>
                        <td style={{ padding: ".5rem .7rem" }}>{c.tier || "—"}</td>
                        <td style={{ padding: ".5rem .7rem", color: c.curated ? "#166534" : "#b45309" }}>{c.curated ? "yes" : "not yet"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p style={{ color: "#6b7280", fontSize: ".82rem", marginTop: "1rem" }}>
                Evidence grade reflects reproducibility and methodology across our corpus, not the strength of any single study.
                A landmark single study can be strong on its own while this aggregate grade stays low until the finding is replicated.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
