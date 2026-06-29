import type { Metadata } from "next";
import "./globals.css";
import "@/styles/theme-wp.css";
import { HEADER_HTML, FOOTER_HTML } from "@/theme/themeHtml";
import { Feedback } from "@/components/Feedback";
import { ScrollToTop } from "@/components/ScrollToTop";
import { HeaderSearch } from "@/components/HeaderSearch";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { WaitlistModal } from "@/components/WaitlistModal";
import { AccessGate } from "@/components/AccessGate";

export const metadata: Metadata = {
  metadataBase: new URL("https://microbiomemedicine.com"),
  title: {
    default: "Microbiome Signatures",
    template: "%s — Microbiome Signatures",
  },
  openGraph: { siteName: "Microbiome Signatures", type: "website" },
  twitter: { card: "summary_large_image" },
  description:
    "A research-grounded reference on the human microbiome — microbes, conditions, interventions, and the evidence connecting them.",
};

// Point the header search form at our search route, and the account/membership
// links at the member dashboard.
const headerHtml = HEADER_HTML
  .replace(/action="\/"/g, 'action="/search"')
  .replace(/href="\/auth\/login\/"/g, 'href="/dashboard"')
  .replace(/href="\/membership-2\/"/g, 'href="#join-waitlist" data-open-waitlist="1"')
  .replace(/>Membership<\/a>/g, '>Join the Waitlist</a>');

// Wire the footer newsletter forms to our subscribe endpoint.
const footerHtml = FOOTER_HTML
  .replace(/<form class="subscribe[^"]*js-subscribe-form"/g, '$& action="/api/subscribe" method="post"')
  .replace(/<input type="email" class="subscribe__input"/g, '<input type="email" name="email" class="subscribe__input"');

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Lora:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div dangerouslySetInnerHTML={{ __html: headerHtml }} />
        {children}
        <div dangerouslySetInnerHTML={{ __html: footerHtml }} />
        <Feedback />
        <ScrollToTop />
        <HeaderSearch />
        <SearchAutocomplete />
        <WaitlistModal />
        <AccessGate />
      </body>
    </html>
  );
}
