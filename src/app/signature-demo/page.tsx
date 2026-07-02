// TEMPORARY visual preview of the graded Microbiome Signature modal (Surface B).
// Renders the endometriosis dry-run data with the evidence sidebar open. Not linked in nav.
import { MicrobiomeSignature } from "@/components/MicrobiomeSignature";
import demo from "@/data/endo-signature-demo.json";

export const metadata = { title: "Signature grade demo" };

type Sig = {
  levels: Record<string, { name: string; value: number; has_info?: boolean; tier?: string; direction?: string; agreementBin?: string; domain?: string }[]>;
  studies: { title: string; url: string }[];
  evidence?: Record<string, unknown>;
};

export default function Page() {
  const s = (demo as { signature: Sig }).signature;
  return (
    <div className="site-content">
      <main className="main" style={{ padding: "2rem" }}>
        <p style={{ color: "#6b7280" }}>Graded signature modal — endometriosis (preview).</p>
        <MicrobiomeSignature
          slug="endometriosis"
          title="Endometriosis"
          levels={s.levels}
          studies={s.studies}
          evidence={s.evidence as never}
          defaultOpen
        />
      </main>
    </div>
  );
}
