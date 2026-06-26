import { Highlights } from "@/components/Highlights";
import type { Connection } from "@/lib/connections";

// Shared right rail: collapse arrow, Connections, Send feedback, Show-highlights toggle, Join the Roundtable.
export function RightRail({ connections = [] }: { connections?: Connection[] }) {
  return (
    <div className="research-content__right js-research-sidebar">
      <div className="research-content__left-menu">
        <button type="button" className="research-content__left-btn js-research-btn" aria-label="Toggle sidebar">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 9 9" width="14" height="14">
            <path fill="#6C757D" fillRule="evenodd" d="M0 4.5a.6.6 0 0 0 .6.6H7L4.7 7.5a.6.6 0 1 0 .8.8l3.3-3.4a.6.6 0 0 0 0-.8L5.5.7a.6.6 0 0 0-.8.8L7 4H.6a.6.6 0 0 0-.6.6Z" clipRule="evenodd" />
          </svg>
        </button>
        {connections.length > 0 && (
          <div className="research-content__connections">
            <span className="research-content__connections-title">Connections</span>
            <ul className="research-content__connections-list">
              {connections.map((c, i) => (
                <li key={i}><a href={c.href}>{c.label}</a></li>
              ))}
            </ul>
          </div>
        )}
        <div className="research-content__right-actions">
          <button type="button" className="btn btn--full btn--outline js-feedback">Send feedback</button>
          <Highlights />
          <div className="research-content__right-banner">
            <strong>Join the Roundtable</strong>
            <p className="p1">
              Contribute to published consensus reports, connect with top clinicians and researchers, and receive
              exclusive invitations to roundtable conferences.
            </p>
            <div className="research-content__right-banner-note">
              <p>Yes, I want to <a href="/auth/signup/">help shape the future of microbiome medicine.</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
