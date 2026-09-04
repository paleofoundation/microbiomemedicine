import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/login",
          "/auth/",
          "/search",
          "/research-feed-demo",
          "/signature-demo",
          "/taxon-demo",
          "/taxa",
          "/checkout",
          "/membership",
          "/membership-2",
          "/tables-test",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
