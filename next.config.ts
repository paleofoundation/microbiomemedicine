import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The original WordPress search URL was /?s=term — serve our search page there.
  async rewrites() {
    return [{ source: "/", has: [{ type: "query", key: "s" }], destination: "/search" }];
  },
};

export default nextConfig;
