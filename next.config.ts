import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/hn-reels",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;