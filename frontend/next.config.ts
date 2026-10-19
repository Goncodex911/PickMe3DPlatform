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

  /**
   * Security headers:
   * - All routes: prevent iframe embedding (X-Frame-Options + CSP frame-ancestors 'self')
   * - /embed/* routes: ALLOW embedding from any origin (remove X-Frame-Options,
   *   set CSP frame-ancestors *)
   *
   * NOTE: In static export mode (output: "export") Next.js headers() config is only
   * applied during `next dev` / `next start` (not the static .html output).
   * For production static deployments, configure these headers at the CDN/server level.
   */
  async headers() {
    return [
      {
        // Default: block all iframe embedding for non-embed routes
        source: "/((?!embed).*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'",
          },
        ],
      },
      {
        // Embed routes: allow embedding from any origin (including local file:// testing)
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors * 'self' file: null http: https:",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
