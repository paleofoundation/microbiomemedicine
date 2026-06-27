// Page Snapshot box — canonical ".snapshot" markup, identical to the endometriosis gold
// standard: a titled box with References (jumps to the references section) and Identified
// MMAs (opens the signature modal), plus an (i) tooltip explaining MBTI/MMA validation.
// The hover tooltip is wired by <Tooltips/> (mounted by the page) like every rgbc-tooltip,
// so there is no question-mark cursor and it matches the verbatim pages exactly.
const MBTI_DEF =
  " are validated using a dual-evidence logical framework. First, the intervention must realign the condition’s microbiome signature by increasing beneficial taxa that are consistently depleted and reducing pathogenic taxa that are consistently enriched. Second, the intervention must demonstrate measurable clinical benefit. Concordance of these effects in the same context validates the intervention as an MBTI and supports the clinical relevance of the microbiome signature.";

export function PageSnapshot({ refs, mmas }: { refs: number; mmas: number | null }) {
  return (
    <div className="snapshot">
      <header className="snapshot__header">
        <h4 className="snapshot__title">Page Snapshot</h4>
        <span className="research-hero__right-meta-tooltip rgbc-tooltip" data-options="position:left" title=".snapshot__tooltip">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.3 11.3h0a.8.8 0 0 1 1 .8l-.7 2.8a.8.8 0 0 0 1.1.9h0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9-3.8h0v0h0v0z" />
          </svg>
        </span>
        <div className="tooltip snapshot__tooltip">
          <div className="tooltip__content">
            <p>
              <a href="/definition/microbiome-targeted-interventions-mbtis/">Microbiome-targeted interventions (MBTIs)</a>
              {MBTI_DEF}
            </p>
          </div>
        </div>
      </header>
      <div className="snapshot__content">
        <ul className="snapshot__list">
          {refs > 0 && (
            <li className="snapshot__list-item">
              <a className="snapshot__link" href="#h-references">
                <span className="js-count-references">{refs}</span> References
              </a>
            </li>
          )}
          {mmas ? (
            <li className="snapshot__list-item js-show-mmas" data-status="reset" data-modal-id="research-diagram-modal">
              <span className="js-count-mmas">{mmas}</span> Identified MMAs
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
