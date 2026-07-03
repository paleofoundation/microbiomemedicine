import type { Metadata } from "next";
import { TaxaIndexView, type TaxonRow } from "@/components/TaxaIndexView";
import taxaIndex from "@/data/taxa-index.json";

export const metadata: Metadata = {
  title: "All Taxa Index",
  description: "Every microbial taxon observed across Microbiome Medicine signature studies, with evidence grade, domain, and the conditions it appears in.",
};

type RawTaxon = TaxonRow & { conditions?: unknown };

export default function Page() {
  const { taxa: allTaxa, summary } = taxaIndex as { taxa: RawTaxon[]; summary: { nTaxa: number; nConditions: number; nUncurated: number; byDomain: Record<string, number> } };
  // Ship only the light fields the index table needs; per-condition detail lives on /taxa/[slug].
  const taxa: TaxonRow[] = allTaxa.map(({ name, slug, level, domain, nConditions, dirPattern, bestTier, curationState }) => ({ name, slug, level, domain, nConditions, dirPattern, bestTier, curationState }));
  return (
    <div className="site-content">
      <main className="main">
        <div className="rgbc-hero">
          <div className="rgbc-hero__wrapper">
            <div className="rgbc-hero__center">
              <div className="rgbc-hero__content">
                <p className="rgbc-breadcrumbs"><a href="/">Home</a> <span>All Taxa</span></p>
                <h1>All Taxa Index</h1>
                <div className="rgbc-hero__excerpt">
                  <p>
                    Every taxon observed across our microbiome-signature studies — not only the taxa curated onto a
                    condition&apos;s chart. Each row carries its resolved domain, its best evidence grade, and the conditions
                    it appears in. The <em>In signatures, not curated</em> filter is a standing quality-control worklist: it
                    surfaces taxa that are present in the underlying data but not yet shown on any condition page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <section className="rgbc-content">
          <div className="rgbc-content__wrapper">
            <div className="rgbc-content__main">
              <p style={{ color: "#6b7280", fontSize: ".88rem", marginBottom: "1rem" }}>
                {summary.nTaxa} taxa across {summary.nConditions} conditions ·{" "}
                {Object.entries(summary.byDomain).map(([d, n], i) => `${i ? " · " : ""}${d} ${n}`)} ·{" "}
                {summary.nUncurated} awaiting curation.
              </p>
              <TaxaIndexView taxa={taxa} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
