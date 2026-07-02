import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

// The page that the ImageObject `license` + `acquireLicensePage` fields point at (see
// IMAGE_LICENSE_URL in src/lib/seo.ts). It states that every image on the site is our own
// original work and how to license one — this is what Google resolves those two URL fields to.
export const metadata: Metadata = {
  title: "Image License & Usage",
  description: `All images, illustrations, diagrams, and charts on ${SITE_NAME} are original works we created and own. Terms of use and how to license them.`,
  alternates: { canonical: "/image-license" },
};

export default function ImageLicensePage() {
  return (
    <div className="site-content flex">
      <main className="main">
        <div className="rgbc-hero">
          <div className="rgbc-hero__wrapper wrapper">
            <div className="rgbc-hero__center rgbc-hero__center--page">
              <nav className="breadcrumb">
                <ol className="breadcrumb__wrapper">
                  <li className="breadcrumb__item">
                    <Link className="breadcrumb__link" href="/">Home</Link>
                  </li>
                  <li className="breadcrumb__item">
                    <span className="breadcrumb_last"><span className="badge">Image License</span></span>
                  </li>
                </ol>
              </nav>
              <div className="rgbc-hero__content">
                <h1 className="rgbc-hero__title">Image License &amp; Usage</h1>
                <p className="rgbc-hero__excerpt">
                  Every image on {SITE_NAME} is our own original work.
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="rgbc-content">
          <div className="rgbc-content__wrapper wrapper">
            <div className="rgbc-content__main">
              <div className="entry-content">
                <p>
                  All images published on {SITE_NAME} (microbiomemedicine.com) &mdash; including
                  photographs, anatomical and AI-assisted renders, microscopy, histology,
                  pathway and mechanism diagrams, microbiome-signature charts, logos, emblems,
                  and caution graphics &mdash; are original works created by or commissioned for{" "}
                  {SITE_NAME}. They are our intellectual property and are protected by copyright.
                  &copy; 2023&ndash;2026 {SITE_NAME}. All rights reserved.
                </p>

                <h2 className="wp-block-heading">Ownership and copyright</h2>
                <p>
                  We hold the copyright to every image on this site. None of them are stock
                  imagery, and none are used under a third-party license. When one of our images
                  is reproduced, the copyright holder is {SITE_NAME} and the required credit line
                  is &ldquo;{SITE_NAME}&rdquo;.
                </p>

                <h2 className="wp-block-heading">Permitted use</h2>
                <p>
                  You may view our images as part of the pages on which they appear. Beyond
                  ordinary personal viewing and browser caching, our images may not be copied,
                  downloaded, redistributed, modified, embedded on other sites, or used to train
                  machine-learning models without a written license from us. Reproducing an image
                  &mdash; in a publication, presentation, product, or another website &mdash;
                  requires our prior permission.
                </p>

                <h2 className="wp-block-heading">Requesting a license</h2>
                <p>
                  We license our images for editorial, academic, and commercial use on a
                  case-by-case basis. To request permission or purchase a license, please{" "}
                  <Link href="/contact/">contact us</Link> with the specific image, the pages it
                  appears on, and how you intend to use it. We will respond with the applicable
                  terms and attribution requirements.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
