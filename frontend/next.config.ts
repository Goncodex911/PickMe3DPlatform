import type { NextConfig } from "next";

// Set NEXT_PUBLIC_BASE_PATH=/<repo> when deploying to a GitHub Pages project site.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  devIndicators: false,
};

export default nextConfig;
