import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const nextConfig: NextConfig = {
  // Static export → emits an `out/` folder of HTML/CSS/JS for S3 + CloudFront.
  output: "export",
  // Each route becomes a folder with index.html (e.g. /login/index.html), which
  // S3 static-website hosting / a CloudFront rewrite can serve directly.
  trailingSlash: true,
  // No Next image server in a static export.
  images: { unoptimized: true },
  // Pin the workspace root so the stray parent lockfile doesn't confuse Turbopack.
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  // NOTE: custom headers() / redirects() are unsupported by `output: export`.
  // The service-worker cache-control header is configured on CloudFront/S3 instead.
};

export default nextConfig;
