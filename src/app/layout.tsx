import type { Metadata } from "next";
import "./globals.css";
import "@/styles/theme-wp.css";
import { HEADER_HTML, FOOTER_HTML } from "@/theme/themeHtml";

export const metadata: Metadata = {
  title: {
    default: "Microbiome Signatures",
    template: "%s — Microbiome Signatures",
  },
  description:
    "A research-grounded reference on the human microbiome — microbes, conditions, interventions, and the evidence connecting them.",
};

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
        {/* Original rgbcode theme header (mega-menu + logo) */}
        <div dangerouslySetInnerHTML={{ __html: HEADER_HTML }} />
        {children}
        {/* Original rgbcode theme footer */}
        <div dangerouslySetInnerHTML={{ __html: FOOTER_HTML }} />
      </body>
    </html>
  );
}
