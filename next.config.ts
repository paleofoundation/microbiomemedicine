import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The original WordPress search URL was /?s=term — serve our search page there.
  // Must be a beforeFiles rewrite, else the filesystem "/" (home) route wins.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", has: [{ type: "query", key: "s" }], destination: "/search" }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
